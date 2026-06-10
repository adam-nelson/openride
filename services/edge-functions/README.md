# Edge Functions (Deno)

Each subdirectory is one Supabase Edge Function. They live outside the TypeScript workspace because they target Deno, not Node.

## Run locally

```bash
# All functions
pnpm db:start                        # boots Supabase incl. functions runtime
supabase functions serve --workdir ../../infra/supabase

# Single function
supabase functions serve fare-estimate --workdir ../../infra/supabase
```

## Add a new function

1. `mkdir <name>` here.
2. Add `index.ts` with `Deno.serve(...)`.
3. Use helpers from `_shared/` for CORS, auth, and audit.
4. Reference the function from `packages/api-client` so apps don't `fetch` it directly.
5. Add an integration test under `packages/testing/`.
