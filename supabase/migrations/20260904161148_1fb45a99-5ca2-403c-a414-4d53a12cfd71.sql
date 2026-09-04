-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'company');
create type public.company_status as enum ('pending', 'approved', 'needs_info', 'rejected');
create type public.review_status as enum ('none', 'open', 'reviewed', 'escalated');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- new user trigger: profile + company role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'company') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ COMPANIES ============
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  registration_number text not null,
  address text not null,
  phone text not null,
  email text not null,
  category text not null,
  logo_url text,
  document_url text,
  status public.company_status not null default 'pending',
  admin_note text,
  ai_confidence integer,
  ai_flags jsonb not null default '[]'::jsonb,
  subscription_plan text not null default 'Starter',
  plan_code_limit integer not null default 5000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);
grant select, insert, update on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;

create or replace function public.owns_company(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies where id = _company_id and owner_id = auth.uid())
$$;
grant execute on function public.owns_company(uuid) to authenticated;

create or replace function public.company_is_approved(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies where id = _company_id and status = 'approved')
$$;
grant execute on function public.company_is_approved(uuid) to authenticated;

create policy "companies_select" on public.companies for select to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "companies_insert_own" on public.companies for insert to authenticated
  with check (owner_id = auth.uid());
create policy "companies_update" on public.companies for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- company owners cannot self-approve: lock sensitive columns
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
    -- resubmission after needs_info goes back to pending
    if old.status = 'needs_info' and new.document_url is distinct from old.document_url then
      new.status := 'pending';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger companies_protect before update on public.companies
for each row execute function public.protect_company_columns();

-- ============ PRODUCTS ============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text not null,
  description text not null default '',
  images text[] not null default '{}',
  specs jsonb not null default '{}'::jsonb,
  sku text,
  created_at timestamptz not null default now()
);
create index products_company_idx on public.products(company_id);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products_select" on public.products for select to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));
create policy "products_insert" on public.products for insert to authenticated
  with check (public.owns_company(company_id) and public.company_is_approved(company_id));
create policy "products_update" on public.products for update to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));
create policy "products_delete" on public.products for delete to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));

-- ============ BATCHES ============
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  batch_number text not null,
  quantity integer not null,
  status text not null default 'ready',
  created_at timestamptz not null default now()
);
create index batches_product_idx on public.batches(product_id);
create index batches_company_idx on public.batches(company_id);
grant select on public.batches to authenticated;
grant all on public.batches to service_role;
alter table public.batches enable row level security;
create policy "batches_select" on public.batches for select to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));

-- ============ CODES ============
create table public.codes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  code_string text not null unique,
  scan_count integer not null default 0,
  flagged boolean not null default false,
  review_status public.review_status not null default 'none',
  last_scanned_at timestamptz,
  created_at timestamptz not null default now()
);
create index codes_batch_idx on public.codes(batch_id);
create index codes_company_idx on public.codes(company_id);
create index codes_flagged_idx on public.codes(flagged) where flagged;
grant select on public.codes to authenticated;
grant all on public.codes to service_role;
alter table public.codes enable row level security;
create policy "codes_select" on public.codes for select to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));

-- ============ SCANS ============
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.codes(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  browser_token text,
  city text,
  country text,
  device_fingerprint text,
  flagged boolean not null default false
);
create index scans_code_idx on public.scans(code_id);
create index scans_company_time_idx on public.scans(company_id, scanned_at);
grant select on public.scans to authenticated;
grant all on public.scans to service_role;
alter table public.scans enable row level security;
create policy "scans_select" on public.scans for select to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(), 'admin'));

-- ============ REPORTS ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  code_id uuid references public.codes(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  code_string text not null,
  contact text,
  message text not null,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);
create index reports_company_idx on public.reports(company_id);
grant select, update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reports_select" on public.reports for select to authenticated
  using ((company_id is not null and public.owns_company(company_id)) or public.has_role(auth.uid(), 'admin'));
create policy "reports_update_admin" on public.reports for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============ CODE GENERATION ============
create or replace function public.random_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..12 loop
    out := out || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    if i in (4, 8) then out := out || '-'; end if;
  end loop;
  return out;
end $$;

create or replace function public.generate_batch(_product_id uuid, _quantity integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_batch uuid;
  v_limit int;
  v_used int;
  v_prefix text;
  v_seq int;
  i int := 0;
  attempts int := 0;
begin
  if _quantity < 1 or _quantity > 10000 then
    raise exception 'Quantity must be between 1 and 10,000';
  end if;
  select p.company_id into v_company from public.products p where p.id = _product_id;
  if v_company is null then raise exception 'Product not found'; end if;
  if not exists (select 1 from public.companies c where c.id = v_company and c.owner_id = auth.uid() and c.status = 'approved') then
    raise exception 'Company not approved or not owned by you';
  end if;
  select plan_code_limit into v_limit from public.companies where id = v_company;
  select coalesce(sum(quantity),0) into v_used from public.batches
    where company_id = v_company and created_at >= date_trunc('month', now());
  if v_used + _quantity > v_limit then
    raise exception 'This batch would exceed your monthly plan limit of % codes (% used).', v_limit, v_used;
  end if;
  select count(*) + 1 into v_seq from public.batches where company_id = v_company;
  v_prefix := upper(regexp_replace(left((select name from public.companies where id = v_company), 2), '[^A-Za-z]', 'X', 'g'));
  insert into public.batches (product_id, company_id, batch_number, quantity, status)
  values (_product_id, v_company, v_prefix || '-' || to_char(now(), 'YYMM') || '-' || lpad(v_seq::text, 3, '0'), _quantity, 'ready')
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
  return v_batch;
end $$;
grant execute on function public.generate_batch(uuid, integer) to authenticated;

-- ============ PUBLIC VERIFICATION ============
create or replace function public.verify_code(_code text, _token text, _city text, _country text, _fingerprint text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code public.codes%rowtype;
  v_product public.products%rowtype;
  v_company public.companies%rowtype;
  v_batch public.batches%rowtype;
  v_norm text;
  v_distinct_tokens int;
  v_distinct_cities int;
  v_recent int;
  v_flag boolean := false;
  v_status text := 'genuine';
begin
  v_norm := upper(regexp_replace(coalesce(_code,''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_norm) <> 12 then return jsonb_build_object('status','invalid'); end if;
  v_norm := substr(v_norm,1,4) || '-' || substr(v_norm,5,4) || '-' || substr(v_norm,9,4);
  select * into v_code from public.codes where code_string = v_norm;
  if not found then return jsonb_build_object('status','invalid'); end if;

  select count(distinct browser_token) into v_distinct_tokens from public.scans where code_id = v_code.id and browser_token is distinct from _token;
  select count(distinct city) into v_distinct_cities from public.scans where code_id = v_code.id and city is not null and city is distinct from _city;
  select count(*) into v_recent from public.scans where code_id = v_code.id and scanned_at > now() - interval '24 hours';

  if v_code.scan_count + 1 >= 3 and (v_distinct_tokens >= 1 or v_distinct_cities >= 1) then
    v_status := 'genuine_repeated';
  end if;
  if (v_distinct_cities >= 2) or (v_code.scan_count + 1 >= 5 and v_distinct_tokens >= 2) or v_recent >= 6 then
    v_flag := true;
  end if;

  insert into public.scans (code_id, company_id, product_id, batch_id, browser_token, city, country, device_fingerprint, flagged)
  values (v_code.id, v_code.company_id, v_code.product_id, v_code.batch_id, _token, _city, _country, _fingerprint, v_flag);

  update public.codes set
    scan_count = scan_count + 1,
    last_scanned_at = now(),
    flagged = flagged or v_flag,
    review_status = case when (flagged or v_flag) and review_status = 'none' then 'open' else review_status end
  where id = v_code.id;

  select * into v_product from public.products where id = v_code.product_id;
  select * into v_company from public.companies where id = v_code.company_id;
  select * into v_batch from public.batches where id = v_code.batch_id;

  return jsonb_build_object(
    'status', v_status,
    'code', v_code.code_string,
    'scan_count', v_code.scan_count + 1,
    'product', jsonb_build_object('name', v_product.name, 'category', v_product.category, 'description', v_product.description, 'image', v_product.images[1]),
    'company', jsonb_build_object('name', v_company.name, 'logo', v_company.logo_url),
    'batch', jsonb_build_object('number', v_batch.batch_number, 'produced_at', v_batch.created_at)
  );
end $$;
grant execute on function public.verify_code(text, text, text, text, text) to anon, authenticated;

create or replace function public.submit_report(_code text, _contact text, _message text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_norm text;
  v_code public.codes%rowtype;
begin
  if length(trim(coalesce(_message,''))) < 5 or length(_message) > 2000 then
    raise exception 'Message must be between 5 and 2000 characters';
  end if;
  v_norm := upper(regexp_replace(coalesce(_code,''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_norm) = 12 then
    v_norm := substr(v_norm,1,4) || '-' || substr(v_norm,5,4) || '-' || substr(v_norm,9,4);
    select * into v_code from public.codes where code_string = v_norm;
  end if;
  insert into public.reports (code_id, company_id, code_string, contact, message)
  values (v_code.id, v_code.company_id, left(coalesce(_code,''), 40), left(_contact, 200), trim(_message));
  if v_code.id is not null then
    update public.codes set flagged = true, review_status = case when review_status = 'none' then 'open' else review_status end where id = v_code.id;
  end if;
end $$;
grant execute on function public.submit_report(text, text, text) to anon, authenticated;

-- ============ METRICS ============
create or replace function public.company_stats(_company_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.owns_company(_company_id) or public.has_role(auth.uid(), 'admin') then jsonb_build_object(
    'products', (select count(*) from public.products where company_id = _company_id),
    'codes', (select count(*) from public.codes where company_id = _company_id),
    'scans_month', (select count(*) from public.scans where company_id = _company_id and scanned_at >= date_trunc('month', now())),
    'flagged', (select count(*) from public.scans where company_id = _company_id and flagged),
    'codes_month', (select coalesce(sum(quantity),0) from public.batches where company_id = _company_id and created_at >= date_trunc('month', now()))
  ) else null end
$$;
grant execute on function public.company_stats(uuid) to authenticated;

create or replace function public.batch_stats(_company_id uuid)
returns table (batch_id uuid, genuine bigint, flagged bigint, scanned_codes bigint)
language sql stable security definer set search_path = public as $$
  select b.id,
    (select count(*) from public.scans s where s.batch_id = b.id and not s.flagged),
    (select count(*) from public.scans s where s.batch_id = b.id and s.flagged),
    (select count(*) from public.codes c where c.batch_id = b.id and c.scan_count > 0)
  from public.batches b
  where b.company_id = _company_id and (public.owns_company(_company_id) or public.has_role(auth.uid(), 'admin'))
$$;
grant execute on function public.batch_stats(uuid) to authenticated;

create or replace function public.platform_metrics()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.has_role(auth.uid(), 'admin') then jsonb_build_object(
    'companies', (select count(*) from public.companies),
    'pending', (select count(*) from public.companies where status = 'pending'),
    'codes', (select count(*) from public.codes),
    'scans', (select count(*) from public.scans),
    'flagged_scans', (select count(*) from public.scans where flagged),
    'open_reports', (select count(*) from public.reports where not reviewed),
    'growth', (select coalesce(jsonb_agg(jsonb_build_object('month', m, 'companies', c) order by m), '[]'::jsonb)
               from (select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*) c from public.companies group by 1) g)
  ) else null end
$$;
grant execute on function public.platform_metrics() to authenticated;

create or replace function public.admin_company_overview()
returns table (id uuid, name text, status public.company_status, subscription_plan text, created_at timestamptz, product_count bigint, code_count bigint, registration_number text, email text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.status, c.subscription_plan, c.created_at,
    (select count(*) from public.products p where p.company_id = c.id),
    (select count(*) from public.codes k where k.company_id = c.id),
    c.registration_number, c.email
  from public.companies c
  where public.has_role(auth.uid(), 'admin')
  order by c.created_at desc
$$;
grant execute on function public.admin_company_overview() to authenticated;

-- admin review of flagged codes
create or replace function public.set_code_review(_code_id uuid, _status public.review_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.codes set review_status = _status where id = _code_id;
end $$;
grant execute on function public.set_code_review(uuid, public.review_status) to authenticated;