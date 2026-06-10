# Architecture

This document summarises the system shape. The full design rationale is in the plan file at `/Users/adam/.claude/plans/you-are-acting-as-starry-starfish.md`.

## High-level diagram

```
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│  Rider app   │   │  Driver app  │   │   Admin portal   │
│  (Expo RN)   │   │  (Expo RN)   │   │    (Next.js)     │
└──────┬───────┘   └──────┬───────┘   └────────┬─────────┘
       │ HTTPS+WSS        │ HTTPS+WSS          │ HTTPS+WSS
       └──────────────────┼────────────────────┘
                          │
              ┌───────────▼────────────┐
              │  Supabase              │
              │  ├─ Postgres + PostGIS │
              │  ├─ Auth (phone OTP)   │
              │  ├─ Realtime           │
              │  ├─ Storage (docs)     │
              │  └─ Edge Functions     │
              └───┬────────────┬───────┘
                  │            │
       ┌──────────▼──┐   ┌─────▼────────┐
       │   Stripe    │   │  Valhalla    │
       │   Connect   │   │  (Docker)    │
       └─────────────┘   └──────────────┘
                  │
              ┌───▼────────┐
              │  Twilio    │
              │  Expo Push │
              │  Resend    │
              └────────────┘
```

## Boundaries

- **Mobile apps** are presentation + thin client logic. No business rules.
- **Edge Functions** orchestrate writes that involve more than one table or external service.
- **PostgREST** is fine for simple CRUD when RLS suffices.
- **Database** is the source of truth — triggers and constraints enforce invariants even if a client misbehaves.

## Realtime channels

- `driver:{id}` — per-driver, used for offers and driver-targeted notifications.
- `trip:{id}` — per-trip, subscribed by rider, driver, dispatcher.
- `dispatch:queue` — admin-only, all active trips.
- `presence:online_drivers` — admin-only, live driver locations.

State transitions go through `postgres_changes` (durable). Ephemeral location updates go through `broadcast` (lossy, cheap).

## Data shape

See `packages/db/migrations/0001_init.sql` for the full schema, and the plan file §5 for the rationale.

Key tables: `users`, `rider_profiles`, `driver_profiles`, `vehicles`, `bookings`, `trips`, `trip_offers`, `trip_locations`, `driver_status`, `driver_location_latest`, `driver_location_history`, `fare_rules`, `payments`, `driver_documents`, `vehicle_documents`, `vehicle_inspections`, `fatigue_sessions`, `incident_reports`, `support_cases`, `audit_logs`.

## Single-tenant for v1

There is no `operator_id` column in v1. Operator settings live in `app_config`. Multi-tenant retrofit is a Phase 9 migration — all writes go through `packages/db` query functions so that retrofit is one diff, not a hundred.

## Where to extend

- New compliance document type → add to the `doc_type` enum in a migration, add to `compliance_rules` config.
- New vehicle category → add to `vehicle_type` enum + a new `fare_rules` row.
- New dispatch strategy → swap `services/edge-functions/dispatch/index.ts`; pure ranking lives in `packages/domain/src/dispatch.ts`.
- New realtime event → add to `packages/realtime/src/events.ts` (the canonical event registry).
