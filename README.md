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
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
</p>

---

## 🛰️ What is OILTRAC?

OILTRAC is a **self-hosted oil tanker intelligence dashboard** that tracks global crude oil movements, chokepoint disruptions, energy prices, and storage levels — all visualized on a stunning 3D interactive globe.

Think Bloomberg Terminal meets military situation room, but for global oil logistics.

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🌐  30+ tankers tracked across global sea lanes               ║
║   ⚓  12 major oil ports with throughput data                    ║
║   🚢  5 strategic chokepoints with live status                  ║
║   📈  Brent, WTI, natural gas, and retail fuel prices           ║
║   🛢️  Regional crude storage and days-of-supply estimates       ║
║   🚨  Automated alerts for disruptions and anomalies             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 🖥️ Screenshots

> *A dark-themed 3D globe with amber vessel markers, red crisis arcs, and a real-time ticker scrolling global energy data. Three side panels show fleet status, chokepoint alerts, and price movements.*

---

## ✨ Features

### 🌐 Interactive 3D Globe
- **Vessel markers** — Color-coded by status: 🟡 underway, 🔴 stranded, 🔵 ballast, ⚫ dark
- **Route arcs** — Great-circle lines from origin to destination showing live trade flow
- **Port markers** — Major oil terminals with inbound vessel counts
- **Chokepoint overlays** — Hormuz, Malacca, Suez, Bab el-Mandeb, Panama Canal

### 🔍 Search & Filter
- Search vessels by name, MMSI, flag, or destination
- Globe flies to matched vessel with smooth animation
- Filter by vessel class (VLCC, Suezmax, Aframax, LNG, Product)

### ⏱️ Timeline Replay
- Drag the timeline slider to replay vessel positions for any stored date
- Watch fleet movements evolve day-by-day during crisis events

### 🚨 Alert System
- **Chokepoint closures** — Automatic alerts when throughput drops below thresholds
- **Dark fleet detection** — Flags vessels with AIS transponders off > 48 hours
- **Price spikes** — Triggers when Brent crosses $100, $110, $120 levels
- **Supply warnings** — Regional storage drops below 15-day runway

### 📊 Intelligence Panels

| Panel | Data |
|-------|------|
| **Fleet Summary** | Total vessels, status breakdown, barrels in transit |
| **Prices & Energy** | Brent, WTI, natural gas, retail gasoline (US/EU/Asia) |
| **Chokepoints** | Status, % of normal throughput, daily vessel count |
| **Storage & Runway** | Regional crude storage, days of supply, capacity % |
| **Live Ticker** | Scrolling feed of latest data points |

### 📥 Data Export
- CSV download for vessels, prices, and fleet data
- Perfect for pulling into Excel, Python, or Tableau

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

Open **http://localhost:3000** — the app works immediately with built-in seed data. No API keys needed.

### With Live Data (Optional)

Add API keys to `.env` for real-time data:

```env
# AIS vessel tracking — https://www.aishub.net/
AIS_HUB_KEY=your_aishub_username

# EIA petroleum data — https://www.eia.gov/opendata/
EIA_API_KEY=your_eia_api_key

# FRED economic data (Brent/WTI) — https://fred.stlouisfed.org/
FRED_API_KEY=your_fred_api_key

# AGSI+ EU gas storage — https://agsi.gie.eu/
AGSI_API_KEY=your_agsi_api_key
```

| API | Free Tier | Data | Sign Up |
|-----|-----------|------|---------|
| [AISHub](https://www.aishub.net/) | ~100 req/day | Vessel positions (AIS) | [Register](https://www.aishub.net/join) |
| [EIA](https://www.eia.gov/opendata/) | Unlimited | US petroleum inventories, gas prices | [Get Key](https://www.eia.gov/opendata/register.php) |
| [FRED](https://fred.stlouisfed.org/) | 120 req/min | Brent crude, WTI crude prices | [Get Key](https://fred.stlouisfed.org/docs/api/api_key.html) |
| [AGSI+](https://agsi.gie.eu/) | Free w/ registration | EU gas storage levels | [Register](https://agsi.gie.eu/account) |

---

## 🏗️ Architecture

```
oiltrac/
├── src/
│   ├── server.ts          # Hono HTTP server — API + static files
│   ├── db.ts              # bun:sqlite — schema, queries, seed data
│   ├── scheduler.ts       # node-cron jobs for data pipeline
│   ├── types.ts           # Shared TypeScript interfaces
│   └── pipeline/
│       ├── ais.ts         # AISHub vessel position fetcher
│       ├── eia.ts         # EIA petroleum inventory fetcher
│       ├── prices.ts      # FRED API — Brent/WTI prices
│       ├── gas.ts         # EIA retail gas prices
│       └── agsi.ts        # AGSI+ EU gas storage
├── public/
│   └── index.html         # Full frontend — Globe.gl + all UI
├── data/
│   └── oiltrac.db         # SQLite database (auto-created)
├── .env.example
└── package.json
```

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Bun 1.3 | Fastest JS runtime, native SQLite, no bundler needed |
| **Server** | Hono | Ultrafast web framework, 14KB, perfect for APIs |
| **Database** | bun:sqlite (WAL) | Zero-dependency, embedded, handles concurrent reads |
| **Scheduler** | node-cron | Reliable cron scheduling for data pipelines |
| **Frontend** | Globe.gl (CDN) | WebGL 3D globe, no build step, stunning visuals |
| **Styling** | Inline CSS | Military ops center aesthetic, no framework needed |

---

## 🔌 API Reference

All endpoints return JSON. Base URL: `http://localhost:3000`

### Vessels
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/vessels` | All vessels (optional `?date=YYYY-MM-DD`) |
| `GET` | `/api/vessels/:mmsi` | Single vessel by MMSI |
| `GET` | `/api/fleet/summary` | Fleet status aggregation |

### Ports & Chokepoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ports` | All ports with latest snapshots |
| `GET` | `/api/chokepoints` | Chokepoint status and throughput |

### Prices & Storage
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prices/latest` | Latest Brent, WTI, gas prices |
| `GET` | `/api/prices/history` | Price time series (`?limit=30`) |
| `GET` | `/api/storage` | Regional crude storage levels |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
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

| Pipeline | Frequency | Source | Data |
|----------|-----------|--------|------|
| AIS Positions | Every 15 min | AISHub | Vessel lat/lng, speed, heading |
| Oil Prices | Every 1 hour | FRED | Brent crude, WTI crude |
| Gas Prices | Every 6 hours | EIA | US retail gasoline by region |
| Inventories | Every 6 hours | EIA | US petroleum storage levels |
| EU Gas Storage | Every 12 hours | AGSI+ | European gas storage % |

All pipelines **gracefully skip** when API keys are missing — the app always works with seed data.

---

## 🗺️ Seed Data

OILTRAC ships with realistic seed data so you see a compelling demo on first launch:

- **30 oil tankers** across Persian Gulf, Strait of Malacca, Gulf of Mexico, North Sea, Mediterranean, South China Sea, and West Africa
- **12 major ports** — Ras Tanura, Fujairah, Singapore, Rotterdam, Houston, Long Beach, Ningbo, Yokohama, and more
- **5 chokepoints** in crisis scenarios — Hormuz degraded (60%), Bab el-Mandeb degraded (45%), Panama drought (55%)
- **Crisis-level prices** — Brent at ~$115, WTI at ~$110, US gas at ~$4.25
- **5 days of historical snapshots** for timeline replay

---

## 🛣️ Roadmap

### ✅ v1 — "War Room" *(current)*
Interactive 3D globe, vessel tracking, route arcs, chokepoint monitoring, price panels, search, timeline replay, alerts, CSV export

### 🔜 v2 — "Live Intel"
Multi-source AIS ingestion, dark fleet detection, sanctions overlay (OFAC/EU), cargo flow aggregation, refinery status, pump price forecast model

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
