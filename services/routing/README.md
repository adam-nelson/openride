# Routing — Valhalla

We use Valhalla for turn-by-turn directions, ETAs, and distance matrix lookups. Hosted via the `gis-ops/docker-valhalla` image in `infra/docker/docker-compose.yml`.

## Switching regions

Set `tile_urls` in the compose file to a Geofabrik extract URL covering your operator's service area. First boot downloads + builds tiles (slow); subsequent boots reuse the `valhalla-data` volume.

## Caching layer (later)

Phase 4 adds an in-process LRU around route calls keyed by `(origin_h3, dest_h3, hour)` so the dispatch loop doesn't hammer Valhalla for similar pickups.

## Alternatives

- **OSRM**: faster startup, no traffic awareness, simpler API.
- **Mapbox Directions** / **Google Routes**: paid, accurate traffic ETAs.
