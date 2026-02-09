# Wildfire Live Map (Low-Cost Streaming Demo w/ WebSockets) — Project Kickoff

A portfolio-grade, open-source streaming + GIS app that ingests public wildfire hotspot data, forms evolving “incidents” in near real-time, and serves an interactive live map with WebSocket updates. Designed to be AWS low-cost and Foundry/streaming-skill relevant.

---

## End Goal (What users see)
A public web app on my personal domain that provides:

- **Live Map Mode**
  - Hotspots (points) and Incidents (polygons/footprints) update **in near real-time**
  - WebSocket push (no constant polling spam)
- **Replay Mode**
  - Time slider to replay last 24h / 7d of events (always demo-able)
- **Incident Details**
  - Click incident → shows: created time, last updated, hotspot count, intensity proxy, growth rate, location, confidence stats
- **Basic Dashboard**
  - Active incidents count
  - Top “fastest growing” incidents
  - Optional density layer (H3 grid)

---

## Data Sources (Free + Public)
Nominal source names only:

- **NASA FIRMS** — active fire/hotspot detections (VIIRS/MODIS)
- **NIFC Hotspots Feed** — hotspot layer (often derived from FIRMS; good alt source)
- **NOAA Weather** (optional v2) — wind/humidity/temp enrichment

> MVP: start with hotspots only (NASA FIRMS or NIFC). Add NOAA later.

---

## Stack (Low-Cost “Live” Version w/ WebSockets)

### Frontend
- **Next.js** (static export) hosted on **S3 + CloudFront**
- **MapLibre** (or Leaflet) for interactive map UI
- WebSocket client to receive incident updates
- Replay mode uses HTTP endpoints to load historical snapshots

### Backend (Serverless)
- **API Gateway**
  - **HTTP API** for queries (replay, initial load)
  - **WebSocket API** for live push updates
- **AWS Lambda (Python)**
  - Ingest/poller
  - Processor (incident formation)
  - HTTP handlers
  - WebSocket connect/subscribe/broadcast handlers
- **DynamoDB (On-Demand)**
  - “Hot state” (latest incidents, latest hotspots per incident, connection subscriptions)
- **S3**
  - “Cold/history” (hourly/daily snapshots as GeoJSON/Parquet for replay)
- **CloudWatch**
  - logs/metrics (keep logs minimal)

### Local / Dev Streaming (Optional but recommended)
- **Flink** locally (Docker) for practicing true event-time streaming + state
- In prod serverless MVP, we emulate streaming via scheduled micro-batches (every 1–5 minutes)

> Cost guardrail: **avoid VPC/NAT** for MVP.

---

## System Architecture (High-Level)

### Data Flow
1. **EventBridge** triggers `ingest_hotspots` Lambda every 1–5 minutes
2. Ingest Lambda fetches newest hotspots (since last cursor timestamp)
3. Hotspots are written to DynamoDB (and optionally to S3 raw)
4. `process_incidents` logic:
   - assigns hotspots to incidents (stateful clustering)
   - updates incident footprint + metrics
   - writes updated incident state to DynamoDB
5. Updated incidents are broadcast to connected clients via WebSocket API
6. On a schedule (hourly/daily), snapshot Lambda writes replay artifacts to S3

### Key Idea
- “Live” = WebSockets + DynamoDB latest state
- “Replay” = S3 snapshots + HTTP endpoints (cacheable)

---

## Incident Formation (MVP Algorithm)
Simple + robust for a demo; can be improved later.

- Represent each hotspot as:
  - `id`, `timestamp`, `lat`, `lon`, `confidence`, `intensity_proxy` (FRP if available), `source`
- Assign each hotspot to an incident:
  - Compute a **tile key** (H3 index or geohash)
  - Incidents are keyed by tile + time continuity
  - If hotspot is within distance threshold of an existing incident’s centroid/last footprint and within “active window” (e.g., last 2 hours), attach it
  - Otherwise create a new incident
- Update incident geometry:
  - maintain a rolling set of recent hotspot points (e.g., last 6 hours)
  - footprint = convex hull or buffered hull of points (MVP can be bbox or simple circle buffer)
- Metrics:
  - count hotspots last 15m/1h/6h
  - growth rate = (count last 30m) - (count previous 30m)
  - intensity_proxy = max/avg FRP (or confidence-weighted count)

---

## AWS Components (Concrete)
- **S3 Buckets**
  - `wildfire-app-web` (frontend)
  - `wildfire-data` (snapshots)
- **CloudFront**
  - serves frontend + cached replay artifacts
- **DynamoDB Tables**
  - `wf_incidents` (PK: incident_id)
  - `wf_hotspots_recent` (PK: hotspot_id or composite; TTL)
  - `wf_cursors` (PK: source_name; stores last fetch timestamp)
  - `wf_ws_connections` (PK: connection_id; stores subscriptions, TTL)
- **API Gateway**
  - HTTP API:
    - `GET /state/latest`
    - `GET /incidents/{id}`
    - `GET /replay?from=...&to=...`
    - `GET /snapshots/{date}/{hour}`
  - WebSocket API:
    - `$connect`
    - `$disconnect`
    - `subscribe` (e.g., bbox/region)
    - `unsubscribe`
- **Lambda Functions**
  - `ingest_hotspots`
  - `process_incidents` (can be combined with ingest for MVP)
  - `snapshot_writer`
  - `http_latest_state`
  - `http_incident_detail`
  - `ws_connect`, `ws_disconnect`
  - `ws_subscribe`, `ws_unsubscribe`
  - `ws_broadcast` (or inline with process)

---

## Web App UX (MVP Spec)
### Landing
- Map centered on US
- Toggle layers:
  - Hotspots
  - Incident footprints
  - Optional density grid
- Controls:
  - Mode: **Live / Replay**
  - Time range: 1h / 6h / 24h / 7d
  - Filters: confidence, intensity proxy, source

### Incident Click
- Sidebar with:
  - Incident ID
  - Last updated time
  - Hotspot count (recent + total)
  - Growth rate
  - Quick sparkline (optional)

---

## Cost Discipline (MVP Rules)
- Keep Lambdas **out of VPC** (no NAT gateway)
- Prefer DynamoDB + S3 over PostGIS/RDS
- Avoid verbose logging (CloudWatch ingest is the sneaky bill)
- WebSockets are cheap at low traffic; keep payloads small

---

## Repo Layout (Suggested)
- `/infra`
  - IaC (Terraform/CDK/SAM) + environment config
- `/backend`
  - `lambdas/ingest_hotspots/`
  - `lambdas/process_incidents/`
  - `lambdas/http_api/`
  - `lambdas/ws_api/`
  - `shared/` (schemas, geo utils, h3/geohash utils)
- `/frontend`
  - Next.js app (MapLibre UI)
- `/local-dev`
  - Docker compose (optional Flink + local broker + MinIO)
- `/docs`
  - architecture, data contracts, runbook, demo scripts

---

## Data Contracts (Minimal)
### Hotspot (canonical)
- `hotspot_id` (string)
- `event_time` (ISO8601)
- `lat` (float)
- `lon` (float)
- `confidence` (number/string)
- `intensity_proxy` (number; FRP if available)
- `source` (string: `FIRMS` | `NIFC`)
- `ingested_at` (ISO8601)

### Incident (canonical)
- `incident_id` (string)
- `first_seen` (ISO8601)
- `last_seen` (ISO8601)
- `hotspot_count_total` (int)
- `hotspot_count_1h` (int)
- `growth_rate_30m` (int)
- `centroid_lat` / `centroid_lon` (float)
- `footprint_geojson` (GeoJSON Polygon/MultiPolygon)
- `intensity_max` (number)
- `confidence_summary` (object/string)

---

## Milestones (Fast Path)
1. **M0: UI Skeleton**
   - Map loads with basemap + empty layers
2. **M1: Ingest + Latest State**
   - Scheduled ingest populates DynamoDB
   - HTTP `GET /state/latest` returns hotspots
3. **M2: Incidents**
   - Processor creates incidents + footprints
   - UI shows incidents + click details
4. **M3: WebSockets Live Push**
   - UI connects to WS, receives updates, map animates changes
5. **M4: Replay**
   - Snapshot artifacts in S3
   - Time slider loads snapshots via HTTP

---

## “New Chat” Prompt (Copy/Paste)
I’m building a low-cost AWS serverless wildfire live map demo. I want:
- Next.js static site on S3/CloudFront
- API Gateway HTTP + WebSocket APIs
- Lambda (Python) for ingest + incident processing + WS broadcast
- DynamoDB for latest state + connections
- S3 for snapshots/replay artifacts
Data source: NASA FIRMS hotspots (or NIFC hotspots feed).
Please give me the MVP implementation plan and the exact AWS resources + endpoint/route definitions, plus minimal schemas for hotspots/incidents and the simplest incident clustering algorithm that works.
