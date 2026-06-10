## What

Brief description of the change.

## Why

Link the issue, ticket, or motivation. If user-facing, attach a screenshot or screen recording.

## How

Key implementation notes: any tricky decisions, new dependencies, schema changes.

## Verification

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] Manual test (describe what you exercised)
- [ ] New tables/columns have RLS policies and are in the RLS matrix
- [ ] New Edge Functions log to `audit_logs` for mutations
- [ ] Updated `CHANGELOG.md` if user-facing

## Compliance check

- [ ] Did this touch compliance code (RLS, audit, fatigue, documents)? If yes, explain the impact.
