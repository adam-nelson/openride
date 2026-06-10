# Demo guide

After `make reset`, the demo dataset includes:

| Account | Phone | Role |
|---|---|---|
| Admin (Riley Owner) | n/a | operator_owner (email login) |
| Dispatcher (Dani Disp) | n/a | dispatcher |
| Driver (Drew Driver) | +61 400 000 010 | driver, approved |
| Driver (Daria Driver) | +61 400 000 011 | driver, approved |
| Driver (Devin Driver) | +61 400 000 012 | driver, pending_review |
| Rider (Rita Rider) | +61 400 000 020 | rider |
| Rider (Roman Rider) | +61 400 000 021 | rider |

Admin login: `admin@demo.openride` / `demo-password-change-me` (override in `OPERATOR_*` env vars; rotate immediately if you keep this seed).

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
