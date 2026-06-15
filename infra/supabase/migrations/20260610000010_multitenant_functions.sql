-- Phase 9 — multi-tenant retrofit (part 3: function scoping).
-- Dispatch only considers drivers in the trip's operator, and a fatigue session
-- opened by the completion trigger inherits the trip's operator.

create or replace function public.dispatch_candidates(p_trip_id uuid)
returns table (driver_id uuid, vehicle_id uuid, distance_m double precision, pickup_eta_s integer)
language sql
stable
security definer
set search_path = public
as $$
  with t as (
    select tr.*, bk.vehicle_type_requested
    from public.trips tr
    join public.bookings bk on bk.id = tr.booking_id
    where tr.id = p_trip_id and tr.status = 'requested'
  )
  select
    d.user_id as driver_id,
    ds.vehicle_id,
    st_distance(dll.point, t.pickup_point) as distance_m,
    (st_distance(dll.point, t.pickup_point) / 11)::int as pickup_eta_s
  from t
  join public.driver_profiles d
    on d.status = 'approved'
   and d.operator_id = t.operator_id
   and (d.fatigue_locked_until is null or d.fatigue_locked_until < now())
  join public.driver_status ds
    on ds.driver_id = d.user_id and ds.ended_at is null and ds.status = 'online'
  join public.driver_location_latest dll
    on dll.driver_id = d.user_id and dll.recorded_at > now() - interval '120 seconds'
  join public.vehicles v
    on v.id = ds.vehicle_id and v.status = 'active'
   and v.vehicle_type = t.vehicle_type_requested
  where st_dwithin(dll.point, t.pickup_point, 10000)
    and not exists (
      select 1 from public.trips ot
      where ot.driver_id = d.user_id
        and ot.status in ('assigned', 'driver_en_route', 'arrived_at_pickup', 'in_progress')
    )
    and not exists (
      select 1 from public.trip_offers o where o.trip_id = t.id and o.driver_id = d.user_id
    )
    and not exists (
      select 1 from public.driver_documents dd
      where dd.driver_id = d.user_id and dd.status = 'approved'
        and dd.expires_on is not null and dd.expires_on < current_date
    )
    and not exists (
      select 1 from public.vehicle_documents vd
      where vd.vehicle_id = v.id and vd.status = 'approved'
        and vd.expires_on is not null and vd.expires_on < current_date
    )
    and exists (
      select 1 from public.vehicle_inspections vi
      where vi.vehicle_id = v.id and vi.result = 'pass'
        and (vi.next_due_on is null or vi.next_due_on >= current_date)
    )
  order by distance_m asc
  limit 10
$$;

create or replace function public.accumulate_fatigue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_drive_s integer;
  v_total_s integer;
  v_cap_s integer;
  v_rest_s integer;
begin
  if new.driver_id is null or new.started_at is null or new.completed_at is null then
    return new;
  end if;

  v_drive_s := greatest(0, extract(epoch from (new.completed_at - new.started_at))::int);
  v_cap_s := coalesce((select value::text::int from public.app_config where key = 'fatigue.max_drive_time_s' and operator_id = new.operator_id), 43200);
  v_rest_s := coalesce((select value::text::int from public.app_config where key = 'fatigue.rest_after_lockout_s' and operator_id = new.operator_id), 36000);

  select id into v_session_id
  from public.fatigue_sessions
  where driver_id = new.driver_id and ended_at is null
  order by started_at desc
  limit 1;

  if v_session_id is null then
    insert into public.fatigue_sessions (driver_id, operator_id, drive_time_s)
    values (new.driver_id, new.operator_id, v_drive_s)
    returning id into v_session_id;
  else
    update public.fatigue_sessions set drive_time_s = drive_time_s + v_drive_s where id = v_session_id;
  end if;

  select coalesce(sum(drive_time_s), 0) into v_total_s
  from public.fatigue_sessions
  where driver_id = new.driver_id and started_at > now() - interval '24 hours';

  if v_total_s >= v_cap_s then
    update public.driver_profiles
      set fatigue_locked_until = now() + make_interval(secs => v_rest_s)
      where user_id = new.driver_id;
    update public.fatigue_sessions
      set enforced_lockout = true, lockout_until = now() + make_interval(secs => v_rest_s), ended_at = now()
      where id = v_session_id;
    update public.driver_status
      set status = 'offline', ended_at = now()
      where driver_id = new.driver_id and ended_at is null;
  end if;

  return new;
end;
$$;
