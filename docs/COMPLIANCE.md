# Compliance

OpenRide is designed to **record** the data a ride-booking operator needs to demonstrate compliance. It does not absolve the operator of statutory obligations.

## Australia-generic baseline (v1)

OpenRide ships with a neutral schema covering the obligations common to NSW Point to Point, Victoria CPV, Queensland PCS, and WA OPT regulators:

| Concern | Modelled as |
|---|---|
| Driver authorisation | `driver_profiles.authority_number/expiry` + `driver_documents (type='authority')` |
| Driver licence | `driver_profiles.licence_*` + `driver_documents (type='licence_front'/'licence_back')` |
| Driver medical | `driver_documents (type='medical_cert')` |
| Vehicle authorisation | `vehicle_documents (type='authority')` |
| CTP / insurance | `vehicle_documents (type='ctp'/'insurance')` |
| Certificate of Inspection | `vehicle_documents (type='coi')` + `vehicle_inspections` |
| Fatigue | `fatigue_sessions` with rolling-24h cap |
| Incident reports | `incident_reports` with severity routing |
| Audit trail | `audit_logs` + DB triggers on sensitive tables |
| Manual override | `manual_overrides` (subset of audit, requires `reason`) |

State-specific document validity rules live in the `compliance_rules` config table, not hard-coded.

## Adding a state rule pack

1. Insert rows into `compliance_rules` describing required documents and their validity windows for that state.
2. Add a Vitest case under `packages/testing/src/compliance/` asserting the rules.
3. Reference the regulator source (e.g. NSW P2P Act 2016) in a comment.

## Data retention defaults

| Data | Default retention | Rationale |
|---|---|---|
| Trip records | 7 years | Tax + regulator audit windows |
| Payment records | 7 years | ATO + Stripe |
| Incident reports | 7 years | Statutory limitation periods |
| Audit logs | 7 years | Same as records they describe |
| Raw `trip_locations` telemetry | 90 days | PII minimisation; receipt route stored separately |
| Rider PII (on opt-out) | Anonymised within 30 days | Consumer rights |

Configurable via `app_config` keys `retention.*`.

## What OpenRide does **not** do

- File regulator returns.
- Issue driver authorities or vehicle inspections — only records them.
- Replace your insurer's reporting.
- Provide legal advice on compliance.

The operator remains the regulated entity.
