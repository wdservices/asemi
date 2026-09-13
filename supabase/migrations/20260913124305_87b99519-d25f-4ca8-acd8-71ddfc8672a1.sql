-- 1. Company columns
alter table public.companies
  add column if not exists country_code text not null default 'NG',
  add column if not exists free_codes_used integer not null default 0,
  add column if not exists total_codes_generated integer not null default 0,
  add column if not exists approved_at timestamptz;

alter table public.batches
  add column if not exists amount_charged numeric(14,2) not null default 0,
  add column if not exists currency text not null default 'NGN',
  add column if not exists exported_at timestamptz;

alter table public.codes
  add column if not exists print_count integer not null default 0,
  add column if not exists exported_at timestamptz;

create unique index if not exists codes_code_string_uidx on public.codes(code_string);

-- 2. Wallets
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  credit_balance numeric(14,2) not null default 0,
  lifetime_topup numeric(14,2) not null default 0,
  lifetime_spent numeric(14,2) not null default 0,
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.wallets to authenticated;
grant all on public.wallets to service_role;
alter table public.wallets enable row level security;
drop policy if exists wallets_select on public.wallets;
create policy wallets_select on public.wallets for select to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));

-- 3. Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null default 'purchase',
  reference text,
  amount numeric(14,2) not null default 0,
  codes_applied integer not null default 0,
  currency text not null default 'NGN',
  status text not null default 'paid',
  description text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists invoices_company_idx on public.invoices(company_id, created_at desc);
grant select on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));

-- 4. Protect new company columns from self-service edits
create or replace function public.protect_company_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    new.status := old.status;
    new.admin_note := old.admin_note;
    new.ai_confidence := old.ai_confidence;
    new.ai_flags := old.ai_flags;
    new.subscription_plan := old.subscription_plan;
    new.plan_code_limit := old.plan_code_limit;
    new.owner_id := old.owner_id;
    new.country_code := old.country_code;
    new.free_codes_used := old.free_codes_used;
    new.total_codes_generated := old.total_codes_generated;
    new.approved_at := old.approved_at;
    if old.status = 'needs_info' and new.document_url is distinct from old.document_url then
      new.status := 'pending';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- 5. Wallet bootstrap for existing companies
insert into public.wallets (company_id)
select c.id from public.companies c
where not exists (select 1 from public.wallets w where w.company_id = c.id);

-- 6. Pricing engine
create or replace function public.calculate_price(_company_id uuid, _quantity integer)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c public.companies%rowtype;
  tiers numeric[];
  caps integer[] := array[5000, 20000, 100000, 500000, 1000000];
  cur text;
  free_codes constant integer := 20;
  remaining integer;
  free_used integer;
  paid_so_far integer;
  price numeric := 0;
  pos integer;
  i integer;
  cap integer;
  in_bracket integer;
  breakdown jsonb := '[]'::jsonb;
begin
  select * into c from public.companies where id = _company_id;
  if not found then raise exception 'Company not found'; end if;
  if c.country_code = 'NG' then
    tiers := array[50, 40, 30, 20, 12]; cur := 'NGN';
  else
    tiers := array[0.15, 0.12, 0.10, 0.07, 0.05]; cur := 'USD';
  end if;

  remaining := greatest(_quantity, 0);
  free_used := least(remaining, greatest(free_codes - c.free_codes_used, 0));
  remaining := remaining - free_used;
  paid_so_far := greatest(c.total_codes_generated - c.free_codes_used, 0);

  if paid_so_far + remaining > 1000000 then
    return jsonb_build_object('requires_quote', true, 'currency', cur,
      'free', free_used, 'price', 0, 'breakdown', '[]'::jsonb);
  end if;

  pos := paid_so_far;
  i := 1;
  while i <= array_length(caps, 1) and remaining > 0 loop
    cap := caps[i] - pos;
    if cap > 0 then
      in_bracket := least(remaining, cap);
      price := price + in_bracket * tiers[i];
      breakdown := breakdown || jsonb_build_object('qty', in_bracket, 'rate', tiers[i],
        'subtotal', in_bracket * tiers[i]);
      remaining := remaining - in_bracket;
      pos := pos + in_bracket;
    end if;
    i := i + 1;
  end loop;

  return jsonb_build_object('requires_quote', false, 'currency', cur, 'free', free_used,
    'price', price, 'breakdown', breakdown);
end $$;

-- 7. Paid batch generation
create or replace function public.generate_batch_paid(_product_id uuid, _quantity integer)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  c public.companies%rowtype;
  quote jsonb;
  v_price numeric;
  v_free integer;
  v_cur text;
  v_batch uuid;
  v_number text;
  v_prefix text;
  v_seq integer;
  v_balance numeric;
  inserted integer := 0;
  n integer;
  guard integer := 0;
begin
  if _quantity < 1 or _quantity > 10000 then
    raise exception 'Quantity must be between 1 and 10,000 codes per batch';
  end if;
  select p.company_id into v_company from public.products p where p.id = _product_id;
  if v_company is null then raise exception 'Product not found'; end if;
  select * into c from public.companies where id = v_company;
  if c.owner_id <> auth.uid() and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not your company';
  end if;
  if c.status <> 'approved' then raise exception 'Your company is not approved yet'; end if;

  quote := public.calculate_price(v_company, _quantity);
  if (quote->>'requires_quote')::boolean then
    raise exception 'This volume requires a custom quote. Please contact sales.';
  end if;
  v_price := (quote->>'price')::numeric;
  v_free := (quote->>'free')::integer;
  v_cur := quote->>'currency';

  insert into public.wallets (company_id, currency) values (v_company, v_cur)
    on conflict (company_id) do nothing;
  select credit_balance into v_balance from public.wallets where company_id = v_company for update;
  if v_balance < v_price then
    raise exception 'Insufficient wallet balance. Top up % more to continue.', v_price - v_balance;
  end if;

  select count(*) + 1 into v_seq from public.batches where company_id = v_company;
  v_prefix := upper(regexp_replace(left(c.name, 2), '[^A-Za-z]', 'X', 'g'));
  v_number := v_prefix || '-' || to_char(now(), 'YYMM') || '-' || lpad(v_seq::text, 3, '0');

  insert into public.batches (product_id, company_id, batch_number, quantity, status, amount_charged, currency)
  values (_product_id, v_company, v_number, _quantity, 'ready', v_price, v_cur)
  returning id into v_batch;

  while inserted < _quantity and guard < 200 loop
    insert into public.codes (batch_id, product_id, company_id, code_string)
    select v_batch, _product_id, v_company, public.random_code()
    from generate_series(1, _quantity - inserted)
    on conflict (code_string) do nothing;
    get diagnostics n = row_count;
    inserted := inserted + n;
    guard := guard + 1;
  end loop;
  if inserted < _quantity then raise exception 'Code generation failed, please retry'; end if;

  update public.wallets set
    credit_balance = credit_balance - v_price,
    lifetime_spent = lifetime_spent + v_price,
    updated_at = now()
  where company_id = v_company;

  update public.companies set
    total_codes_generated = total_codes_generated + _quantity,
    free_codes_used = free_codes_used + v_free
  where id = v_company;

  insert into public.invoices (company_id, kind, reference, amount, codes_applied, currency, status, description)
  values (v_company, 'purchase', v_number, v_price, _quantity, v_cur, 'paid',
    _quantity || ' verification codes (' || v_number || ')');

  return v_number;
end $$;

-- 8. Wallet top-up (admin only)
create or replace function public.topup_wallet(_company_id uuid, _amount numeric, _reference text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_cur text;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _amount <= 0 then raise exception 'Amount must be positive'; end if;
  select case when country_code = 'NG' then 'NGN' else 'USD' end into v_cur
    from public.companies where id = _company_id;
  if v_cur is null then raise exception 'Company not found'; end if;
  insert into public.wallets (company_id, currency) values (_company_id, v_cur)
    on conflict (company_id) do nothing;
  update public.wallets set
    credit_balance = credit_balance + _amount,
    lifetime_topup = lifetime_topup + _amount,
    updated_at = now()
  where company_id = _company_id;
  insert into public.invoices (company_id, kind, reference, amount, currency, status, description)
  values (_company_id, 'topup', _reference, _amount, v_cur, 'paid', 'Wallet top-up');
end $$;

-- 9. Export tracking
create or replace function public.mark_codes_exported(_batch_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid;
begin
  select company_id into v_company from public.batches where id = _batch_id;
  if v_company is null then raise exception 'Batch not found'; end if;
  if not (public.owns_company(v_company) or public.has_role(auth.uid(), 'admin')) then
    raise exception 'Forbidden';
  end if;
  update public.codes set print_count = print_count + 1, exported_at = now() where batch_id = _batch_id;
  update public.batches set exported_at = now() where id = _batch_id;
end $$;

-- 10. Admin company review actions
create or replace function public.admin_approve_company(_company_id uuid, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.companies set status = 'approved', admin_note = _note, approved_at = now()
    where id = _company_id;
  insert into public.wallets (company_id) values (_company_id) on conflict (company_id) do nothing;
end $$;

create or replace function public.admin_reject_company(_company_id uuid, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.companies set status = 'rejected', admin_note = _note where id = _company_id;
end $$;

create or replace function public.admin_request_info(_company_id uuid, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.companies set status = 'needs_info', admin_note = _note where id = _company_id;
end $$;

create or replace function public.admin_review_report(_report_id uuid, _reviewed boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.reports set reviewed = _reviewed where id = _report_id;
end $$;

revoke execute on function public.calculate_price(uuid, integer) from public, anon;
revoke execute on function public.generate_batch_paid(uuid, integer) from public, anon;
revoke execute on function public.topup_wallet(uuid, numeric, text) from public, anon;
revoke execute on function public.mark_codes_exported(uuid) from public, anon;
revoke execute on function public.admin_approve_company(uuid, text) from public, anon;
revoke execute on function public.admin_reject_company(uuid, text) from public, anon;
revoke execute on function public.admin_request_info(uuid, text) from public, anon;
revoke execute on function public.admin_review_report(uuid, boolean) from public, anon;
grant execute on function public.calculate_price(uuid, integer) to authenticated;
grant execute on function public.generate_batch_paid(uuid, integer) to authenticated;
grant execute on function public.topup_wallet(uuid, numeric, text) to authenticated;
grant execute on function public.mark_codes_exported(uuid) to authenticated;
grant execute on function public.admin_approve_company(uuid, text) to authenticated;
grant execute on function public.admin_reject_company(uuid, text) to authenticated;
grant execute on function public.admin_request_info(uuid, text) to authenticated;
grant execute on function public.admin_review_report(uuid, boolean) to authenticated;