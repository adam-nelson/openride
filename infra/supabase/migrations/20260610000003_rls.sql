-- Row-Level Security policies for OpenRide.
--
-- Strategy: every table has RLS enabled; staff bypass via `is_staff()` / `is_admin()`.
-- Edge Functions running with service_role bypass RLS entirely — they are responsible
-- for enforcing business rules and writing audit entries.

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
alter table public.operators enable row level security;
alter table public.users enable row level security;
alter table public.rider_profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_documents enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.bookings enable row level security;
alter table public.trips enable row level security;
alter table public.trip_offers enable row level security;
alter table public.trip_locations enable row level security;
alter table public.fare_rules enable row level security;
alter table public.fare_estimates enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;
alter table public.driver_status enable row level security;
alter table public.driver_location_latest enable row level security;
alter table public.driver_location_history enable row level security;
alter table public.fatigue_sessions enable row level security;
alter table public.vehicle_inspections enable row level security;
alter table public.incident_reports enable row level security;
alter table public.support_cases enable row level security;
alter table public.support_case_messages enable row level security;
alter table public.audit_logs enable row level security;
alter table public.manual_overrides enable row level security;
alter table public.app_config enable row level security;
alter table public.compliance_rules enable row level security;
alter table public.notification_preferences enable row level security;

-- ============================================================================
-- operators (read-only for everyone signed in; admin can write)
-- ============================================================================
create policy operators_read on public.operators
  for select to authenticated using (true);

create policy operators_admin_write on public.operators
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- users
-- ============================================================================
create policy users_self_read on public.users
  for select to authenticated using (id = auth.uid() or public.is_staff());

create policy users_self_update on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()));

create policy users_admin_write on public.users
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- rider_profiles
-- ============================================================================
create policy rider_profiles_self on public.rider_profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy rider_profiles_staff_read on public.rider_profiles
  for select to authenticated using (public.is_staff());

create policy rider_profiles_admin_write on public.rider_profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- driver_profiles
-- ============================================================================
create policy driver_profiles_self on public.driver_profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy driver_profiles_staff_read on public.driver_profiles
  for select to authenticated using (public.is_staff());

create policy driver_profiles_admin_write on public.driver_profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- vehicles — drivers can read their assigned vehicle; admin manages
-- ============================================================================
create policy vehicles_driver_read on public.vehicles
  for select to authenticated
  using (
    public.auth_role() = 'driver' and (
      default_driver_id = auth.uid()
      or exists (
        select 1 from public.driver_status_current ds
        where ds.driver_id = auth.uid() and ds.vehicle_id = vehicles.id
      )
    )
  );

create policy vehicles_staff_read on public.vehicles
  for select to authenticated using (public.is_staff());

create policy vehicles_admin_write on public.vehicles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- driver_documents
-- ============================================================================
create policy driver_documents_self on public.driver_documents
  for all to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy driver_documents_staff_read on public.driver_documents
  for select to authenticated using (public.is_staff());

create policy driver_documents_admin_write on public.driver_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- vehicle_documents
-- ============================================================================
create policy vehicle_documents_staff_read on public.vehicle_documents
  for select to authenticated using (public.is_staff());

create policy vehicle_documents_admin_write on public.vehicle_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy vehicle_documents_driver_read on public.vehicle_documents
  for select to authenticated
  using (
    public.auth_role() = 'driver' and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_documents.vehicle_id
        and (v.default_driver_id = auth.uid()
             or exists (select 1 from public.driver_status_current ds
                        where ds.driver_id = auth.uid() and ds.vehicle_id = v.id))
    )
  );

-- ============================================================================
-- bookings
-- ============================================================================
create policy bookings_rider_self on public.bookings
  for select to authenticated using (rider_id = auth.uid());

create policy bookings_rider_create on public.bookings
  for insert to authenticated with check (rider_id = auth.uid());

create policy bookings_rider_cancel on public.bookings
  for update to authenticated
  using (rider_id = auth.uid() and status in ('pending', 'active'))
  with check (rider_id = auth.uid());

create policy bookings_staff on public.bookings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============================================================================
-- trips
-- ============================================================================
create policy trips_rider_read on public.trips
  for select to authenticated using (rider_id = auth.uid());

create policy trips_driver_read on public.trips
  for select to authenticated
  using (
    public.auth_role() = 'driver' and (
      driver_id = auth.uid()
      or exists (
        select 1 from public.trip_offers o
        where o.trip_id = trips.id
          and o.driver_id = auth.uid()
          and o.status = 'pending'
      )
    )
  );

create policy trips_staff on public.trips
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============================================================================
-- trip_offers
-- ============================================================================
create policy trip_offers_driver_read on public.trip_offers
  for select to authenticated using (driver_id = auth.uid());

create policy trip_offers_staff on public.trip_offers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============================================================================
-- trip_locations — driver writes own, rider reads own trip, staff reads all
-- ============================================================================
create policy trip_locations_rider_read on public.trip_locations
  for select to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_locations.trip_id and t.rider_id = auth.uid()));

create policy trip_locations_driver_write on public.trip_locations
  for insert to authenticated
  with check (exists (select 1 from public.trips t
                      where t.id = trip_locations.trip_id and t.driver_id = auth.uid()));

create policy trip_locations_driver_read on public.trip_locations
  for select to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_locations.trip_id and t.driver_id = auth.uid()));

create policy trip_locations_staff_read on public.trip_locations
  for select to authenticated using (public.is_staff());

-- ============================================================================
-- fare_rules — readable by signed-in users; admin writes
-- ============================================================================
create policy fare_rules_read on public.fare_rules
  for select to authenticated using (true);

create policy fare_rules_admin_write on public.fare_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- fare_estimates — rider sees own; staff sees all
-- ============================================================================
create policy fare_estimates_rider on public.fare_estimates
  for all to authenticated
  using (rider_id = auth.uid())
  with check (rider_id = auth.uid());

create policy fare_estimates_staff_read on public.fare_estimates
  for select to authenticated using (public.is_staff());

-- ============================================================================
-- payments — rider + driver read own; staff manages
-- ============================================================================
create policy payments_rider_read on public.payments
  for select to authenticated using (rider_id = auth.uid());

create policy payments_driver_read on public.payments
  for select to authenticated using (driver_id = auth.uid());

create policy payments_staff on public.payments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============================================================================
-- payouts — driver reads own; admin manages
-- ============================================================================
create policy payouts_driver_read on public.payouts
  for select to authenticated using (driver_id = auth.uid());

create policy payouts_admin on public.payouts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- driver_status
-- ============================================================================
create policy driver_status_self on public.driver_status
  for all to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy driver_status_staff_read on public.driver_status
  for select to authenticated using (public.is_staff());

-- ============================================================================
-- driver_location_latest
-- ============================================================================
create policy driver_location_latest_self on public.driver_location_latest
  for all to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy driver_location_latest_staff_read on public.driver_location_latest
  for select to authenticated using (public.is_staff());

-- Riders subscribed to their active trip should read the assigned driver's position.
create policy driver_location_latest_rider_assigned_read on public.driver_location_latest
  for select to authenticated
  using (exists (
    select 1 from public.trips t
    where t.driver_id = driver_location_latest.driver_id
      and t.rider_id = auth.uid()
      and t.status in ('assigned', 'driver_en_route', 'arrived_at_pickup', 'in_progress')
  ));

-- ============================================================================
-- driver_location_history
-- ============================================================================
create policy driver_location_history_self on public.driver_location_history
  for all to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy driver_location_history_staff_read on public.driver_location_history
  for select to authenticated using (public.is_staff());

-- ============================================================================
-- fatigue_sessions
-- ============================================================================
create policy fatigue_sessions_self_read on public.fatigue_sessions
  for select to authenticated using (driver_id = auth.uid());

create policy fatigue_sessions_staff on public.fatigue_sessions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============================================================================
-- vehicle_inspections
-- ============================================================================
create policy vehicle_inspections_staff on public.vehicle_inspections
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy vehicle_inspections_driver_read on public.vehicle_inspections
  for select to authenticated
  using (
    public.auth_role() = 'driver' and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_inspections.vehicle_id
        and (v.default_driver_id = auth.uid()
             or exists (select 1 from public.driver_status_current ds
                        where ds.driver_id = auth.uid() and ds.vehicle_id = v.id))
    )
  );

-- ============================================================================
-- incident_reports — anyone can create one about themselves; staff manages
-- ============================================================================
create policy incident_reports_own_read on public.incident_reports
  for select to authenticated
  using (reported_by = auth.uid() or driver_id = auth.uid() or rider_id = auth.uid());

create policy incident_reports_create on public.incident_reports
  for insert to authenticated with check (reported_by = auth.uid());

create policy incident_reports_staff on public.incident_reports
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============================================================================
-- support_cases
-- ============================================================================
create policy support_cases_self_read on public.support_cases
  for select to authenticated
  using (opened_by = auth.uid() or subject_user_id = auth.uid());

create policy support_cases_self_create on public.support_cases
  for insert to authenticated with check (opened_by = auth.uid());

create policy support_cases_staff on public.support_cases
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy support_case_messages_read on public.support_case_messages
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.support_cases c
      where c.id = support_case_messages.case_id
        and (c.opened_by = auth.uid() or c.subject_user_id = auth.uid())
    )
  );

create policy support_case_messages_write on public.support_case_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_staff()
      or exists (
        select 1 from public.support_cases c
        where c.id = support_case_messages.case_id
          and (c.opened_by = auth.uid() or c.subject_user_id = auth.uid())
      )
    )
  );

-- ============================================================================
-- audit_logs — staff read; no client writes (service role only)
-- ============================================================================
create policy audit_logs_staff_read on public.audit_logs
  for select to authenticated using (public.is_staff());

-- ============================================================================
-- manual_overrides — staff read; staff write (with reason enforced by column check)
-- ============================================================================
create policy manual_overrides_staff_read on public.manual_overrides
  for select to authenticated using (public.is_staff());

create policy manual_overrides_staff_create on public.manual_overrides
  for insert to authenticated with check (public.is_staff() and actor_id = auth.uid());

-- ============================================================================
-- app_config — read for signed-in; admin writes
-- ============================================================================
create policy app_config_read on public.app_config
  for select to authenticated using (true);

create policy app_config_admin_write on public.app_config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- compliance_rules — read for signed-in; admin writes
-- ============================================================================
create policy compliance_rules_read on public.compliance_rules
  for select to authenticated using (true);

create policy compliance_rules_admin_write on public.compliance_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- notification_preferences
-- ============================================================================
create policy notification_preferences_self on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notification_preferences_staff_read on public.notification_preferences
  for select to authenticated using (public.is_staff());
