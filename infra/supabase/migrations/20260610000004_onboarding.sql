-- Track whether a user has completed basic profile onboarding (set their name).
-- display_name defaults to the phone number via handle_new_auth_user(), so it
-- can't signal completion on its own; this explicit flag gates the profile step.

alter table public.users
  add column if not exists onboarding_completed_at timestamptz;
