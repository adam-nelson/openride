-- Readable lat/lng snapshot for live trip tracking (rider / driver / staff).
-- PostgREST returns geography as opaque bytes; this RPC exposes coordinates as JSON.

create or replace function public.trip_tracking_snapshot(p_trip_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  t record;
  d record;
  result jsonb;
  trackable boolean;
begin
  select
    id,
    status,
    rider_id,
    driver_id,
    route_polyline,
    pickup_address,
    dropoff_address,
    estimated_fare_cents,
    final_fare_cents,
    st_y(pickup_point::geometry) as pickup_lat,
    st_x(pickup_point::geometry) as pickup_lng,
    st_y(dropoff_point::geometry) as dropoff_lat,
    st_x(dropoff_point::geometry) as dropoff_lng
  into t
  from public.trips
  where id = p_trip_id;

  -- RLS on trips hides unauthorized rows → null (not an error).
  if not found then
    return null;
  end if;

  -- Defense in depth if a broader SELECT policy is added later.
  if t.rider_id is distinct from auth.uid()
     and t.driver_id is distinct from auth.uid()
     and not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  trackable := t.status in (
    'assigned',
    'driver_en_route',
    'arrived_at_pickup',
    'in_progress'
  );

  result := jsonb_build_object(
    'id', t.id,
    'status', t.status,
    'driver_id', t.driver_id,
    'pickup_address', t.pickup_address,
    'dropoff_address', t.dropoff_address,
    'estimated_fare_cents', t.estimated_fare_cents,
    'final_fare_cents', t.final_fare_cents,
    'route_polyline', t.route_polyline,
    'pickup', jsonb_build_object('lat', t.pickup_lat, 'lng', t.pickup_lng),
    'dropoff', jsonb_build_object('lat', t.dropoff_lat, 'lng', t.dropoff_lng),
    'driver', null
  );

  if trackable and t.driver_id is not null then
    -- Subject to driver_location_latest RLS (assigned rider / self / staff).
    select
      st_y(point::geometry) as lat,
      st_x(point::geometry) as lng,
      heading_deg,
      recorded_at
    into d
    from public.driver_location_latest
    where driver_id = t.driver_id;

    if found then
      result := jsonb_set(
        result,
        '{driver}',
        jsonb_build_object(
          'lat', d.lat,
          'lng', d.lng,
          'heading_deg', d.heading_deg,
          'recorded_at', d.recorded_at
        )
      );
    end if;
  end if;

  return result;
end;
$$;

comment on function public.trip_tracking_snapshot(uuid) is
  'Returns trip pickup/dropoff (and live driver position when trackable) as JSON lat/lng for map clients.';

grant execute on function public.trip_tracking_snapshot(uuid) to authenticated;
grant execute on function public.trip_tracking_snapshot(uuid) to service_role;
