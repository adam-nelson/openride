# Local supporting services

Boot Postgres, Auth, Storage, Realtime, and Edge Functions via Supabase CLI:

```bash
pnpm db:start    # = supabase start --workdir infra/supabase
```

Then boot the extras (Valhalla routing, MailHog for outbound email) via Docker Compose:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Endpoints (local defaults):
- Supabase Studio: http://127.0.0.1:54323
- Supabase API:    http://127.0.0.1:54321
- Supabase DB:     postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Inbucket (auth): http://127.0.0.1:54324
- Valhalla:        http://127.0.0.1:8002
- MailHog:         http://127.0.0.1:8025

First Valhalla boot downloads the NSW OSM extract (~250 MB) and builds tiles. Allow 10–20 minutes the first time.
