# Deployment

OpenRide is a Supabase backend + a Next.js admin + two Expo apps. This is the
MVP deploy path; harden per your operator's security requirements.

## 1. Supabase (backend)

1. Create a project at supabase.com (or self-host). Note the project ref.
2. Link and push the schema:
   ```bash
   supabase link --project-ref <ref>
   supabase db push            # applies infra/supabase/migrations
   ```
3. Seed reference data (operator, fare rules, compliance rules) — adapt
   `infra/supabase/seed.sql`; do NOT ship the demo users/passwords to prod.
4. Deploy edge functions:
   ```bash
   supabase functions deploy --project-ref <ref>
   ```
5. Set function secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
   ```
6. **Realtime**: confirm the publication includes the trip/driver tables
   (migration `0005`).
7. **Crons**: pg_cron must be enabled (Supabase: Database → Extensions). The
   dispatch timeout sweep (`expire_stale_offers`) and `enforce_compliance` are
   registered best-effort by migrations `0006`/`0007`. For true auto-requeue on
   offer timeout, enable `pg_net` and schedule a job that POSTs the `dispatch`
   function (service-role key in a Vault secret) — see plan §7.
8. **Auth**: configure a real SMS provider (Twilio) for phone OTP and set the
   `site_url` / redirect URLs. Remove the local `[auth.sms.test_otp]` entries.

## 2. Admin portal (Next.js → Vercel)

1. Import `apps/admin` into Vercel (root directory `apps/admin`, it transpiles
   the workspace packages).
2. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy. Staff sign in with email + password (consider adding TOTP).

## 3. Mobile apps (Expo → EAS)

1. `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_MAPTILER_KEY`
   as EAS secrets / `eas.json` env.
2. `eas build --platform ios|android` and submit via `eas submit`.
3. Note: features that need native modules beyond Expo Go (maps, background
   location, native Stripe) require the dev/production client — already
   EAS-built, so they work in store builds. The rider live trip map uses
   `@maplibre/maplibre-react-native` with MapTiler tiles
   (`EXPO_PUBLIC_MAPTILER_KEY`); rebuild the rider client after adding that
   plugin.

## 4. Stripe

- Connect the platform account; create the webhook endpoint pointing at
  `<project>/functions/v1/stripe-webhook` and copy the signing secret into
  `STRIPE_WEBHOOK_SECRET`.
- Card-on-file uses hosted Checkout (setup mode) — no PCI surface in the apps.

## 5. Routing / tiles

- Valhalla: run the `services/routing` Docker image on a small VM (or use a
  hosted routing API) and point `VALHALLA_BASE_URL` at it.
- Map tiles: MapTiler hosted, or self-host Protomaps on object storage.

## Secrets checklist

`SUPABASE_SERVICE_ROLE_KEY` (functions only), `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `TWILIO_*`, `RESEND_API_KEY`, `MAPTILER_KEY`. Never ship
the demo password. Rotate anything that touched a local `.env`.

## Compliance & data

The operator remains the regulated entity (see `docs/COMPLIANCE.md`). Configure
retention jobs and back up `trips` / `payments` / `*_documents` / `audit_logs`
before any migration touching them.
