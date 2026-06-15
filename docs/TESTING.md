# Testing

## Layers

| Layer | Where | Needs Supabase? | Run |
|---|---|---|---|
| Unit (pure logic) | `packages/domain/src/*.test.ts` | no | `pnpm --filter @openride/domain test` |
| RLS / security | `packages/testing/src/rls.test.ts` | yes (local stack) | see below |
| Dispatch simulation | `packages/testing/src/sim/run.ts` | no | `pnpm sim` |
| Lint / typecheck | all packages | no | `pnpm lint` · `pnpm typecheck` |

`pnpm test` runs every package's unit tests via Turborepo. The RLS suite **skips
gracefully** when Supabase isn't reachable, so `pnpm test` stays green without
infra; CI's `rls-security` job boots Supabase and runs it for real.

## Unit tests

Pure domain logic — fare calc, dispatch ranking, fatigue accumulation,
compliance evaluation. No IO, fast.

```bash
pnpm --filter @openride/domain test
```

## RLS / security suite

Authenticates as each demo role against a **running local Supabase** and asserts
the isolation guarantees (rider sees only their own trips, no role escalation,
audit logs are staff-only, drivers can't read each other, etc.).

```bash
pnpm db:start          # boot local Supabase + apply migrations + seed
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_ANON_KEY="$(supabase status --workdir infra -o env | grep '^ANON_KEY' | cut -d= -f2 | tr -d '"')"
pnpm --filter @openride/testing test
```

Add a new table? Add concrete isolation assertions here and update the
`rlsMatrix` documentation in `packages/testing/src/rls-matrix.ts`.

## Dispatch simulation

Deterministic, pure-domain Monte Carlo over the real ranking. Tune fleet size /
radius and read coverage metrics before touching the live engine.

```bash
pnpm sim
DRIVERS=50 REQUESTS=300 RADIUS_M=8000 pnpm sim
```

Reports assignment rate, manual-fallback rate, avg attempts per assignment, and
avg pickup distance.

## Payment test mode

Live Stripe paths require test keys. With `STRIPE_SECRET_KEY` (test) and
`STRIPE_WEBHOOK_SECRET` set and `stripe listen --forward-to
localhost:54321/functions/v1/stripe-webhook` running, exercise: add card
(Checkout setup) → complete a trip (capture) → refund. Without keys, payment
steps no-op gracefully (`stripe_unconfigured`).

## Not yet automated (roadmap)

- End-to-end: Playwright (admin) and Maestro (mobile golden paths).
- Edge-function integration tests (the curl flows used during development,
  codified).
