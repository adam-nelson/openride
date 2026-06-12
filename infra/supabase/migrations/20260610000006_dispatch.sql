-- Dispatch engine support: candidate ranking + stale-offer expiry.

-- ============================================================================
-- dispatch_candidates(trip_id): eligible online drivers for a requested trip,
-- ranked nearest-first. SECURITY DEFINER so the dispatch service can evaluate
-- every driver regardless of RLS. Filters: approved + not fatigue-locked,
-- online with a fresh location, active matching vehicle within radius, no other
-- active trip, not already offered this trip, no expired approved documents,
-- and a current (passed, not-overdue) inspection.
-- ============================================================================
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

grant execute on function public.dispatch_candidates(uuid) to service_role;

-- ============================================================================
-- expire_stale_offers(): timeout backstop. Marks pending offers past their
-- responds_by as timed_out, and surfaces trips stuck in 'requested' with no
-- live offer to manual dispatch. The fast path is the driver app auto-declining
-- on offer expiry (which re-dispatches immediately); this is the safety net for
-- offline/closed apps. Production should also re-invoke dispatch via pg_net.
-- ============================================================================
create or replace function public.expire_stale_offers()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trip_offers
    set status = 'timed_out', responded_at = now()
    where status = 'pending' and responds_by < now();

  update public.trips t
    set status = 'requires_manual_dispatch'
    where t.status = 'requested'
      and t.requested_at < now() - interval '90 seconds'
      and not exists (
        select 1 from public.trip_offers o where o.trip_id = t.id and o.status = 'pending'
      );
end $$;

-- Best-effort minute cron. pg_cron may be unavailable in some environments; if
-- so, the function above can be invoked by any other scheduler.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('openride-expire-offers', '* * * * *', 'select public.expire_stale_offers()');
exception
  when others then
    raise notice 'pg_cron unavailable; expire_stale_offers not scheduled: %', sqlerrm;
end $$;
