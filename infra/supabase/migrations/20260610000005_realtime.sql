-- Add tables to the supabase_realtime publication so clients can subscribe to
-- postgres_changes. Realtime still enforces RLS, so a rider only receives
-- changes to rows they can SELECT (their own trips).

do $$
declare
  t text;
begin
  foreach t in array array['trips', 'trip_offers', 'driver_location_latest', 'driver_status']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- postgres_changes UPDATE/DELETE payloads need the full old row for RLS filters.
alter table public.trips replica identity full;
alter table public.trip_offers replica identity full;
