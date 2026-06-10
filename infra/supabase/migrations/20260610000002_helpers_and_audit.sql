-- Helpers, auth.users sync, audit log triggers.

-- ============================================================================
-- auth_role() — used in RLS predicates
-- ============================================================================
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

grant execute on function public.auth_role() to anon, authenticated, service_role;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('dispatcher', 'admin', 'operator_owner', 'support')
     from public.users where id = auth.uid()),
    false
  )
$$;

grant execute on function public.is_staff() to anon, authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin', 'operator_owner')
     from public.users where id = auth.uid()),
    false
  )
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ============================================================================
-- Sync new auth.users rows into public.users
-- ============================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role public.user_role;
begin
  new_role := coalesce(
    (new.raw_user_meta_data->>'role')::public.user_role,
    'rider'::public.user_role
  );

  insert into public.users (id, phone, email, display_name, role)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email, new.phone),
    new_role
  )
  on conflict (id) do update
    set phone = excluded.phone,
        email = excluded.email,
        updated_at = now();

  if new_role = 'rider' then
    insert into public.rider_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  elsif new_role = 'driver' then
    insert into public.driver_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;

  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- Audit log helper
-- ============================================================================
create or replace function public.write_audit_log(
  p_action text,
  p_target_table text,
  p_target_id uuid,
  p_before jsonb,
  p_after jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select role into v_role from public.users where id = auth.uid();

  insert into public.audit_logs
    (actor_id, actor_role, action, target_table, target_id, before, after)
  values
    (auth.uid(), v_role, p_action, p_target_table, p_target_id, p_before, p_after);
end;
$$;

-- Generic audit trigger function for mutation logging.
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
begin
  if tg_op = 'INSERT' then
    v_action := tg_table_name || '.created';
    v_target_id := (row_to_json(new)->>'id')::uuid;
    v_before := null;
    v_after := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_action := tg_table_name || '.updated';
    v_target_id := (row_to_json(new)->>'id')::uuid;
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_action := tg_table_name || '.deleted';
    v_target_id := (row_to_json(old)->>'id')::uuid;
    v_before := to_jsonb(old);
    v_after := null;
  end if;

  perform public.write_audit_log(v_action, tg_table_name, v_target_id, v_before, v_after);

  return coalesce(new, old);
end;
$$;

-- Attach audit triggers to sensitive tables.
create trigger trg_audit_trips
  after insert or update or delete on public.trips
  for each row execute function public.audit_row_changes();

create trigger trg_audit_payments
  after insert or update or delete on public.payments
  for each row execute function public.audit_row_changes();

create trigger trg_audit_driver_profiles
  after update or delete on public.driver_profiles
  for each row execute function public.audit_row_changes();

create trigger trg_audit_vehicles
  after insert or update or delete on public.vehicles
  for each row execute function public.audit_row_changes();

create trigger trg_audit_driver_documents
  after insert or update or delete on public.driver_documents
  for each row execute function public.audit_row_changes();

create trigger trg_audit_vehicle_documents
  after insert or update or delete on public.vehicle_documents
  for each row execute function public.audit_row_changes();

create trigger trg_audit_fare_rules
  after insert or update or delete on public.fare_rules
  for each row execute function public.audit_row_changes();

create trigger trg_audit_incident_reports
  after insert or update or delete on public.incident_reports
  for each row execute function public.audit_row_changes();

create trigger trg_audit_manual_overrides
  after insert on public.manual_overrides
  for each row execute function public.audit_row_changes();
