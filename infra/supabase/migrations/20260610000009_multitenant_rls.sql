-- Phase 9 — multi-tenant retrofit (part 2: operator-scoped RLS).
-- Staff/admin policies are scoped to the caller's operator via auth_operator().
-- User-owned policies (own trips, own profile, assigned-driver reads) are left
-- as-is: a user's rows are implicitly within their own operator.

-- A single operator is visible to its own members.
alter policy operators_read on public.operators using (id = public.auth_operator());
alter policy operators_admin_write on public.operators
  using (public.is_admin() and id = public.auth_operator())
  with check (public.is_admin() and id = public.auth_operator());

-- users
alter policy users_self_read on public.users
  using (id = auth.uid() or (public.is_staff() and operator_id = public.auth_operator()));
alter policy users_admin_write on public.users
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());

-- Helper note: each statement below adds `operator_id = auth_operator()` to the
-- staff/admin branch of the policy.

-- rider_profiles / driver_profiles
alter policy rider_profiles_staff_read on public.rider_profiles
  using (public.is_staff() and operator_id = public.auth_operator());
alter policy rider_profiles_admin_write on public.rider_profiles
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());
alter policy driver_profiles_staff_read on public.driver_profiles
  using (public.is_staff() and operator_id = public.auth_operator());
alter policy driver_profiles_admin_write on public.driver_profiles
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());

-- vehicles + documents
alter policy vehicles_staff_read on public.vehicles
  using (public.is_staff() and operator_id = public.auth_operator());
alter policy vehicles_admin_write on public.vehicles
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());
alter policy driver_documents_staff_read on public.driver_documents
  using (public.is_staff() and operator_id = public.auth_operator());
alter policy driver_documents_admin_write on public.driver_documents
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());
alter policy vehicle_documents_staff_read on public.vehicle_documents
  using (public.is_staff() and operator_id = public.auth_operator());
alter policy vehicle_documents_admin_write on public.vehicle_documents
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());

-- bookings / trips / offers / locations
alter policy bookings_staff on public.bookings
  using (public.is_staff() and operator_id = public.auth_operator())
  with check (public.is_staff() and operator_id = public.auth_operator());
alter policy trips_staff on public.trips
  using (public.is_staff() and operator_id = public.auth_operator())
  with check (public.is_staff() and operator_id = public.auth_operator());
alter policy trip_offers_staff on public.trip_offers
  using (public.is_staff() and operator_id = public.auth_operator())
  with check (public.is_staff() and operator_id = public.auth_operator());
alter policy trip_locations_staff_read on public.trip_locations
  using (public.is_staff() and operator_id = public.auth_operator());

-- fares
alter policy fare_rules_read on public.fare_rules using (operator_id = public.auth_operator());
alter policy fare_rules_admin_write on public.fare_rules
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());
alter policy fare_estimates_staff_read on public.fare_estimates
  using (public.is_staff() and operator_id = public.auth_operator());

-- payments / payouts
alter policy payments_staff on public.payments
  using (public.is_staff() and operator_id = public.auth_operator())
  with check (public.is_staff() and operator_id = public.auth_operator());
alter policy payouts_admin on public.payouts
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());

-- driver status / location
alter policy driver_status_staff_read on public.driver_status
  using (public.is_staff() and operator_id = public.auth_operator());
alter policy driver_location_latest_staff_read on public.driver_location_latest
  using (public.is_staff() and operator_id = public.auth_operator());
alter policy driver_location_history_staff_read on public.driver_location_history
  using (public.is_staff() and operator_id = public.auth_operator());

-- fatigue / inspections
alter policy fatigue_sessions_staff on public.fatigue_sessions
  using (public.is_staff() and operator_id = public.auth_operator())
  with check (public.is_staff() and operator_id = public.auth_operator());
alter policy vehicle_inspections_staff on public.vehicle_inspections
  using (public.is_staff() and operator_id = public.auth_operator())
  with check (public.is_staff() and operator_id = public.auth_operator());

-- incidents / support
alter policy incident_reports_staff on public.incident_reports
  using (public.is_staff() and operator_id = public.auth_operator())
  with check (public.is_staff() and operator_id = public.auth_operator());
alter policy support_cases_staff on public.support_cases
  using (public.is_staff() and operator_id = public.auth_operator())
  with check (public.is_staff() and operator_id = public.auth_operator());
alter policy support_case_messages_read on public.support_case_messages
  using (
    (public.is_staff() and operator_id = public.auth_operator())
    or exists (
      select 1 from public.support_cases c
      where c.id = support_case_messages.case_id
        and (c.opened_by = auth.uid() or c.subject_user_id = auth.uid())
    )
  );

-- audit / overrides
alter policy audit_logs_staff_read on public.audit_logs
  using (public.is_staff() and operator_id = public.auth_operator());
alter policy manual_overrides_staff_read on public.manual_overrides
  using (public.is_staff() and operator_id = public.auth_operator());
alter policy manual_overrides_staff_create on public.manual_overrides
  with check (public.is_staff() and actor_id = auth.uid() and operator_id = public.auth_operator());

-- config / compliance reference data
alter policy app_config_read on public.app_config using (operator_id = public.auth_operator());
alter policy app_config_admin_write on public.app_config
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());
alter policy compliance_rules_read on public.compliance_rules using (operator_id = public.auth_operator());
alter policy compliance_rules_admin_write on public.compliance_rules
  using (public.is_admin() and operator_id = public.auth_operator())
  with check (public.is_admin() and operator_id = public.auth_operator());

-- notification preferences
alter policy notification_preferences_staff_read on public.notification_preferences
  using (public.is_staff() and operator_id = public.auth_operator());
