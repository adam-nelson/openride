-- OpenRide — initial schema
-- Single-tenant MVP. operator_id is added in a Phase 9 migration; v1 has a single row in `operators`.
--
-- Conventions:
--   - uuid primary keys via gen_random_uuid()
--   - all money in integer cents
--   - all distances in metres, durations in seconds
--   - geography(Point, 4326) for spatial; PostGIS computes distance in metres
--   - timestamps are timestamptz; updated_at maintained by trigger

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";
create extension if not exists "postgis";
create extension if not exists "pg_trgm";

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Enums
-- ============================================================================
create type public.user_role as enum (
  'rider', 'driver', 'dispatcher', 'admin', 'operator_owner', 'support'
);

create type public.driver_status_kind as enum ('offline', 'online', 'on_trip', 'break');

create type public.driver_approval_status as enum (
  'pending_documents', 'pending_review', 'approved', 'suspended', 'offboarded'
);

create type public.vehicle_type as enum (
  'sedan', 'suv', 'van', 'wagon', 'wheelchair_accessible'
);

create type public.fuel_type as enum (
  'petrol', 'diesel', 'hybrid', 'bev', 'phev'
);

create type public.vehicle_status as enum (
  'pending', 'active', 'out_of_service', 'retired'
);

create type public.driver_doc_type as enum (
  'licence_front', 'licence_back', 'authority', 'photo', 'medical_cert', 'other'
);

create type public.vehicle_doc_type as enum (
  'ctp', 'insurance', 'authority', 'coi', 'other'
);

create type public.document_status as enum (
  'pending', 'approved', 'rejected', 'expired'
);

create type public.booking_kind as enum ('now', 'scheduled');

create type public.booking_status as enum ('pending', 'active', 'completed', 'cancelled');

create type public.trip_status as enum (
  'scheduled',
  'requested',
  'assigned',
  'driver_en_route',
  'arrived_at_pickup',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'requires_manual_dispatch'
);

create type public.trip_cancelled_by as enum (
  'rider', 'driver', 'dispatcher', 'system'
);

create type public.trip_payment_status as enum (
  'pending', 'authorised', 'paid', 'failed', 'refunded', 'waived'
);

create type public.offer_status as enum (
  'pending', 'accepted', 'declined', 'timed_out', 'cancelled'
);

create type public.payment_status as enum (
  'requires_action', 'authorised', 'captured', 'failed', 'refunded', 'partially_refunded'
);

create type public.inspection_type as enum ('coi', 'internal', 'other');

create type public.inspection_result as enum ('pass', 'fail', 'conditional');

create type public.incident_category as enum (
  'safety', 'vehicle_damage', 'abuse', 'payment_dispute', 'medical', 'other'
);

create type public.incident_severity as enum ('info', 'low', 'medium', 'high', 'critical');

create type public.incident_status as enum (
  'open', 'triaged', 'under_review', 'resolved', 'closed'
);

create type public.support_case_status as enum (
  'open', 'pending_customer', 'resolved', 'closed'
);

create type public.support_case_priority as enum ('low', 'normal', 'high', 'urgent');

-- ============================================================================
-- operators (single-row in v1)
-- ============================================================================
create table public.operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  abn text,
  contact_email text,
  contact_phone text,
  support_phone text,
  branding_logo_url text,
  branding_primary_color text,
  timezone text not null default 'Australia/Sydney',
  currency text not null default 'AUD',
  country text not null default 'AU',
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_operators_updated_at
  before update on public.operators
  for each row execute function public.set_updated_at();

-- ============================================================================
-- users — mirrors auth.users by id, adds role and profile fields
-- ============================================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  email text,
  display_name text,
  role public.user_role not null default 'rider',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_role_idx on public.users(role);
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ============================================================================
-- rider_profiles
-- ============================================================================
create table public.rider_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  default_payment_method_id text,
  stripe_customer_id text,
  home_label text,
  home_point geography(Point, 4326),
  work_label text,
  work_point geography(Point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_rider_profiles_updated_at
  before update on public.rider_profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- vehicles (referenced by driver_profiles below)
-- ============================================================================
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  rego text not null unique,
  make text not null,
  model text not null,
  year integer not null check (year between 1980 and extract(year from now())::int + 1),
  color text,
  vehicle_type public.vehicle_type not null,
  seat_capacity integer not null check (seat_capacity between 1 and 12),
  fuel_type public.fuel_type not null default 'petrol',
  is_ev boolean generated always as (fuel_type in ('bev', 'phev')) stored,
  status public.vehicle_status not null default 'pending',
  default_driver_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_status_idx on public.vehicles(status);
create index vehicles_type_idx on public.vehicles(vehicle_type);
create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- driver_profiles
-- ============================================================================
create table public.driver_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  licence_number text,
  licence_class text,
  licence_expiry date,
  authority_number text,
  authority_expiry date,
  status public.driver_approval_status not null default 'pending_documents',
  stripe_account_id text,
  stripe_account_status text,
  fatigue_locked_until timestamptz,
  last_known_vehicle_id uuid references public.vehicles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index driver_profiles_status_idx on public.driver_profiles(status);
create trigger trg_driver_profiles_updated_at
  before update on public.driver_profiles
  for each row execute function public.set_updated_at();

alter table public.vehicles
  add constraint vehicles_default_driver_fk
  foreign key (default_driver_id) references public.driver_profiles(user_id) on delete set null;

-- ============================================================================
-- driver_documents
-- ============================================================================
create table public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.driver_profiles(user_id) on delete cascade,
  doc_type public.driver_doc_type not null,
  storage_path text not null,
  issued_on date,
  expires_on date,
  status public.document_status not null default 'pending',
  reviewer_id uuid references public.users(id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index driver_documents_driver_idx on public.driver_documents(driver_id);
create unique index driver_documents_active_unique
  on public.driver_documents(driver_id, doc_type)
  where status = 'approved';
create trigger trg_driver_documents_updated_at
  before update on public.driver_documents
  for each row execute function public.set_updated_at();

-- ============================================================================
-- vehicle_documents
-- ============================================================================
create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  doc_type public.vehicle_doc_type not null,
  storage_path text not null,
  issued_on date,
  expires_on date,
  status public.document_status not null default 'pending',
  reviewer_id uuid references public.users(id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicle_documents_vehicle_idx on public.vehicle_documents(vehicle_id);
create unique index vehicle_documents_active_unique
  on public.vehicle_documents(vehicle_id, doc_type)
  where status = 'approved';
create trigger trg_vehicle_documents_updated_at
  before update on public.vehicle_documents
  for each row execute function public.set_updated_at();

-- ============================================================================
-- bookings
-- ============================================================================
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.users(id) on delete restrict,
  type public.booking_kind not null,
  pickup_label text not null,
  pickup_point geography(Point, 4326) not null,
  dropoff_label text not null,
  dropoff_point geography(Point, 4326) not null,
  vehicle_type_requested public.vehicle_type not null default 'sedan',
  passenger_count smallint not null default 1 check (passenger_count between 1 and 8),
  scheduled_pickup_at timestamptz,
  notes text,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_requires_pickup_time check (
    (type = 'scheduled' and scheduled_pickup_at is not null)
    or (type = 'now' and scheduled_pickup_at is null)
  )
);
create index bookings_rider_idx on public.bookings(rider_id, created_at desc);
create index bookings_status_idx on public.bookings(status, created_at desc);
create index bookings_scheduled_idx on public.bookings(scheduled_pickup_at)
  where status = 'pending' and type = 'scheduled';
create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- trips
-- ============================================================================
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  rider_id uuid not null references public.users(id) on delete restrict,
  driver_id uuid references public.driver_profiles(user_id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  status public.trip_status not null default 'requested',
  pickup_point geography(Point, 4326) not null,
  dropoff_point geography(Point, 4326) not null,
  pickup_address text not null,
  dropoff_address text not null,
  requested_at timestamptz not null default now(),
  assigned_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  cancelled_by public.trip_cancelled_by,
  estimated_fare_cents integer,
  final_fare_cents integer,
  distance_m integer,
  duration_s integer,
  route_polyline text,
  payment_status public.trip_payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_status_requested_idx on public.trips(status, requested_at);
create index trips_driver_status_idx on public.trips(driver_id, status);
create index trips_rider_idx on public.trips(rider_id, requested_at desc);
create unique index trips_one_active_per_driver
  on public.trips(driver_id)
  where driver_id is not null
    and status in ('assigned', 'driver_en_route', 'arrived_at_pickup', 'in_progress');
create trigger trg_trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ============================================================================
-- trip_offers
-- ============================================================================
create table public.trip_offers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(user_id) on delete cascade,
  sent_at timestamptz not null default now(),
  responds_by timestamptz not null,
  responded_at timestamptz,
  status public.offer_status not null default 'pending',
  pickup_eta_s integer,
  distance_to_pickup_m integer,
  created_at timestamptz not null default now()
);
create index trip_offers_trip_idx on public.trip_offers(trip_id);
create index trip_offers_driver_idx on public.trip_offers(driver_id, status);
-- at most one pending offer per trip at a time
create unique index trip_offers_one_pending_per_trip
  on public.trip_offers(trip_id)
  where status = 'pending';
-- a driver can only be offered the same trip once
create unique index trip_offers_unique_driver_trip
  on public.trip_offers(trip_id, driver_id);

-- ============================================================================
-- trip_locations — per-trip telemetry (monthly-partition friendly)
-- ============================================================================
create table public.trip_locations (
  id bigserial primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  point geography(Point, 4326) not null,
  speed_mps real,
  heading_deg real,
  accuracy_m real
);
create index trip_locations_trip_time_idx on public.trip_locations(trip_id, recorded_at);
create index trip_locations_point_gix on public.trip_locations using gist(point);

-- ============================================================================
-- fare_rules
-- ============================================================================
create table public.fare_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vehicle_type public.vehicle_type not null,
  base_cents integer not null default 0 check (base_cents >= 0),
  per_km_cents integer not null default 0 check (per_km_cents >= 0),
  per_min_cents integer not null default 0 check (per_min_cents >= 0),
  minimum_cents integer not null default 0 check (minimum_cents >= 0),
  booking_fee_cents integer not null default 0 check (booking_fee_cents >= 0),
  cancellation_fee_cents integer not null default 0 check (cancellation_fee_cents >= 0),
  night_surcharge_pct integer not null default 0 check (night_surcharge_pct between 0 and 100),
  airport_surcharge_cents integer not null default 0 check (airport_surcharge_cents >= 0),
  active_from timestamptz not null default now(),
  active_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index fare_rules_one_active_per_type
  on public.fare_rules(vehicle_type)
  where is_active = true;
create trigger trg_fare_rules_updated_at
  before update on public.fare_rules
  for each row execute function public.set_updated_at();

-- ============================================================================
-- fare_estimates — short-lived locked price
-- ============================================================================
create table public.fare_estimates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  rider_id uuid not null references public.users(id) on delete cascade,
  pickup_point geography(Point, 4326) not null,
  dropoff_point geography(Point, 4326) not null,
  vehicle_type public.vehicle_type not null,
  distance_m integer not null,
  duration_s integer not null,
  subtotal_cents integer not null,
  surcharges_cents integer not null default 0,
  total_cents integer not null,
  fare_rule_id uuid references public.fare_rules(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index fare_estimates_rider_idx on public.fare_estimates(rider_id, created_at desc);

-- ============================================================================
-- payments
-- ============================================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete restrict,
  rider_id uuid not null references public.users(id) on delete restrict,
  driver_id uuid references public.driver_profiles(user_id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'AUD',
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  stripe_destination_account text,
  application_fee_cents integer default 0,
  status public.payment_status not null default 'requires_action',
  failure_code text,
  failure_message text,
  captured_at timestamptz,
  refunded_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_status_idx on public.payments(status);
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ============================================================================
-- payouts
-- ============================================================================
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.driver_profiles(user_id) on delete set null,
  stripe_payout_id text not null unique,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'AUD',
  arrival_date date,
  status text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);
create index payouts_driver_idx on public.payouts(driver_id, created_at desc);

-- ============================================================================
-- driver_status — append-only shift records, plus a current view
-- ============================================================================
create table public.driver_status (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.driver_profiles(user_id) on delete cascade,
  status public.driver_status_kind not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_heartbeat_at timestamptz not null default now()
);
create index driver_status_driver_started_idx on public.driver_status(driver_id, started_at desc);
create unique index driver_status_one_open_per_driver
  on public.driver_status(driver_id)
  where ended_at is null;

create or replace view public.driver_status_current as
  select distinct on (driver_id)
    driver_id, id, status, vehicle_id, started_at, ended_at, last_heartbeat_at
  from public.driver_status
  where ended_at is null
  order by driver_id, started_at desc;

-- ============================================================================
-- driver_location_latest — single row per driver, hot path for dispatch
-- ============================================================================
create table public.driver_location_latest (
  driver_id uuid primary key references public.driver_profiles(user_id) on delete cascade,
  point geography(Point, 4326) not null,
  recorded_at timestamptz not null default now(),
  speed_mps real,
  heading_deg real,
  accuracy_m real
);
create index driver_location_latest_point_gix on public.driver_location_latest using gist(point);

-- ============================================================================
-- driver_location_history — only while on_trip
-- ============================================================================
create table public.driver_location_history (
  id bigserial primary key,
  driver_id uuid not null references public.driver_profiles(user_id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  recorded_at timestamptz not null default now(),
  point geography(Point, 4326) not null,
  speed_mps real,
  heading_deg real,
  accuracy_m real
);
create index driver_location_history_driver_idx on public.driver_location_history(driver_id, recorded_at desc);
create index driver_location_history_trip_idx on public.driver_location_history(trip_id, recorded_at);

-- ============================================================================
-- fatigue_sessions — shift / day grouping for fatigue accounting
-- ============================================================================
create table public.fatigue_sessions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.driver_profiles(user_id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  drive_time_s integer not null default 0 check (drive_time_s >= 0),
  online_time_s integer not null default 0 check (online_time_s >= 0),
  enforced_lockout boolean not null default false,
  lockout_until timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fatigue_sessions_driver_idx on public.fatigue_sessions(driver_id, started_at desc);
create unique index fatigue_sessions_one_open_per_driver
  on public.fatigue_sessions(driver_id)
  where ended_at is null;
create trigger trg_fatigue_sessions_updated_at
  before update on public.fatigue_sessions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- vehicle_inspections
-- ============================================================================
create table public.vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  inspection_type public.inspection_type not null default 'coi',
  performed_on date not null,
  performed_by text,
  result public.inspection_result not null,
  report_storage_path text,
  next_due_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicle_inspections_vehicle_idx on public.vehicle_inspections(vehicle_id, performed_on desc);
create index vehicle_inspections_due_idx on public.vehicle_inspections(next_due_on)
  where next_due_on is not null;
create trigger trg_vehicle_inspections_updated_at
  before update on public.vehicle_inspections
  for each row execute function public.set_updated_at();

-- ============================================================================
-- incident_reports
-- ============================================================================
create table public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid not null references public.users(id) on delete restrict,
  trip_id uuid references public.trips(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.driver_profiles(user_id) on delete set null,
  rider_id uuid references public.users(id) on delete set null,
  category public.incident_category not null,
  severity public.incident_severity not null default 'low',
  description text not null,
  occurred_at timestamptz not null default now(),
  location_point geography(Point, 4326),
  attachments jsonb not null default '[]'::jsonb,
  status public.incident_status not null default 'open',
  resolution_notes text,
  resolved_by uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index incident_reports_status_idx on public.incident_reports(status, occurred_at desc);
create index incident_reports_severity_idx on public.incident_reports(severity, status);
create trigger trg_incident_reports_updated_at
  before update on public.incident_reports
  for each row execute function public.set_updated_at();

-- ============================================================================
-- support_cases + messages
-- ============================================================================
create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  opened_by uuid not null references public.users(id) on delete restrict,
  subject_user_id uuid references public.users(id) on delete set null,
  linked_trip_id uuid references public.trips(id) on delete set null,
  linked_incident_id uuid references public.incident_reports(id) on delete set null,
  status public.support_case_status not null default 'open',
  priority public.support_case_priority not null default 'normal',
  assignee_id uuid references public.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_cases_status_idx on public.support_cases(status, last_message_at desc);
create index support_cases_assignee_idx on public.support_cases(assignee_id, status);
create trigger trg_support_cases_updated_at
  before update on public.support_cases
  for each row execute function public.set_updated_at();

create table public.support_case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  body text not null,
  internal boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index support_case_messages_case_idx on public.support_case_messages(case_id, created_at);

-- ============================================================================
-- audit_logs
-- ============================================================================
create table public.audit_logs (
  id bigserial primary key,
  actor_id uuid references public.users(id) on delete set null,
  actor_role public.user_role,
  action text not null,
  target_table text,
  target_id uuid,
  before jsonb,
  after jsonb,
  request_id text,
  ip inet,
  created_at timestamptz not null default now()
);
create index audit_logs_target_idx on public.audit_logs(target_table, target_id);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

-- ============================================================================
-- manual_overrides — subset of audit_logs, requires a reason
-- ============================================================================
create table public.manual_overrides (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete restrict,
  override_kind text not null,
  target_table text not null,
  target_id uuid not null,
  reason text not null check (length(reason) >= 5),
  details jsonb,
  created_at timestamptz not null default now()
);
create index manual_overrides_kind_idx on public.manual_overrides(override_kind, created_at desc);

-- ============================================================================
-- app_config — key/value store for the single operator's settings
-- ============================================================================
create table public.app_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);
create trigger trg_app_config_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

-- ============================================================================
-- compliance_rules — state-pluggable validity rules for documents
-- ============================================================================
create table public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'AU',
  state text,
  applies_to text not null check (applies_to in ('driver', 'vehicle')),
  doc_type text not null,
  is_required boolean not null default true,
  validity_window_days integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index compliance_rules_unique
  on public.compliance_rules(country, coalesce(state, ''), applies_to, doc_type);
create trigger trg_compliance_rules_updated_at
  before update on public.compliance_rules
  for each row execute function public.set_updated_at();

-- ============================================================================
-- notification_preferences
-- ============================================================================
create table public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  push_enabled boolean not null default true,
  sms_enabled boolean not null default true,
  email_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();
