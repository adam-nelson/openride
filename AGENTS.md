# AGENTS.md

## Cursor Cloud specific instructions

OpenRide is a pnpm + Turborepo monorepo. See `README.md` (Quick start) and
`docs/TESTING.md` for the canonical dev/test/build commands; this section only
captures the non-obvious, cloud-specific caveats.

### What runs where

- `apps/admin` — Next.js web console. This is the only app that can be run and
  tested end-to-end headlessly in the cloud VM (browser). Dev: `pnpm --filter @openride/admin dev` → http://localhost:3000.
- `apps/rider`, `apps/driver` — Expo/React Native. These need Expo Go or a
  device/simulator, so they cannot be fully exercised headlessly here. Lint /
  typecheck still run.
- Supabase local stack (`infra/supabase`) — Postgres+PostGIS, Auth, Realtime,
  Storage, and the Deno Edge Functions. This is the backend for all three apps.

### Startup (not handled by the update script)

The update script only refreshes JS deps (`pnpm install`). Services must be
started manually each session, in this order:

1. Docker daemon. There is no systemd in the VM, so start it in the background:
   `sudo dockerd > /tmp/dockerd.log 2>&1 &` then `sudo chmod 666 /var/run/docker.sock`
   (so the `supabase`/`docker` CLIs work without sudo). If Docker is not
   installed on a fresh VM, install Docker CE + `fuse-overlayfs`, set
   `/etc/docker/daemon.json` to `{"storage-driver":"fuse-overlayfs","features":{"containerd-snapshotter":false}}`,
   and switch iptables to legacy (`update-alternatives --set iptables /usr/sbin/iptables-legacy`).
2. Supabase: `pnpm db:start` (boots the stack, applies migrations + seed). Use
   `pnpm db:reset` to wipe and re-seed. First run pulls several GB of images and
   takes a few minutes.

### Non-obvious gotchas

- The `supabase` CLI is a devDependency, **not on PATH**. Run it via the
  `pnpm db:*` scripts or `pnpm exec supabase ...`.
- `supabase start`/`db reset` run `infra/supabase/seed.sql` and **roll back the
  entire stack if the seed fails** — a bad seed means no backend at all.
- Env files are per-app. The Next.js admin app reads `apps/admin/.env.local`
  (NOT the repo root `.env.local`): set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  and `NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>`. Get the anon key with
  `pnpm exec supabase status --workdir infra -o env | grep '^ANON_KEY'`. The
  local anon/service keys are the stable Supabase dev defaults.
- Demo admin login: `admin@demo.openride` / `demo-password-change-me`. Phone
  logins use the fixed OTP `123456` (see `[auth.sms.test_otp]` in
  `infra/supabase/config.toml`); no real Twilio needed locally.
- The RLS suite (`packages/testing`) **skips** if Supabase is unreachable, so
  `pnpm test` stays green without infra. To run it for real, boot Supabase and
  export `SUPABASE_URL` + `SUPABASE_ANON_KEY`, then
  `pnpm --filter @openride/testing test`.
- Stripe / Valhalla / Resend are optional locally: payment steps no-op
  (`stripe_unconfigured`) and routing/email degrade gracefully without keys.

### Multitenant (Phase 9) seed note

The multitenant migrations (`..._multitenant_*.sql`) added `operator_id` to
domain tables and made `app_config` keyed by `(operator_id, key)`. Any new rows
added to `infra/supabase/seed.sql` must stamp `operator_id` (default demo
operator `00000000-0000-0000-0000-000000000001`), or they will be invisible to
operator-scoped staff under RLS (and `app_config` inserts will fail outright).
