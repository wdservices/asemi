-- ============ COLUMN ADDITIONS ============

-- companies: add total_codes_generated, free_codes_used, wallet_balance
alter table public.companies
  add column if not exists total_codes_generated integer not null default 0,
  add column if not exists free_codes_used integer not null default 0,
  add column if not exists wallet_balance integer not null default 0;

-- batches: add amount_charged (from the spec data entity)
alter table public.batches
  add column if not exists amount_charged integer not null default 0;

-- codes: add print_count, exported_at (from spec data entity)
alter table public.codes
  add column if not exists print_count integer not null default 0,
  add column if not exists exported_at timestamptz;

-- ============ WALLET TABLE ============
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade unique,
  credit_balance integer not null default 0,
  lifetime_topup integer not null default 0,
  lifetime_spent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.wallets to authenticated;
grant all on public.wallets to service_role;
alter table public.wallets enable row level security;
create policy "wallets_select" on public.wallets for select to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));
create policy "wallets_update" on public.wallets for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- auto-create wallet when company created
create or replace function public.handle_company_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallets (company_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists company_wallet_created on public.companies;
create trigger company_wallet_created after insert on public.companies
for each row execute function public.handle_company_wallet();

-- ============ INVOICES TABLE ============
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null default 'topup',
  reference text,
  amount integer not null,
  codes_applied integer not null default 0,
  currency text not null default 'NGN',
  status text not null default 'paid',
  description text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index invoices_company_idx on public.invoices(company_id);
grant select on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "invoices_select" on public.invoices for select to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));

-- ============ PRICING CALCULATION RPC ============
-- Progressive bracket pricing per Section 5 of the spec
create or replace function public.calculate_price(
  _company_id uuid,
  _quantity integer
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_total_gen integer;
  v_free_remain integer;
  v_used_free integer;
  v_remaining integer;
  v_position integer;
  v_price integer := 0;
  v_tier record;
  v_bracket_cap integer;
  v_in_tier integer;
  v_breakdown jsonb := '[]'::jsonb;
  v_tiers jsonb;
  i int;
begin
  if not (public.owns_company(_company_id) or public.has_role(auth.uid(), 'admin')) then
    raise exception 'Forbidden';
  end if;
  if _quantity < 1 then raise exception 'Quantity must be positive'; end if;

  select coalesce(total_codes_generated, 0),
         greatest(0, 20 - coalesce(free_codes_used, 0))
    into v_total_gen, v_free_remain
    from public.companies where id = _company_id;

  v_used_free := least(_quantity, v_free_remain);
  v_remaining := _quantity - v_used_free;
  v_position := v_total_gen + v_used_free;

  if v_used_free > 0 then
    v_breakdown := v_breakdown || jsonb_build_array(
      jsonb_build_object('label', 'Free codes applied', 'qty', v_used_free, 'rate', 0, 'subtotal', 0)
    );
  end if;

  v_tiers := jsonb_build_array(
    jsonb_build_object('upTo', 5000, 'rate', 150),
    jsonb_build_object('upTo', 20000, 'rate', 120),
    jsonb_build_object('upTo', 2147483647, 'rate', 100)
  );

  for i in 0 .. jsonb_array_length(v_tiers) - 1 loop
    v_tier := v_tiers->i;
    if v_remaining <= 0 then exit; end if;
    v_bracket_cap := (v_tier->>'upTo')::int - v_position;
    if v_bracket_cap <= 0 then continue; end if;
    v_in_tier := least(v_remaining, v_bracket_cap);
    v_price := v_price + v_in_tier * (v_tier->>'rate')::int;
    v_breakdown := v_breakdown || jsonb_build_array(
      jsonb_build_object(
        'label', format('%s codes', to_char(v_in_tier, 'FM999G999G999')),
        'qty', v_in_tier,
        'rate', (v_tier->>'rate')::int,
        'subtotal', v_in_tier * (v_tier->>'rate')::int
      )
    );
    v_remaining := v_remaining - v_in_tier;
    v_position := v_position + v_in_tier;
  end loop;

  return jsonb_build_object(
    'totalPrice', v_price,
    'freeCodesUsed', v_used_free,
    'freeCodesRemaining', v_free_remain - v_used_free,
    'totalCodesAfter', v_position,
    'breakdown', v_breakdown
  );
end $$;
grant execute on function public.calculate_price(uuid, integer) to authenticated;

-- ============ GENERATE PAID BATCH (uses wallet) ============
create or replace function public.generate_batch_paid(
  _product_id uuid,
  _quantity integer
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_price jsonb;
  v_total integer;
  v_used_free integer;
  v_amount integer;
  v_balance integer;
  v_batch uuid;
  v_limit int;
  v_used int;
  v_prefix text;
  v_seq int;
  i int := 0;
  attempts int := 0;
begin
  if _quantity < 1 or _quantity > 100000 then
    raise exception 'Quantity must be between 1 and 100,000';
  end if;
  select p.company_id into v_company from public.products p where p.id = _product_id;
  if v_company is null then raise exception 'Product not found'; end if;
  if not exists (
    select 1 from public.companies c
    where c.id = v_company and c.owner_id = auth.uid() and c.status = 'approved'
  ) then raise exception 'Company not approved or not owned by you'; end if;

  v_price := public.calculate_price(v_company, _quantity);
  v_amount := (v_price->>'totalPrice')::int;
  v_used_free := (v_price->>'freeCodesUsed')::int;

  select coalesce(w.credit_balance, 0) into v_balance
    from public.wallets w where w.company_id = v_company;

  if v_balance < v_amount then
    raise exception 'Insufficient wallet balance. Top up ₦% more.', v_amount - v_balance;
  end if;

  select plan_code_limit into v_limit from public.companies where id = v_company;
  select coalesce(sum(quantity),0) into v_used from public.batches
    where company_id = v_company and created_at >= date_trunc('month', now());
  -- (plan limit is advisory; wallet payment is the real gate. cap 100k/batch above.)

  select count(*) + 1 into v_seq from public.batches where company_id = v_company;
  v_prefix := upper(regexp_replace(left((select name from public.companies where id = v_company), 2), '[^A-Za-z]', 'X', 'g'));

  insert into public.batches (product_id, company_id, batch_number, quantity, status, amount_charged)
    values (_product_id, v_company,
            v_prefix || '-' || to_char(now(), 'YYMM') || '-' || lpad(v_seq::text, 3, '0'),
            _quantity, 'ready', v_amount)
    returning id into v_batch;

  while i < _quantity loop
    begin
      insert into public.codes (batch_id, product_id, company_id, code_string)
      values (v_batch, _product_id, v_company, public.random_code());
      i := i + 1;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 1000 then raise exception 'Code generation failed'; end if;
    end;
  end loop;

  update public.companies
    set total_codes_generated = total_codes_generated + _quantity,
        free_codes_used = free_codes_used + v_used_free
    where id = v_company;

  update public.wallets
    set credit_balance = credit_balance - v_amount,
        lifetime_spent = lifetime_spent + v_amount,
        updated_at = now()
    where company_id = v_company;

  insert into public.invoices (company_id, kind, reference, amount, codes_applied, description)
    values (v_company, 'batch_generation', 'BATCH-' || v_batch::text, v_amount,
            _quantity,
            format('Batch of %s codes for product %s', _quantity, (select name from public.products where id = _product_id)));

  return jsonb_build_object('batch_id', v_batch, 'price', v_price);
end $$;
grant execute on function public.generate_batch_paid(uuid, integer) to authenticated;

-- ============ WALLET TOPUP (admin/service callable) ============
create or replace function public.topup_wallet(
  _company_id uuid,
  _amount integer,
  _reference text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden';
  end if;
  if _amount <= 0 then raise exception 'Amount must be positive'; end if;
  update public.wallets
    set credit_balance = credit_balance + _amount,
        lifetime_topup = lifetime_topup + _amount,
        updated_at = now()
    where company_id = _company_id;
  update public.companies
    set wallet_balance = wallet_balance + _amount
    where id = _company_id;
  insert into public.invoices (company_id, kind, reference, amount, description)
    values (_company_id, 'topup', _reference, _amount, 'Wallet top-up');
end $$;
grant execute on function public.topup_wallet(uuid, integer, text) to authenticated;

-- ============ APPROVE / REJECT / REQUEST INFO (ADMIN) ============
create or replace function public.admin_approve_company(
  _company_id uuid,
  _note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_wallet uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.companies
    set status = 'approved', admin_note = _note
    where id = _company_id;

  -- Credit 20 free codes on FIRST approval only: set wallet, generate free codes into a virtual free allocation.
  -- Spec says "On approval, 20 free codes are automatically credited to the company's account."
  -- We credit the wallet with ₦0 and fund via free_codes_used thresholding handled by calculate_price.
  -- Guarantee a wallet row exists:
  insert into public.wallets (company_id, credit_balance)
    values (_company_id, 0) on conflict (company_id) do nothing;
end $$;
grant execute on function public.admin_approve_company(uuid, text) to authenticated;

create or replace function public.admin_reject_company(
  _company_id uuid,
  _note text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.companies
    set status = 'rejected', admin_note = _note
    where id = _company_id;
end $$;
grant execute on function public.admin_reject_company(uuid, text) to authenticated;

create or replace function public.admin_request_info(
  _company_id uuid,
  _note text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.companies
    set status = 'needs_info', admin_note = _note
    where id = _company_id;
end $$;
grant execute on function public.admin_request_info(uuid, text) to authenticated;

-- ============ CODE EXPORT PRINT TRACKING ============
create or replace function public.mark_codes_exported(
  _batch_id uuid
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
begin
  select company_id into v_company from public.batches where id = _batch_id;
  if not (public.owns_company(v_company) or public.has_role(auth.uid(), 'admin')) then
    raise exception 'Forbidden';
  end if;
  update public.codes
    set exported_at = coalesce(exported_at, now()),
        print_count = print_count + 1
    where batch_id = _batch_id;
end $$;
grant execute on function public.mark_codes_exported(uuid) to authenticated;

-- ============ ADMIN REVIEW REPORT ============
create or replace function public.admin_review_report(
  _report_id uuid,
  _reviewed boolean default true
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.reports set reviewed = _reviewed where id = _report_id;
end $$;
grant execute on function public.admin_review_report(uuid, boolean) to authenticated;

-- ============ STORAGE BUCKETS (idempotent via SQL) ============
-- Note: bucket creation requires service role typically; if these fail,
-- admins can create them manually in the Supabase dashboard:
--   "company-docs" (private) and "product-images" (public)
insert into storage.buckets (id, name, public, file_size_limit)
  values ('company-docs', 'company-docs', false, 10485760)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit)
  values ('product-images', 'product-images', true, 5242880)
  on conflict (id) do nothing;

-- sync wallet_balance denormalized on companies on wallet change
create or replace function public.sync_company_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.companies
    set wallet_balance = new.credit_balance
    where id = new.company_id;
  return new;
end $$;
drop trigger if exists wallets_sync_company on public.wallets;
create trigger wallets_sync_company after insert or update on public.wallets
for each row execute function public.sync_company_wallet();

-- ============ PERMISSION CLEANUPS ============
revoke execute on function public.calculate_price(uuid, integer) from public, anon;
revoke execute on function public.generate_batch_paid(uuid, integer) from public, anon;
revoke execute on function public.topup_wallet(uuid, integer, text) from public, anon;
revoke execute on function public.admin_approve_company(uuid, text) from public, anon;
revoke execute on function public.admin_reject_company(uuid, text) from public, anon;
revoke execute on function public.admin_request_info(uuid, text) from public, anon;
revoke execute on function public.mark_codes_exported(uuid) from public, anon;
revoke execute on function public.admin_review_report(uuid, boolean) from public, anon;
revoke execute on function public.handle_company_wallet() from public, anon, authenticated;
revoke execute on function public.sync_company_wallet() from public, anon, authenticated;
