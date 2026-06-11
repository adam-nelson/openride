-- OpenRide demo seed.
-- Run automatically by `supabase db reset` (and via `make reset`).
-- Idempotent: safe to re-run.

-- ============================================================================
-- Operator
-- ============================================================================
insert into public.operators (id, name, legal_name, abn, contact_email, support_phone,
                              branding_primary_color, timezone, currency, country, state)
values
  ('00000000-0000-0000-0000-000000000001',
   'Ridge Co-op',
   'Ridge Cooperative Transport Pty Ltd',
   '12 345 678 901',
   'hello@demo.openride',
   '+61 2 5555 0100',
   '#1f6feb',
   'Australia/Sydney',
   'AUD',
   'AU',
   'NSW')
on conflict (id) do nothing;

-- ============================================================================
-- App config defaults
-- ============================================================================
insert into public.app_config (key, value, description) values
  ('dispatch.offer_timeout_s', '15'::jsonb, 'Seconds a driver has to respond to an offer'),
  ('dispatch.max_attempts', '5'::jsonb, 'Max consecutive offers before manual fallback'),
  ('dispatch.search_radius_m', '10000'::jsonb, 'Initial driver search radius in metres'),
  ('fatigue.max_drive_time_s', '43200'::jsonb, '12h hard cap on rolling drive time'),
  ('fatigue.rest_after_lockout_s', '36000'::jsonb, '10h required rest after lockout'),
  ('retention.trip_locations_days', '90'::jsonb, 'How long to keep raw GPS trail'),
  ('retention.records_years', '7'::jsonb, 'How long to keep trip/payment/incident records'),
  ('booking.scheduled_lookahead_min', '15'::jsonb, 'Promote scheduled trips this many minutes before pickup')
on conflict (key) do update set value = excluded.value;

-- ============================================================================
-- Compliance rules — AU baseline
-- ============================================================================
insert into public.compliance_rules (country, state, applies_to, doc_type, is_required, validity_window_days, notes) values
  ('AU', null, 'driver',  'licence_front', true, null, 'Australian driver licence — front'),
  ('AU', null, 'driver',  'licence_back',  true, null, 'Australian driver licence — back'),
  ('AU', null, 'driver',  'authority',     true, 365, 'Driver authority — typically renewed annually'),
  ('AU', null, 'driver',  'photo',         true, null, 'Recent ID photo'),
  ('AU', null, 'vehicle', 'ctp',           true, 365, 'Compulsory Third Party insurance'),
  ('AU', null, 'vehicle', 'insurance',     true, 365, 'Comprehensive insurance certificate'),
  ('AU', null, 'vehicle', 'authority',     true, 365, 'Vehicle authorisation / booked-hire licence'),
  ('AU', null, 'vehicle', 'coi',           true, 365, 'Certificate of Inspection')
on conflict (country, coalesce(state, ''), applies_to, doc_type) do update
  set is_required = excluded.is_required,
      validity_window_days = excluded.validity_window_days,
      notes = excluded.notes;

-- ============================================================================
-- Fare rules
-- ============================================================================
insert into public.fare_rules (id, name, vehicle_type, base_cents, per_km_cents, per_min_cents,
                               minimum_cents, booking_fee_cents, cancellation_fee_cents,
                               night_surcharge_pct, airport_surcharge_cents, is_active)
values
  ('11111111-1111-1111-1111-111111111101',
   'Sedan — standard', 'sedan', 350, 220, 65, 1200, 150, 800, 20, 500, true),
  ('11111111-1111-1111-1111-111111111102',
   'Wheelchair accessible — standard', 'wheelchair_accessible', 400, 250, 65, 1500, 0, 800, 20, 500, true)
on conflict (id) do nothing;

-- ============================================================================
-- Demo accounts
--
-- These insert directly into auth.users to keep the seed self-contained.
-- Passwords are bcrypt-hashed. Local-dev only — rotate before any real deploy.
-- ============================================================================

-- Helper: insert auth user idempotently
do $$
declare
  v_pwd text := crypt('demo-password-change-me', gen_salt('bf'));
begin
  -- Admin / operator owner
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000',
     '22222222-2222-2222-2222-222222222201',
     'authenticated', 'authenticated',
     'admin@demo.openride', v_pwd, now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"operator_owner","display_name":"Riley Owner"}'::jsonb,
     now(), now())
  on conflict (id) do nothing;

  -- Dispatcher
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000',
     '22222222-2222-2222-2222-222222222202',
     'authenticated', 'authenticated',
     'dispatcher@demo.openride', v_pwd, now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"dispatcher","display_name":"Dani Disp"}'::jsonb,
     now(), now())
  on conflict (id) do nothing;

  -- Drivers
  insert into auth.users (instance_id, id, aud, role, phone, encrypted_password,
                          phone_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000',
     '22222222-2222-2222-2222-222222222210',
     'authenticated', 'authenticated',
     '+61400000010', v_pwd, now(),
     '{"provider":"phone","providers":["phone"]}'::jsonb,
     '{"role":"driver","display_name":"Drew Driver"}'::jsonb,
     now(), now()),
    ('00000000-0000-0000-0000-000000000000',
     '22222222-2222-2222-2222-222222222211',
     'authenticated', 'authenticated',
     '+61400000011', v_pwd, now(),
     '{"provider":"phone","providers":["phone"]}'::jsonb,
     '{"role":"driver","display_name":"Daria Driver"}'::jsonb,
     now(), now()),
    ('00000000-0000-0000-0000-000000000000',
     '22222222-2222-2222-2222-222222222212',
     'authenticated', 'authenticated',
     '+61400000012', v_pwd, now(),
     '{"provider":"phone","providers":["phone"]}'::jsonb,
     '{"role":"driver","display_name":"Devin Driver"}'::jsonb,
     now(), now())
  on conflict (id) do nothing;

  -- Riders
  insert into auth.users (instance_id, id, aud, role, phone, encrypted_password,
                          phone_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000',
     '22222222-2222-2222-2222-222222222220',
     'authenticated', 'authenticated',
     '+61400000020', v_pwd, now(),
     '{"provider":"phone","providers":["phone"]}'::jsonb,
     '{"role":"rider","display_name":"Rita Rider"}'::jsonb,
     now(), now()),
    ('00000000-0000-0000-0000-000000000000',
     '22222222-2222-2222-2222-222222222221',
     'authenticated', 'authenticated',
     '+61400000021', v_pwd, now(),
     '{"provider":"phone","providers":["phone"]}'::jsonb,
     '{"role":"rider","display_name":"Roman Rider"}'::jsonb,
     now(), now())
  on conflict (id) do nothing;

  -- GoTrue (the auth server) scans these columns into Go strings on login and
  -- errors with "Database error querying schema" if any are NULL. Inserting
  -- auth.users rows directly via SQL leaves them NULL, so normalise to ''.
  update auth.users set
    confirmation_token         = coalesce(confirmation_token, ''),
    recovery_token             = coalesce(recovery_token, ''),
    email_change               = coalesce(email_change, ''),
    email_change_token_new     = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change               = coalesce(phone_change, ''),
    phone_change_token         = coalesce(phone_change_token, ''),
    reauthentication_token     = coalesce(reauthentication_token, '')
  where id in (
    '22222222-2222-2222-2222-222222222201',
    '22222222-2222-2222-2222-222222222202',
    '22222222-2222-2222-2222-222222222210',
    '22222222-2222-2222-2222-222222222211',
    '22222222-2222-2222-2222-222222222212',
    '22222222-2222-2222-2222-222222222220',
    '22222222-2222-2222-2222-222222222221'
  );
end $$;

-- The handle_new_auth_user trigger has already created the public.users + profile rows.
-- We still finalise role + display_name and approve the demo drivers.

update public.users set
  role = 'operator_owner', display_name = 'Riley Owner'
where id = '22222222-2222-2222-2222-222222222201';

update public.users set
  role = 'dispatcher', display_name = 'Dani Disp'
where id = '22222222-2222-2222-2222-222222222202';

-- Drivers + driver_profiles (ensure profile row exists; trigger may have created based on metadata)
insert into public.driver_profiles (user_id, status, licence_number, licence_class,
                                    licence_expiry, authority_number, authority_expiry)
values
  ('22222222-2222-2222-2222-222222222210', 'approved', 'DL10000010', 'C', current_date + interval '3 years', 'AUTH-2210', current_date + interval '11 months'),
  ('22222222-2222-2222-2222-222222222211', 'approved', 'DL10000011', 'C', current_date + interval '2 years', 'AUTH-2211', current_date + interval '8 months'),
  ('22222222-2222-2222-2222-222222222212', 'pending_review', 'DL10000012', 'C', current_date + interval '4 years', 'AUTH-2212', current_date + interval '6 months')
on conflict (user_id) do update set
  status = excluded.status,
  licence_number = excluded.licence_number,
  licence_class = excluded.licence_class,
  licence_expiry = excluded.licence_expiry,
  authority_number = excluded.authority_number,
  authority_expiry = excluded.authority_expiry;

update public.users set role = 'driver' where id in (
  '22222222-2222-2222-2222-222222222210',
  '22222222-2222-2222-2222-222222222211',
  '22222222-2222-2222-2222-222222222212'
);

-- Riders
insert into public.rider_profiles (user_id, home_label, home_point)
values
  ('22222222-2222-2222-2222-222222222220', 'Home — Newtown', st_setsrid(st_makepoint(151.179, -33.898), 4326)::geography),
  ('22222222-2222-2222-2222-222222222221', 'Home — Parramatta', st_setsrid(st_makepoint(151.003, -33.815), 4326)::geography)
on conflict (user_id) do update set home_label = excluded.home_label, home_point = excluded.home_point;

-- ============================================================================
-- Vehicles
-- ============================================================================
insert into public.vehicles (id, rego, make, model, year, color, vehicle_type, seat_capacity, fuel_type, status, default_driver_id)
values
  ('33333333-3333-3333-3333-333333333301', 'CAB-001', 'Toyota', 'Camry Hybrid', 2023, 'White',  'sedan', 4, 'hybrid', 'active', '22222222-2222-2222-2222-222222222210'),
  ('33333333-3333-3333-3333-333333333302', 'EV-002',  'BYD',    'Atto 3',       2024, 'Blue',   'sedan', 4, 'bev',    'active', '22222222-2222-2222-2222-222222222211'),
  ('33333333-3333-3333-3333-333333333303', 'WAV-003', 'Toyota', 'HiAce WAV',    2022, 'Silver', 'wheelchair_accessible', 6, 'diesel', 'active', null)
on conflict (id) do update set
  rego = excluded.rego,
  status = excluded.status;

-- Driver documents (all approved + future expiry)
insert into public.driver_documents (driver_id, doc_type, storage_path, issued_on, expires_on, status)
values
  ('22222222-2222-2222-2222-222222222210', 'licence_front', 'demo/drivers/2210/licence-front.jpg', current_date - interval '1 year', current_date + interval '3 years', 'approved'),
  ('22222222-2222-2222-2222-222222222210', 'licence_back',  'demo/drivers/2210/licence-back.jpg',  current_date - interval '1 year', current_date + interval '3 years', 'approved'),
  ('22222222-2222-2222-2222-222222222210', 'authority',     'demo/drivers/2210/authority.pdf',     current_date - interval '1 month', current_date + interval '11 months', 'approved'),
  ('22222222-2222-2222-2222-222222222210', 'photo',         'demo/drivers/2210/photo.jpg',         current_date - interval '1 month', null, 'approved'),
  ('22222222-2222-2222-2222-222222222211', 'licence_front', 'demo/drivers/2211/licence-front.jpg', current_date - interval '2 years', current_date + interval '2 years', 'approved'),
  ('22222222-2222-2222-2222-222222222211', 'licence_back',  'demo/drivers/2211/licence-back.jpg',  current_date - interval '2 years', current_date + interval '2 years', 'approved'),
  ('22222222-2222-2222-2222-222222222211', 'authority',     'demo/drivers/2211/authority.pdf',     current_date - interval '4 months', current_date + interval '8 months', 'approved'),
  ('22222222-2222-2222-2222-222222222211', 'photo',         'demo/drivers/2211/photo.jpg',         current_date - interval '4 months', null, 'approved')
on conflict do nothing;

-- Vehicle documents
insert into public.vehicle_documents (vehicle_id, doc_type, storage_path, issued_on, expires_on, status)
values
  ('33333333-3333-3333-3333-333333333301', 'ctp',       'demo/vehicles/3301/ctp.pdf',       current_date - interval '6 months', current_date + interval '6 months', 'approved'),
  ('33333333-3333-3333-3333-333333333301', 'insurance', 'demo/vehicles/3301/insurance.pdf', current_date - interval '6 months', current_date + interval '6 months', 'approved'),
  ('33333333-3333-3333-3333-333333333301', 'authority', 'demo/vehicles/3301/authority.pdf', current_date - interval '2 months', current_date + interval '10 months', 'approved'),
  ('33333333-3333-3333-3333-333333333301', 'coi',       'demo/vehicles/3301/coi.pdf',       current_date - interval '2 months', current_date + interval '10 months', 'approved'),
  ('33333333-3333-3333-3333-333333333302', 'ctp',       'demo/vehicles/3302/ctp.pdf',       current_date - interval '3 months', current_date + interval '9 months', 'approved'),
  ('33333333-3333-3333-3333-333333333302', 'insurance', 'demo/vehicles/3302/insurance.pdf', current_date - interval '3 months', current_date + interval '9 months', 'approved'),
  ('33333333-3333-3333-3333-333333333302', 'authority', 'demo/vehicles/3302/authority.pdf', current_date - interval '3 months', current_date + interval '9 months', 'approved'),
  ('33333333-3333-3333-3333-333333333302', 'coi',       'demo/vehicles/3302/coi.pdf',       current_date - interval '3 months', current_date + interval '9 months', 'approved')
on conflict do nothing;

-- Vehicle inspection records
insert into public.vehicle_inspections (vehicle_id, inspection_type, performed_on, performed_by, result, next_due_on)
values
  ('33333333-3333-3333-3333-333333333301', 'coi', current_date - interval '2 months', 'AAA Auto', 'pass', current_date + interval '10 months'),
  ('33333333-3333-3333-3333-333333333302', 'coi', current_date - interval '3 months', 'AAA Auto', 'pass', current_date + interval '9 months')
on conflict do nothing;

-- ============================================================================
-- A couple of historical trips for screenshotting
-- ============================================================================
insert into public.bookings (id, rider_id, type, pickup_label, pickup_point, dropoff_label, dropoff_point,
                             vehicle_type_requested, status, created_at)
values
  ('44444444-4444-4444-4444-444444444401',
   '22222222-2222-2222-2222-222222222220', 'now',
   'Home — Newtown', st_setsrid(st_makepoint(151.179, -33.898), 4326)::geography,
   'Sydney Airport T1', st_setsrid(st_makepoint(151.171, -33.936), 4326)::geography,
   'sedan', 'completed', now() - interval '3 days'),
  ('44444444-4444-4444-4444-444444444402',
   '22222222-2222-2222-2222-222222222221', 'now',
   'Parramatta Station', st_setsrid(st_makepoint(151.005, -33.817), 4326)::geography,
   'Westmead Hospital', st_setsrid(st_makepoint(150.989, -33.804), 4326)::geography,
   'wheelchair_accessible', 'completed', now() - interval '1 day')
on conflict (id) do nothing;

insert into public.trips (id, booking_id, rider_id, driver_id, vehicle_id, status,
                          pickup_point, dropoff_point, pickup_address, dropoff_address,
                          requested_at, assigned_at, started_at, completed_at,
                          estimated_fare_cents, final_fare_cents, distance_m, duration_s, payment_status)
values
  ('55555555-5555-5555-5555-555555555501',
   '44444444-4444-4444-4444-444444444401',
   '22222222-2222-2222-2222-222222222220',
   '22222222-2222-2222-2222-222222222210',
   '33333333-3333-3333-3333-333333333301',
   'completed',
   st_setsrid(st_makepoint(151.179, -33.898), 4326)::geography,
   st_setsrid(st_makepoint(151.171, -33.936), 4326)::geography,
   'Home — Newtown', 'Sydney Airport T1',
   now() - interval '3 days',
   now() - interval '3 days' + interval '2 minutes',
   now() - interval '3 days' + interval '8 minutes',
   now() - interval '3 days' + interval '32 minutes',
   3200, 3450, 9200, 1440, 'paid'),
  ('55555555-5555-5555-5555-555555555502',
   '44444444-4444-4444-4444-444444444402',
   '22222222-2222-2222-2222-222222222221',
   '22222222-2222-2222-2222-222222222211',
   '33333333-3333-3333-3333-333333333303',
   'completed',
   st_setsrid(st_makepoint(151.005, -33.817), 4326)::geography,
   st_setsrid(st_makepoint(150.989, -33.804), 4326)::geography,
   'Parramatta Station', 'Westmead Hospital',
   now() - interval '1 day',
   now() - interval '1 day' + interval '1 minute',
   now() - interval '1 day' + interval '4 minutes',
   now() - interval '1 day' + interval '14 minutes',
   1800, 1850, 2300, 540, 'paid')
on conflict (id) do nothing;
