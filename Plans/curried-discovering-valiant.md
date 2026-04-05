# OILTRAC v1 Build Plan

## Context

Building OILTRAC — a self-hosted oil tanker intelligence dashboard with Globe.gl visualization, real-time data pipelines, and military ops center aesthetic. Bun runtime, Hono server, bun:sqlite, single-file frontend. No auth (Tailscale-only). Must work immediately with seed data, no API keys required.

## Build Order

### Batch 0: Scaffold (sequential)
- Create directory structure: `oiltrac/src/pipeline/`, `oiltrac/public/`, `oiltrac/data/`
- Run `bun init -y && bun add hono node-cron` in oiltrac/
- Create `data/.gitkeep`

### Batch 1: Foundation (parallel, 3 agents)
- **Agent A**: `src/types.ts` — all TypeScript interfaces matching DB schema + API types
- **Agent B**: `.env.example` — all API keys and config
- **Agent C**: `README.md` — project overview, setup, API docs

### Batch 2: Data Layer + Frontend Start (parallel, 3 agents)
- **Agent D**: `src/db.ts` — schema creation, WAL mode, all query functions, seed data (30 tankers, 12 ports, 5 chokepoints, crisis prices)
- **Agent E**: `src/pipeline/*.ts` (5 files) — all fetcher modules with graceful no-op on missing keys
- **Agent H**: `public/index.html` — full frontend (can start once types.ts API contract is known)

### Batch 3: Wiring (parallel, 2 agents)
- **Agent F**: `src/scheduler.ts` — cron jobs wiring pipeline to db
- **Agent G**: `src/server.ts` — Hono routes, static serving, startup sequence

### Batch 4: Verify
- Run `bun run src/server.ts`, verify all endpoints return data
- Check frontend loads in browser

## Critical Files
- `/home/pi/Projects/oil/oiltrac/src/types.ts` — blocks everything
- `/home/pi/Projects/oil/oiltrac/src/db.ts` — all data access, largest backend file
- `/home/pi/Projects/oil/oiltrac/public/index.html` — entire frontend (~1200 lines)
- `/home/pi/Projects/oil/oiltrac/src/server.ts` — entry point, wires everything

## Key Decisions
1. All SQL in db.ts only — no ORM, parameterized queries
2. SQLite WAL mode for concurrent read/write
3. Pipeline modules gracefully skip if API key missing
4. Seed data makes app visually impressive without any API keys
5. Frontend: Globe.gl CDN, no build step, all inline CSS/JS
6. CSV export via server-side `/api/export/vessels.csv` endpoint
7. Military aesthetic: #050a0f bg, amber #f5a623, green #00e676, red #ff1744

## Verification
1. `bun run src/server.ts` starts without errors
2. `curl localhost:3000/api/vessels` returns 30 seeded tankers
3. `curl localhost:3000/api/ports` returns 12 ports
4. `curl localhost:3000/api/prices/latest` returns crisis prices
5. Browser at localhost:3000 shows globe with vessel dots, route arcs, port markers
6. Search filters vessels, timeline slider works, CSV downloads
