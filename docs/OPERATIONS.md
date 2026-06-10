# Operations runbook

> Placeholder. Expand as the platform moves toward production.

## Local dev

See [README.md](../README.md#quick-start-local-dev).

## Staging deploy

TBD.

## Production deploy

TBD.

## Incident response

1. Page on-call via the runbook escalation policy (TBD).
2. Acknowledge in the comms channel within 5 minutes.
3. Triage: rider-facing? driver-facing? compliance-impacting?
4. Mitigate before fixing. Communicate status updates every 15 minutes.
5. Post-mortem within 5 business days for SEV-2 or worse.

## Backups & restore

- Supabase Pro: daily backups + PITR.
- Manual checkpoint before any migration touching `trips`, `payments`, or `*_documents`:
  ```bash
  supabase db dump -f backups/pre-migration-$(date +%F).sql
  ```
- Restore: `psql "$DATABASE_URL" -f <file>` in a maintenance window.

## Common runbooks

- Stripe webhook backlog → see `services/ops/runbooks/stripe-webhook-backlog.md` (TBD).
- Realtime disconnect storm → see `services/ops/runbooks/realtime-disconnect.md` (TBD).
- Driver fatigue lockout dispute → admin override (`/admin/dispatch/manual-assign` requires reason); see audit log entry.
