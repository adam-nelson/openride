# OpenRide

> Open-source ride-booking & dispatch platform for regional operators, driver cooperatives, EV fleets, booked-hire services, and community transport.

[![CI](https://img.shields.io/badge/ci-pending-lightgrey)](#)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

## Why this exists

Commercial ride-hailing platforms are not built for small operators, cooperatives, or community transport. They charge per-trip commissions, lock you into their terms, and don't model compliance the way regulators expect. OpenRide is a self-hostable alternative that respects transport compliance from day 1 (driver authorities, vehicle inspections, CTP, fatigue, incident logging) and gives operators control of their fleet, fares, and data.

This is the MVP scaffold. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the system design and the plan file at `/Users/adam/.claude/plans/you-are-acting-as-starry-starfish.md` for full scope.

## Status

**MVP feature-complete (single-operator).** End-to-end loop works: rider signup → book → automatic dispatch → driver accept & drive → complete → payment → receipt, with an operator console, compliance + fatigue enforcement, and incident reporting. Payments verify against Stripe test keys; multi-operator (Phase 9) is the next milestone. See [docs/TESTING.md](docs/TESTING.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Quick start (local dev)

Prereqs: Node 22, pnpm 9, Docker, the [Supabase CLI](https://supabase.com/docs/guides/cli), and (for mobile) the [Expo CLI](https://docs.expo.dev/get-started/installation/).

```bash
# Clone
git clone https://github.com/your-org/openride.git
cd openride

# Install
     pnpm install

# Copy env template
cp .env.example .env.local

# Start local Supabase (Postgres + PostGIS + Auth + Storage + Realtime)
make up

# Apply migrations + seed demo data
make reset

# Generate typed DB client
make types

# Run all apps in parallel
pnpm dev
```

Then:

- Admin portal: http://localhost:3000
- Rider app: scan QR from `apps/rider` (Expo Go) or open `i`/`a`
  - **Live trip map** (MapLibre + MapTiler tiles) requires a custom Expo
    development / EAS build — MapLibre is not available in Expo Go. Address
    search still works in Expo Go when `EXPO_PUBLIC_MAPTILER_KEY` is set.
- Driver app: scan QR from `apps/driver`

Demo accounts (after `make reset`):

- Admin: `admin@demo.openride` / `demo-password-change-me`
- Rider, Driver: phone numbers in `packages/db/seeds/demo.sql`

## Architecture

```
Rider app (Expo)     Driver app (Expo)     Admin portal (Next.js)
                            |
                       Supabase
        (Postgres+PostGIS, Auth, Realtime, Storage, Edge Functions)
                            |
                Stripe Connect       Valhalla        Twilio / Expo Push
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.

## Compliance scope

OpenRide stores the **records** an operator needs to demonstrate compliance: driver authorities, vehicle inspections, CTP/insurance documents with expiry tracking, fatigue sessions, incident reports, audit trails, manual override logs.

**The operator remains the regulated entity.** Hosting OpenRide does not transfer or absolve any statutory obligation. See [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) for the AU-generic baseline and how to add state-specific rule packs.

## Stack

| Layer     | Choice                                                                         |
| --------- | ------------------------------------------------------------------------------ |
| Mobile    | Expo SDK 56 (React Native 0.86, React 19), TypeScript                          |
| Web admin | Next.js 16 App Router, React 19, Tailwind                                      |
| Backend   | Supabase (Postgres 15 + PostGIS, Auth, Realtime, Storage, Edge Functions/Deno) |
| Realtime  | Supabase Realtime (broadcast + postgres_changes)                               |
| Maps      | MapLibre GL Native + MapLibre GL JS                                            |
| Tiles     | MapTiler (dev) / Protomaps (self-host prod)                                    |
| Routing   | Valhalla (Docker)                                                              |
| Payments  | Stripe Connect Express                                                         |
| SMS / OTP | Twilio (via Supabase Auth)                                                     |
| Push      | Expo Push (FCM / APNs)                                                         |
| Email     | Resend                                                                         |
| Tests     | Vitest, Playwright, Maestro                                                    |

## Repository layout

```
apps/        rider · driver · admin
packages/    db · domain · api-client · realtime · ui · config · testing
services/    edge-functions · routing · ops
infra/       supabase · docker
docs/        ARCHITECTURE · COMPLIANCE · SECURITY · OPERATIONS · DEMO
```

## Roadmap

- [x] Phase 0 — Repo & architecture scaffold
- [x] Phase 1 — Auth & DB
- [x] Phase 2 — Rider booking flow
- [x] Phase 3 — Driver online & offers
- [x] Phase 4 — Dispatch engine
- [x] Phase 5 — Admin portal
- [x] Phase 6 — Payments & receipts
- [x] Phase 7 — Compliance & fatigue
- [x] Phase 8 — Test, deploy, docs (RLS suite, dispatch sim, CI, deploy guide; E2E pending)
- [ ] Phase 9+ — Multi-operator

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

## Security

Report security issues privately per [SECURITY.md](SECURITY.md). Please do not open public issues for vulnerabilities.

## Licence

[Apache-2.0](LICENSE). © OpenRide contributors.
