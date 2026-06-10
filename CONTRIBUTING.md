# Contributing to OpenRide

Thanks for considering a contribution. OpenRide aims to be a useful, self-hostable platform for small ride-booking operators, and that only works if the codebase stays approachable.

## Ground rules

- Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Discuss large changes in an issue before opening a PR.
- One logical change per PR; smaller is better.
- Treat compliance code (RLS, audit, fatigue, documents) as load-bearing. Don't disable it to make a test pass — fix the cause.

## Dev setup

See [README.md](README.md#quick-start-local-dev) for the prerequisites and first run.

## Branches & commits

- Base branch: `main`. PRs from feature branches: `feat/short-description`, `fix/short-description`, `chore/short-description`, `docs/short-description`.
- Conventional Commits format for commit messages, e.g. `feat(rider): add fare estimate screen`, `fix(dispatch): handle no candidates`. Type prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`.

## Quality bar before PR

```bash
pnpm lint
pnpm typecheck
pnpm test
```

All three must pass. CI will run them again.

## Adding a database migration

1. Add a new file under `packages/db/migrations/` named `NNNN_short_name.sql`. Numbers are monotonic.
2. Migrations must be reversible where possible — include `-- DOWN:` notes as a comment block.
3. After writing the migration:
   ```bash
   make reset       # re-apply from scratch + reseed
   make types       # regenerate packages/db/src/generated.ts
   ```
4. Update or add seed data in `packages/db/seeds/demo.sql` if new tables are introduced.
5. Add RLS policies in the same migration (or a follow-up `..._rls.sql`); never ship a table without RLS enabled.

## Adding an Edge Function

1. Create `services/edge-functions/<name>/index.ts`.
2. Use the shared helpers in `services/edge-functions/_shared/`.
3. Validate the JWT and role at the top. Re-check authorisation inside the function.
4. Log to `audit_logs` for any mutation a staff role performs.
5. Add an integration test under `packages/testing/`.

## Tests

- **Unit tests** for pure logic in `packages/domain` — Vitest.
- **Integration tests** for Edge Functions and DB — Vitest against the local Supabase.
- **RLS matrix** — every new table must be added to `packages/testing/src/rls-matrix.ts`.
- **E2E** — Playwright (admin), Maestro (mobile). Optional for trivial PRs but expected for new user-facing flows.

## Style

- TypeScript, `strict: true`.
- No raw SQL in apps — go through `packages/db` query functions or the PostgREST client.
- No raw `fetch` to Edge Functions in apps — go through `packages/api-client`.
- Money is always cents (integer). Distances are metres. Durations are seconds. Times are `Date` / ISO 8601 strings with timezone.
- snake_case for DB columns + Edge Function JSON; camelCase for TypeScript variables.

## Code of conduct

We follow the [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licence

By contributing, you agree your contribution is licensed under [Apache-2.0](LICENSE).
