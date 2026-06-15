-- Phase 9 — multi-tenant retrofit (part 1: columns + helpers).
-- Adds operator_id to every domain table, backfilled to the single existing
-- operator, and indexed. Isolation is enforced by RLS (migration 0009), so
-- operator_id stays NULLABLE here: an unstamped row is invisible to operator-
-- scoped staff (a safe failure mode) rather than leaking or breaking inserts.
-- Can be tightened to NOT NULL once every insert path is confirmed.

do $$
declare
  v_op uuid := '00000000-0000-0000-0000-000000000001';
  t text;
  tables text[] := array[
    'users', 'rider_profiles', 'driver_profiles', 'vehicles', 'driver_documents',
    'vehicle_documents', 'bookings', 'trips', 'trip_offers', 'trip_locations',
    'fare_estimates', 'fare_rules', 'payments', 'payouts', 'driver_status',
    'driver_location_latest', 'driver_location_history', 'fatigue_sessions',
    'vehicle_inspections', 'incident_reports', 'support_cases', 'support_case_messages',
    'audit_logs', 'manual_overrides', 'compliance_rules', 'notification_preferences'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I add column if not exists operator_id uuid references public.operators(id)', t);
    execute format('update public.%I set operator_id = %L where operator_id is null', t, v_op);
    execute format('create index if not exists %I on public.%I(operator_id)', t || '_operator_idx', t);
  end loop;
end $$;

-- app_config is keyed per operator (PK column must be NOT NULL).
alter table public.app_config add column if not exists operator_id uuid references public.operators(id);
update public.app_config set operator_id = '00000000-0000-0000-0000-000000000001' where operator_id is null;
alter table public.app_config alter column operator_id set not null;
alter table public.app_config drop constraint app_config_pkey;
alter table public.app_config add primary key (operator_id, key);

-- ============================================================================
-- auth_operator(): the calling user's operator. Used by RLS to scope staff.
-- ============================================================================
create or replace function public.auth_operator()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select operator_id from public.users where id = auth.uid()
$$;
grant execute on function public.auth_operator() to anon, authenticated, service_role;

-- ============================================================================
-- New auth users join the default operator (until multi-operator signup adds a
-- selection step). Mirrors handle_new_auth_user from migration 0002 + operator.
-- ============================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role public.user_role;
  v_op uuid := '00000000-0000-0000-0000-000000000001';
begin
  new_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'rider'::public.user_role);

  insert into public.users (id, phone, email, display_name, role, operator_id)
  values (
    new.id, new.phone, new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email, new.phone),
    new_role, v_op
  )
  on conflict (id) do update
    set phone = excluded.phone, email = excluded.email, updated_at = now();

  if new_role = 'rider' then
    insert into public.rider_profiles (user_id, operator_id) values (new.id, v_op)
    on conflict (user_id) do nothing;
  elsif new_role = 'driver' then
    insert into public.driver_profiles (user_id, operator_id) values (new.id, v_op)
    on conflict (user_id) do nothing;
  end if;

  insert into public.notification_preferences (user_id, operator_id) values (new.id, v_op)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ============================================================================
-- Default operator_id from the acting user for JWT-context inserts (incidents,
-- support, rider location). Edge functions using the service role stamp it
-- explicitly (migration in part 3 / function code).
-- ============================================================================
create or replace function public.set_operator_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.operator_id is null then
    new.operator_id := public.auth_operator();
  end if;
  return new;
end;
$$;

create trigger trg_set_operator_id_incidents
  before insert on public.incident_reports
  for each row execute function public.set_operator_id();
create trigger trg_set_operator_id_support
  before insert on public.support_cases
  for each row execute function public.set_operator_id();
create trigger trg_set_operator_id_support_msg
  before insert on public.support_case_messages
  for each row execute function public.set_operator_id();
create trigger trg_set_operator_id_loc
  before insert on public.driver_location_latest
  for each row execute function public.set_operator_id();
create trigger trg_set_operator_id_fare_est
  before insert on public.fare_estimates
  for each row execute function public.set_operator_id();

-- ============================================================================
-- Audit rows inherit the operator of the row being mutated (NEW/OLD now carry
-- operator_id), so audited mutations don't hit a null operator under RLS.
-- ============================================================================
create or replace function public.audit_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_target_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_role public.user_role;
  v_op uuid;
begin
  if tg_op = 'INSERT' then
    v_action := tg_table_name || '.created';
    v_target_id := (row_to_json(new)->>'id')::uuid;
    v_before := null; v_after := to_jsonb(new);
    v_op := (row_to_json(new)->>'operator_id')::uuid;
  elsif tg_op = 'UPDATE' then
    v_action := tg_table_name || '.updated';
    v_target_id := (row_to_json(new)->>'id')::uuid;
    v_before := to_jsonb(old); v_after := to_jsonb(new);
    v_op := (row_to_json(new)->>'operator_id')::uuid;
  elsif tg_op = 'DELETE' then
    v_action := tg_table_name || '.deleted';
    v_target_id := (row_to_json(old)->>'id')::uuid;
    v_before := to_jsonb(old); v_after := null;
    v_op := (row_to_json(old)->>'operator_id')::uuid;
  end if;

  select role into v_role from public.users where id = auth.uid();

  insert into public.audit_logs
    (actor_id, actor_role, action, target_table, target_id, before, after, operator_id)
  values
    (auth.uid(), v_role, v_action, tg_table_name, v_target_id, v_before, v_after, v_op);

  return coalesce(new, old);
end;
$$;
