<p align="center">
  <img src="https://img.shields.io/badge/🛢️_OILTRAC-Global_Oil_Intelligence-f5a623?style=for-the-badge&labelColor=050a0f" alt="OILTRAC" />
</p>

<h1 align="center">🌍 OILTRAC</h1>

<p align="center">
  <strong>Real-Time Global Oil Tanker Intelligence Platform</strong>
</p>

<p align="center">
  <a href="https://oil.nixfred.tech">🔗 oil.nixfred.tech</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/runtime-Bun_1.3-f472b6?style=flat-square&logo=bun&logoColor=white" />
  <img src="https://img.shields.io/badge/server-Hono-e36002?style=flat-square&logo=hono&logoColor=white" />
  <img src="https://img.shields.io/badge/database-SQLite_(WAL)-003b57?style=flat-square&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/visualization-Globe.gl-00e676?style=flat-square" />
  <img src="https://img.shields.io/badge/version-2.0-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
</p>

---

## 🛰️ What is OILTRAC?

OILTRAC is a **self-hosted oil tanker intelligence dashboard** that tracks global crude oil movements, chokepoint disruptions, energy prices, sanctions, refinery utilization, and storage levels — all visualized on a stunning 3D interactive globe.

Think Bloomberg Terminal meets military situation room, but for global oil logistics.

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🚢  30+ tankers as SVG icons with heading and zoom scaling    ║
║   ⚓  12 major oil ports with hover details                     ║
║   🚧  5 strategic chokepoints with pulsing status rings         ║
║   📈  7 energy prices with day-over-day % change                ║
║   🛢️  Regional crude storage and days-of-supply estimates       ║
║   🚨  Automated alerts for disruptions and anomalies             ║
║   🟣  OFAC sanctions overlay with magenta vessel flagging       ║
║   🔄  Cargo flow aggregation across global trade routes          ║
║   ⛽  8 major refinery utilization tracking                      ║
║   📊  Pump price forecast with crude-to-retail lag model         ║
║   📉  Port congestion history with trend indicators              ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 🖥️ Screenshots

> *A blue-ocean 3D globe with green/red SVG tanker icons, amber port labels, pulsing chokepoint rings, and solid/dotted route trails. Wide side panels show fleet status, cargo flows, chokepoints, energy prices, forecasts, refineries, and storage data.*

---

## ✨ Features

### 🌐 Interactive 3D Globe
- **SVG tanker icons** — Ship-shaped markers colored by status: 🟢 green (underway/ballast), 🔴 red (stranded/anchor/dark), 🟣 magenta (sanctioned)
- **Route trails** — Solid lines where ships have been, dotted lines where they're going, colored by vessel status
- **Port markers** — Amber dots with labels, hover for details (country, capacity, ships inbound, storage %)
- **Chokepoint rings** — Pulsing rings colored by status (green open, amber degraded, red closed)
- **Refinery markers** — Color-coded by utilization (green >85%, amber >70%, red <70%)
- **Zoom controls** — `+`/`−` buttons with smooth animation, all labels scale with zoom
- **Blue marble texture** — Clearly visible ocean vs land

### 🚢 Vessel Intelligence
- **30 seed tankers** across 5 vessel classes (VLCC, Suezmax, Aframax, LNG, Product)
- **Cargo estimation** — Derived from draught ratio × class DWT capacity
- **Status tracking** — Underway, anchor, stranded, ballast, dark/AIS-off
- **Hover tooltips** — Anchored next to the icon showing MMSI, status, speed, type, cargo, destination
- **Click detail popup** — Full vessel info with fly-to animation

### 🟣 Sanctions Overlay
- **OFAC SDN list** — Daily fetch from US Treasury sanctions database (free, public)
- **Cross-reference** — Matches vessels by name and MMSI against sanctioned entities
- **Visual flagging** — Sanctioned vessels render in magenta on the globe
- **Alert integration** — Sanctions matches appear in the alert banner

### 🔄 Cargo Flow Aggregation
- **Regional trade flows** — Gulf→Asia, Med→North Sea, USGC→EU, and more
- **Volume tracking** — Vessel count and total barrels per flow route
- **Computed from data** — No additional API needed, derived from vessel positions and destinations

### ⛽ Refinery Status
- **8 major refineries** — Port Arthur, Baytown, Garyville, Jamnagar, Ruwais, Rotterdam, Singapore Jurong, Ulsan
- **Utilization tracking** — % capacity with color-coded progress bars
- **EIA data pipeline** — Weekly US refinery utilization from EIA API
- **Globe markers** — Visible on the globe with color by utilization level

### 📊 Price Forecast
- **Lag-adjusted model** — Crude price changes take 2-4 weeks to hit retail gas
- **Three forecasts** — US average gas, California gas, EU gas
- **Confidence indicator** — High/medium/low based on available data depth
- **Crude trend** — Rising, falling, or stable with weekly slope calculation

### 📉 Port Congestion
- **Trend indicators** — Each port shows up/down/stable trend vs 3 days ago
- **90-day history** — Ships inbound, barrels inbound, storage % over time
- **Per-port API** — `/api/ports/:code/history` for detailed snapshots

### 🔍 Search & Filter
- Search vessels by name, MMSI, or destination
- Non-matching vessels dim to 20% opacity
- Single match triggers fly-to animation with smooth camera move

### ⏱️ Timeline Replay
- Drag the timeline slider to replay vessel positions for any stored date
- Watch fleet movements evolve day-by-day during crisis events
- LIVE mode button to return to current data

### 🚨 Alert System
- **Chokepoint disruptions** — Automatic alerts when throughput drops below thresholds
- **Dark fleet detection** — Flags vessels with AIS transponders off > 48 hours
- **Price spikes** — Triggers when Brent crosses $110 level
- **Sanctions matches** — Alerts when sanctioned vessels are detected
- **Pulsing banner** — Red/amber animated alert bar at top of screen

### 📊 Intelligence Panels

| Panel | Data |
|-------|------|
| **Fleet Summary** | Total vessels, status breakdown, barrels in transit, flagged vessel list |
| **Chokepoints** | Status badges, % of normal throughput, vessel count, progress bars |
| **Cargo Flows** | Regional trade routes with vessel count and barrel volume |
| **Energy Prices** | Brent, WTI, natural gas, US/CA/EU/Singapore gas with % change |
| **Price Forecast** | 2-4 week retail gas predictions with confidence level |
| **Storage & Supply** | Regional crude storage, days of supply, capacity bars |
| **Refinery Status** | 8 refineries with utilization % and capacity |
| **Live Ticker** | Scrolling feed of prices, fleet stats, chokepoint status |

### 📥 Data Export
- CSV download for vessels and prices
- Perfect for pulling into Excel, Python, or Tableau

### 📱 Responsive Design
- **Desktop** — Three-column layout: 420px panels + globe
- **Tablet (<1200px)** — Single column, panels wrap horizontally
- **Mobile (<768px)** — Globe on top, stacked panels, compact header
- **Small mobile (<480px)** — Reduced globe, 2-column stats, hidden clock

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.3+ (`curl -fsSL https://bun.sh/install | bash`)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/nixfred/oiltrac.git
cd oiltrac

# Install dependencies
bun install

# Copy environment config
cp .env.example .env

# Launch 🚀
bun run src/server.ts
```

Open **http://localhost:3000** — the app works immediately with built-in seed data. No API keys required for the demo.

---

## 🔑 API Keys

OILTRAC uses 4 free API keys for live data. **All are optional** — the app runs fully on seed data without any keys. Each pipeline gracefully skips when its key is missing.

### Getting Your Keys

| # | API | What It Powers | Free Tier | How to Get |
|---|-----|---------------|-----------|------------|
| 1 | **EIA** (US Energy Information Administration) | US petroleum inventories, retail gas prices, refinery utilization | Unlimited requests | [Register here](https://www.eia.gov/opendata/register.php) — instant approval, key emailed immediately |
| 2 | **FRED** (Federal Reserve Bank of St. Louis) | Brent crude, WTI crude, natural gas prices | 120 requests/min | [Request key here](https://fred.stlouisfed.org/docs/api/api_key.html) — instant approval after free account creation |
| 3 | **AGSI+** (Gas Infrastructure Europe) | European gas storage levels (% full, injection/withdrawal) | Free with registration | [Create account here](https://agsi.gie.eu/account) — key shown on account page, never expires |
| 4 | **AISHub** | Real-time vessel AIS positions (tanker tracking) | ~100 req/day, ~500 vessels/call | [Join here](https://www.aishub.net/join) — requires sharing an AIS receiver or requesting free access |

### Adding Keys to Your Installation

Edit `.env` in the project root:

```env
# Required for live crude oil and natural gas prices
# Sign up: https://fred.stlouisfed.org/docs/api/api_key.html
FRED_API_KEY=your_fred_api_key

# Required for US gas prices, petroleum inventories, refinery utilization
# Sign up: https://www.eia.gov/opendata/register.php
EIA_API_KEY=your_eia_api_key

# Required for European gas storage data
# Sign up: https://agsi.gie.eu/account
# Uses x-key header authentication (not query param)
AGSI_API_KEY=your_agsi_api_key

# Required for real-time vessel AIS positions
# Sign up: https://www.aishub.net/join
AIS_HUB_KEY=your_aishub_username

# Server config
PORT=3000
DB_PATH=./data/oiltrac.db
LOG_LEVEL=info
```

After adding keys, restart the server or rebuild the Docker container. Pipelines will automatically start fetching on their next scheduled run.

### What Each Key Unlocks

| Without Keys | With Keys |
|-------------|-----------|
| 30 seed tankers with 5 days of history | Real-time vessel positions from AIS network |
| Static crisis-level prices | Live Brent, WTI, natural gas updated 2x daily |
| Seed gas prices | Live US/CA retail gas prices from EIA |
| Seed storage levels | Live EU gas storage from AGSI+ |
| Seed refinery utilization | Live US refinery utilization from EIA |
| OFAC sanctions (always free, no key needed) | Same — OFAC SDN list is public data |

---

## 🏗️ Architecture

```
oiltrac/
├── src/
│   ├── server.ts            # Hono HTTP server — 20+ API endpoints + static files
│   ├── db.ts                # bun:sqlite — 8 tables, queries, seed data
│   ├── scheduler.ts         # node-cron — 7 pipeline jobs (1-2x daily each)
│   ├── types.ts             # Shared TypeScript interfaces
│   └── pipeline/
│       ├── ais.ts           # AISHub vessel position fetcher
│       ├── eia.ts           # EIA petroleum inventory fetcher
│       ├── prices.ts        # FRED API — Brent/WTI/natural gas prices
│       ├── gas.ts           # EIA retail gas prices
│       ├── agsi.ts          # AGSI+ EU gas storage
│       ├── sanctions.ts     # OFAC SDN sanctions list (free, no key)
│       └── refineries.ts    # EIA refinery utilization
├── public/
│   ├── index.html           # Full frontend — Globe.gl + all UI (~2200 lines)
│   ├── favicon.png          # Amber globe + oil drop icon
│   └── og-image.png         # X.com / Open Graph share image
├── data/
│   └── oiltrac.db           # SQLite database (auto-created)
├── Dockerfile               # Bun 1.3 Alpine production image
├── docker-compose.yml       # Docker Compose with Traefik labels
├── .env.example
└── package.json
```

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Bun 1.3 | Fastest JS runtime, native SQLite, no bundler needed |
| **Server** | Hono | Ultrafast web framework, 14KB, perfect for APIs |
| **Database** | bun:sqlite (WAL) | Zero-dependency, embedded, handles concurrent reads |
| **Scheduler** | node-cron | Reliable cron scheduling for 7 data pipelines |
| **Frontend** | Globe.gl (CDN) | WebGL 3D globe with blue marble texture |
| **Styling** | Inline CSS | Military ops center aesthetic, 3 responsive breakpoints |

### Database Schema (8 tables)

| Table | Purpose |
|-------|---------|
| `vessels` | Ship positions, status, cargo estimates per snapshot date |
| `ports` | 12 major oil ports with coordinates and capacity |
| `port_snapshots` | Daily inbound vessels, barrels, storage % per port |
| `chokepoints` | 5 strategic chokepoints with throughput and status |
| `prices` | Brent, WTI, natural gas, retail gas prices |
| `storage_levels` | Regional crude storage (USA, EU, Asia, Middle East) |
| `sanctions` | OFAC SDN sanctioned entities matched to vessels |
| `refinery_status` | 8 refineries with utilization % and capacity |

---

## 🔌 API Reference

All endpoints return JSON. Base URL: `http://localhost:3000`

### Vessels & Fleet
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/vessels` | All vessels (optional `?date=YYYY-MM-DD`) |
| `GET` | `/api/vessels/trails` | Historical position trails for all vessels |
| `GET` | `/api/vessels/:mmsi` | Single vessel by MMSI |
| `GET` | `/api/fleet/summary` | Fleet status aggregation (counts, barrels in transit) |

### Sanctions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sanctions` | All sanctioned entities from OFAC SDN list |
| `GET` | `/api/sanctions/vessels` | Vessels matched against sanctions (optional `?date=`) |

### Ports & Chokepoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ports` | All ports with latest snapshots merged |
| `GET` | `/api/ports/congestion` | Port congestion trends (up/down/stable) |
| `GET` | `/api/ports/:code/history` | 90-day snapshot history per port (`?limit=`) |
| `GET` | `/api/chokepoints` | Chokepoint status and throughput |

### Prices, Storage & Forecasts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prices/latest` | Latest Brent, WTI, gas prices (7 fields) |
| `GET` | `/api/prices/history` | Price time series (`?limit=30`) |
| `GET` | `/api/prices/forecast` | 2-4 week retail gas forecast with confidence |
| `GET` | `/api/storage` | Regional crude storage levels |
| `GET` | `/api/refineries` | 8 refineries with utilization % |

### Trade Flows & System
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/flows` | Cargo flow aggregation by region (optional `?date=`) |
| `GET` | `/api/runway` | Runway estimates per region (days of supply) |
| `GET` | `/api/alerts` | Active alerts and threshold breaches |
| `GET` | `/api/snapshot/dates` | Available historical dates |
| `GET` | `/api/export/vessels.csv` | CSV export — vessels |
| `GET` | `/api/export/prices.csv` | CSV export — prices |

---

## 🌍 Deployment

OILTRAC is live at **[oil.nixfred.tech](https://oil.nixfred.tech)**.

### Docker

```bash
docker build -t oiltrac .
docker run -d --name oiltrac \
  -v oiltrac-data:/app/data \
  --env-file .env \
  --restart unless-stopped \
  oiltrac
```

### Docker Compose

```bash
docker compose up -d --build
```

### Systemd Service (bare metal)

```ini
# /etc/systemd/system/oiltrac.service
[Unit]
Description=OILTRAC Oil Tanker Intelligence
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/oiltrac
ExecStart=/usr/local/bin/bun run src/server.ts
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=DB_PATH=./data/oiltrac.db

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now oiltrac
```

### Reverse Proxy

OILTRAC runs on port 3000 internally. Point your reverse proxy at `http://localhost:3000` and configure TLS upstream.

---

## 📡 Data Pipeline Schedule

All pipelines run 1-2x daily to avoid API rate limits. Every pipeline **gracefully skips** when its API key is missing.

| Pipeline | Schedule (UTC) | Source | API Key | Data |
|----------|---------------|--------|---------|------|
| OFAC Sanctions | 5:00 AM | US Treasury | None (public) | Sanctioned entities |
| AIS Positions | 6:00 AM, 6:00 PM | AISHub | `AIS_HUB_KEY` | Vessel lat/lng, speed, heading |
| Crude Prices | 7:00 AM, 7:00 PM | FRED | `FRED_API_KEY` | Brent, WTI, natural gas |
| Gas Prices | 8:00 AM | EIA | `EIA_API_KEY` | US/CA retail gasoline |
| EIA Inventory | 9:00 AM | EIA | `EIA_API_KEY` | US petroleum storage |
| Refinery Util. | 9:30 AM | EIA | `EIA_API_KEY` | US refinery utilization % |
| EU Gas Storage | 10:00 AM | AGSI+ | `AGSI_API_KEY` | EU gas storage levels |

---

## 🗺️ Seed Data

OILTRAC ships with realistic seed data so you see a compelling demo on first launch — **no API keys needed**:

- **30 oil tankers** across Persian Gulf, Strait of Malacca, Gulf of Mexico, North Sea, Mediterranean, South China Sea, and West Africa
- **12 major ports** — Ras Tanura, Fujairah, Singapore, Rotterdam, Houston, Long Beach, Ningbo, Yokohama, and more
- **5 chokepoints** in crisis scenarios — Hormuz degraded (60%), Bab el-Mandeb degraded (45%), Panama drought (55%)
- **Crisis-level prices** — Brent at ~$115, WTI at ~$110, US gas at ~$4.25
- **8 refineries** — Port Arthur, Baytown, Garyville, Jamnagar, Ruwais, Rotterdam, Singapore Jurong, Ulsan
- **5 sanctioned vessels** — Matched against seed fleet for demo
- **5 days of historical snapshots** for timeline replay
- **4 regional storage levels** — USA, EU, Asia, Middle East

---

## 🛣️ Roadmap

### ✅ v1 — "War Room"
Interactive 3D globe, SVG tanker icons, route trails (solid/dotted), chokepoint monitoring, 7 energy prices, fleet summary, search with fly-to, timeline replay, alert banner, CSV export, mobile responsive, Docker deployment

### ✅ v2 — "Live Intel" *(current)*
OFAC sanctions overlay, cargo flow aggregation, refinery status tracking, port congestion history with trends, pump price forecast model, zoom controls, anchored hover tooltips, wider panels, larger fonts

### 🔮 v3 — "Analyst Desk"
Watchlists, annotations, scenario modeling ("what if Hormuz reopens?"), weather overlay, comparison mode, report generation, notification system

### 🏁 v4 — "Terminal"
Multi-user access, role-based views, API key management, webhook integrations, embedding mode, white-label capability

---

## 🤝 Contributing

Contributions welcome! This is an open-source intelligence tool — help make global energy data more accessible.

```bash
# Fork & clone
git clone https://github.com/YOUR_USERNAME/oiltrac.git
cd oiltrac
bun install
bun run src/server.ts
```

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built with 🛢️ by <a href="https://github.com/nixfred">nixfred</a></strong>
  <br />
  <sub>Powered by Bun • Hono • Globe.gl • bun:sqlite</sub>
</p>
