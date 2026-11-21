# Demo guide

After `make reset`, the demo dataset includes:

| Account | Phone | Role |
|---|---|---|
| Admin (Riley Owner) | n/a | operator_owner (email login) |
| Dispatcher (Dani Disp) | n/a | dispatcher |
| Driver (Drew Driver) | +234 801 234 5678 | driver, approved |
| Driver (Daria Driver) | +234 801 234 5678  | driver, approved |
| Driver (Devin Driver) | +234 801 234 5678  | driver, pending_review |
| Rider (Rita Rider) | +234 801 234 5678 | rider |
| Rider (Roman Rider) | +234 801 234 5678  | rider |

Admin login: `admin@demo.openride` / `demo-password-change-me` (override in `OPERATOR_*` env vars; rotate immediately if you keep this seed).

## Driver developer test login

With local Supabase running, the Driver App accepts these configured test numbers:

-  (seeded approved driver)
- `+2348012345678` (local test driver; Auth creates the user on first sign-in)

Use OTP `123456` for either number. Supabase's local `[auth.sms.test_otp]`
configuration intercepts these numbers, so no SMS is sent. This test login
creates an Auth session but does not approve the driver; configured compliance,
vehicle, and fatigue checks still govern live actions. The separate **Dev
Bypass Login** remains a local UI simulation and does not create an Auth session.

For Expo Web development, Supabase Auth/REST/Functions are proxied through the
Expo origin at `/supabase` to local `127.0.0.1:54321`; native and production
builds continue to use `EXPO_PUBLIC_SUPABASE_URL`. Restart Expo after changing
`.env.local` or `metro.config.js` so the URL and dev proxy are reloaded.

The Driver App also subscribes to Supabase Realtime over WebSockets. The
development `/supabase` proxy is HTTP-only and does not proxy WebSocket
upgrades, so live Realtime updates are unavailable in the browser preview.
Initial data still loads over REST; use an explicit refresh or a native dev
client for flows that need Realtime. No additional port is exposed for WebSocket
traffic.

## Walkthrough

1. Open admin portal at http://localhost:3000 — log in as `admin@demo.openride`. You should see the dashboard with 3 drivers, 2 vehicles, 1 active fare rule.
2. Open rider app on a simulator. Sign in with `+61 400 000 020`. OTP in local dev: `123456` (Supabase Auth dev override; see `infra/supabase/config.toml`).
3. From the rider home, tap a saved place and request a ride.
4. In admin booking queue, the new booking appears. Click "Manual assign" → pick Drew Driver.
5. Open driver app, sign in with `+61 400 000 010`. Tap "Go online". The assigned trip appears.
6. Driver: Start → Complete. Rider receipt is generated.

## Demo data

See `packages/db/seeds/demo.sql` for the exact rows. To re-seed:

```bash
make reset   # wipes the DB, applies migrations, runs seed
```
