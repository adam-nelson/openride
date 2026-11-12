# ZoluRide

**ZoluRide is a Lagos driver-owned mobility platform.** It gives drivers a transparent alternative to commission-led ride-hailing: capped daily platform fees, ownership earned through completed trips, and a shared stabilisation fund, alongside rider booking and operator dispatch tools.

The product is built for Lagos streets and the people who keep them moving. Domain rules live in `packages/domain`, separate from the driver, rider, and admin interfaces.

## Driver Economics

All monetary amounts are represented in integer kobo throughout the domain engines.

| Engine | Rule |
| --- | --- |
| Daily Capped Subscription | Free below ₦4,000 gross for the day; ₦500 per ₦3,000 band thereafter, capped at ₦1,500 per day. |
| 750-Trip Ownership Vesting | Drivers vest from 0% to 100% across 150, 300, 500, and 750 completed-trip milestones. |
| Driver Stabilisation Fund | Up to ₦3,000 top-up for drivers with at least 10 online hours and 8 completed trips, when gross earnings are below ₦20,000. |
| Competitor Commission Comparison | Compares ZoluRide's capped fee with Uber's 25% and Bolt's 20% commissions. Percentage-based net amounts are rounded to integer kobo. |

## Quickstart

Prerequisites: Node.js 22 and pnpm 9.

```bash
pnpm install
pnpm --filter @openride/domain test
pnpm --dir apps/driver exec expo start --web
```

The domain test command runs the unit suite for subscription, vesting, stabilisation, competitor comparison, and the supporting fare, compliance, dispatch, fatigue, and money helpers. The driver app includes a development preview for trying the Home Screen, compliance records, incident reporting, and a simulated Lagos trip without a Supabase session.

### Optional Backend Setup

Start the local Supabase stack with `pnpm db:start`. The admin console can be started separately with `pnpm --filter @openride/admin dev`. Backend services are not required for the domain unit tests or the Driver App development preview.

For local demo data, the seeded admin account is `admin@demo.openride` with password `demo-password-change-me`. Local phone authentication uses the test OTP `123456`.

## Architecture

The rider, driver, and admin apps use Supabase for Postgres/PostGIS, authentication, realtime updates, storage, and Edge Functions. Stripe Connect handles payment flows, and Valhalla provides routing. Domain calculations remain in `packages/domain` so the business rules are shared by the apps.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design.

## Compliance

ZoluRide records driver and vehicle compliance information, including authorities, inspections, insurance, fatigue sessions, incidents, and audit history. Operators remain responsible for meeting the requirements that apply in their jurisdiction. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md) for the current compliance baseline and extension guidance.

## Platform Stack

- Driver and rider apps: Expo, React Native, and TypeScript
- Operator console: Next.js
- Backend: Supabase with Postgres, PostGIS, Auth, Realtime, Storage, and Edge Functions
- Payments: Stripe Connect
- Routing: Valhalla
- Domain tests: Vitest

See [docs/TESTING.md](docs/TESTING.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for test and operations details.

## Repository

```text
apps/        rider · driver · admin
packages/    db · domain · api-client · realtime · ui · config · testing
services/    ops · routing
infra/       Supabase · Docker
docs/        architecture · compliance · security · operations · demo
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). For security issues, follow [SECURITY.md](SECURITY.md) and report them privately rather than opening a public issue.

## Licence

[Apache-2.0](LICENSE).
