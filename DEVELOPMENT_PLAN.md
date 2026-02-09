# Wildfire Live Map — Development Plan

Domain: **www.eliiskeans.com**
Cloud: **AWS (serverless, low-cost)**
Status tracking: Update this doc as phases complete.

---

## Phase 0 — Foundation & AWS Bootstrap
> Get the house in order before writing app code.

### 0.1 Dev Environment
- [ ] Python 3.12+ virtual env (backend Lambdas)
- [ ] Node 20+ / pnpm (frontend)
- [ ] AWS CLI v2 configured (named profile, **not** root credentials)
- [ ] SAM CLI installed (for local Lambda testing + packaging)
- [ ] Docker Desktop (SAM local invoke, optional Flink later)

### 0.2 AWS Account Hardening (one-time)
- [ ] Create an IAM user or SSO profile for dev work (never use root)
- [ ] Enable billing alerts / budget ($10–20/month cap to start)
- [ ] Pick a home region (recommendation: **us-east-1** — required for CloudFront ACM certs, cheapest Lambda pricing)

### 0.3 Domain & SSL
- [ ] Decide DNS approach:
  - **Option A (recommended):** Transfer/point NS records to **Route 53** hosted zone → full control from AWS
  - **Option B:** Keep external DNS, create CNAME to CloudFront distribution
- [ ] Request ACM certificate for `eliiskeans.com` + `*.eliiskeans.com` (must be in **us-east-1** for CloudFront)
- [ ] Validate certificate (DNS validation is easiest)

### 0.4 Infrastructure-as-Code Setup
- [ ] Choose IaC tool: **AWS SAM** (recommended — first-class Lambda/APIGW support, simpler than CDK for this scope, easy local testing with `sam local`)
- [ ] Scaffold `infra/template.yaml` (SAM template)
- [ ] Create base S3 buckets via SAM:
  - `wildfire-app-web` (frontend hosting)
  - `wildfire-data` (snapshots/replay)
- [ ] Create CloudFront distribution pointing to `wildfire-app-web` bucket
- [ ] Wire up domain alias + ACM cert on CloudFront

### 0.5 Repo Structure
- [ ] Create directory scaffold per project outline:
  ```
  /infra          — SAM template + config
  /backend        — Lambda code (Python)
  /frontend       — Next.js app
  /local-dev      — Docker compose (later)
  /docs           — Architecture, runbooks
  /references     — Chat history, notes
  ```
- [ ] Add `.gitignore`, `README.md`
- [ ] Set up CI stub (GitHub Actions) — just lint + test for now, deploy later

**Exit criteria:** `sam deploy` provisions empty S3 + CloudFront, domain loads a placeholder page over HTTPS.

---

## Phase 1 — UI Skeleton (Milestone M0)
> Get a map on the screen at the real domain.

### 1.1 Frontend Scaffold
- [ ] `npx create-next-app` inside `/frontend`
- [ ] Configure for **static export** (`output: 'export'` in next.config)
- [ ] Install MapLibre GL JS
- [ ] Create `<LiveMap>` component — renders basemap centered on CONUS
- [ ] Add empty GeoJSON source layers: `hotspots` (points), `incidents` (polygons)
- [ ] Add layer toggle controls (hotspots / incidents / density)

### 1.2 Deploy Pipeline
- [ ] SAM/script to build frontend (`next build`) and sync to S3
- [ ] CloudFront invalidation after deploy
- [ ] Verify: `www.eliiskeans.com` shows the live map

### 1.3 Basic Layout
- [ ] Mode toggle: Live / Replay (UI only, no logic yet)
- [ ] Sidebar shell (for incident details later)
- [ ] Dashboard bar shell (active count, top growing — placeholder values)

**Exit criteria:** Public URL shows interactive basemap with toggle controls, no data yet.

---

## Phase 2 — Data Ingest & Latest State (Milestone M1)
> Hotspot data flows from NASA into DynamoDB and out to the frontend.

### 2.1 DynamoDB Tables
- [ ] `wf_hotspots_recent` — PK: `hotspot_id`, TTL on `expires_at` (auto-prune old data)
- [ ] `wf_cursors` — PK: `source_name`, stores `last_fetch_timestamp`
- [ ] `wf_incidents` — PK: `incident_id` (created in Phase 3, provision now)
- [ ] `wf_ws_connections` — PK: `connection_id`, TTL (created in Phase 4, provision now)
- [ ] Add all tables to SAM template

### 2.2 Ingest Lambda
- [ ] `/backend/lambdas/ingest_hotspots/handler.py`
- [ ] Fetch from NASA FIRMS CSV/JSON API (VIIRS NRT)
  - Use cursor from `wf_cursors` to fetch only new data
  - Parse to canonical hotspot schema
- [ ] Write hotspots to `wf_hotspots_recent`
- [ ] Update cursor
- [ ] EventBridge rule: trigger every 5 minutes
- [ ] Error handling: log failures, don't crash on partial data
- [ ] **Test locally** with `sam local invoke` before deploying

### 2.3 HTTP API — Latest State
- [ ] API Gateway HTTP API in SAM template
- [ ] `GET /state/latest` Lambda → scans `wf_hotspots_recent`, returns GeoJSON FeatureCollection
- [ ] Add pagination / bbox filter if needed for payload size

### 2.4 Wire Frontend to API
- [ ] Frontend fetches `/state/latest` on load
- [ ] Populates `hotspots` layer with real data
- [ ] Points styled by confidence (color) and intensity (size)
- [ ] Auto-refresh on interval (temporary until WebSockets in Phase 4)

**Exit criteria:** Map shows real NASA hotspot data, refreshed every few minutes. Data persists in DynamoDB with TTL cleanup.

---

## Phase 3 — Incident Formation (Milestone M2)
> Hotspots get clustered into named incidents with footprints.

### 3.1 Incident Processor Lambda
- [ ] `/backend/lambdas/process_incidents/handler.py`
- [ ] Runs after each ingest (chained via EventBridge or direct invocation)
- [ ] Clustering logic (MVP):
  - Compute geohash/H3 tile key per hotspot
  - For each hotspot: find nearest active incident within distance threshold (~5km) and time window (~2h)
  - If match → attach hotspot, update incident metrics
  - If no match → create new incident
- [ ] Update incident geometry: convex hull of recent hotspot points (Shapely)
- [ ] Compute metrics: hotspot counts (15m/1h/6h), growth rate, intensity proxy
- [ ] Write to `wf_incidents` table

### 3.2 Shared Utilities
- [ ] `/backend/shared/geo_utils.py` — H3/geohash, distance calc, convex hull
- [ ] `/backend/shared/schemas.py` — Pydantic models for Hotspot, Incident
- [ ] `/backend/shared/dynamo.py` — DynamoDB helpers (get/put/query)

### 3.3 HTTP API — Incident Detail
- [ ] `GET /incidents/{id}` Lambda → returns full incident record
- [ ] Update `GET /state/latest` to include incidents (footprint polygons)

### 3.4 Frontend — Incidents Layer
- [ ] Render incident footprints as polygons on map
- [ ] Style by intensity/growth rate (color gradient)
- [ ] Click incident → sidebar shows detail panel:
  - Incident ID, timestamps, hotspot count, growth rate, intensity
- [ ] Fetch detail from `GET /incidents/{id}` on click

**Exit criteria:** Map shows incident polygons formed from hotspot clusters. Clicking shows stats. New hotspots attach to existing incidents or form new ones.

---

## Phase 4 — WebSocket Live Push (Milestone M3)
> Replace polling with real-time push. This is the streaming showpiece.

### 4.1 WebSocket API Gateway
- [ ] Add WebSocket API to SAM template
- [ ] Routes: `$connect`, `$disconnect`, `subscribe`, `unsubscribe`

### 4.2 Connection Management Lambdas
- [ ] `ws_connect` — store `connection_id` in `wf_ws_connections`
- [ ] `ws_disconnect` — remove from table
- [ ] `ws_subscribe` — store subscription filters (bbox, region) on connection record
- [ ] `ws_unsubscribe` — clear filters

### 4.3 Broadcast Logic
- [ ] After `process_incidents` updates DynamoDB, broadcast changed incidents to subscribers
- [ ] Filter: only send to connections whose bbox/region overlaps the incident
- [ ] Payload: minimal delta (incident_id, updated fields, geometry)
- [ ] Handle stale connections gracefully (GoneException → delete from table)

### 4.4 Frontend — WebSocket Client
- [ ] Connect to WS API on page load
- [ ] Send `subscribe` with current map viewport bbox
- [ ] On viewport change, re-subscribe with new bbox
- [ ] On message received: update GeoJSON source in-place → map animates
- [ ] Connection status indicator (connected / reconnecting / offline)
- [ ] Reconnect logic with exponential backoff

### 4.5 Remove Polling
- [ ] Remove the auto-refresh interval from Phase 2
- [ ] Initial load still uses HTTP `GET /state/latest`, then WS takes over

**Exit criteria:** Map updates in real-time as new hotspot data arrives. No polling. Visual indicator shows live connection status.

---

## Phase 5 — Replay Mode (Milestone M4)
> Time-travel through historical fire data.

### 5.1 Snapshot Writer Lambda
- [ ] Triggered on schedule (hourly)
- [ ] Reads current state from DynamoDB
- [ ] Writes GeoJSON snapshot to `wildfire-data` S3: `snapshots/{date}/{hour}.geojson`
- [ ] Keep last 7 days of snapshots

### 5.2 HTTP API — Replay Endpoints
- [ ] `GET /replay?from=...&to=...` → returns list of available snapshot timestamps
- [ ] `GET /snapshots/{date}/{hour}` → serves snapshot (or redirect to S3/CloudFront signed URL)

### 5.3 Frontend — Replay UI
- [ ] Time slider component (range: 1h / 6h / 24h / 7d)
- [ ] In replay mode: disconnect WS, load snapshots via HTTP
- [ ] Animate through snapshots (play/pause/step)
- [ ] Visual distinction between live and replay mode

**Exit criteria:** User can switch to replay mode and scrub through historical data. Snapshots are generated automatically.

---

## Phase 6 — Polish & Portfolio-Ready
> Make it demo-worthy.

### 6.1 Dashboard
- [ ] Active incidents count (live-updating)
- [ ] "Top 5 fastest growing" incidents list
- [ ] Optional: H3 density heatmap layer

### 6.2 Visual Polish
- [ ] Map styling (dark basemap, fire-colored points, animated pulses for new hotspots)
- [ ] Responsive layout (mobile-friendly)
- [ ] Loading states, error states
- [ ] Smooth transitions on data updates

### 6.3 Performance & Cost Audit
- [ ] Review DynamoDB read/write capacity and costs
- [ ] Ensure CloudWatch logging is minimal (no debug logs in prod)
- [ ] Verify CloudFront caching headers on frontend + replay artifacts
- [ ] Load test WebSocket connections (target: handle 50+ concurrent viewers)

### 6.4 Documentation & Demo
- [ ] Architecture diagram (for portfolio / README)
- [ ] Demo script / talking points
- [ ] One-command deploy script (`make deploy` or similar)
- [ ] Clean up README with screenshots

**Exit criteria:** App is visually polished, performant, and cheap to run. Ready to show in interviews or on a portfolio site.

---

## Decision Log

| # | Decision | Status | Notes |
|---|----------|--------|-------|
| 1 | IaC Tool | **Proposed: SAM** | Good Lambda/APIGW support, easy local testing. CDK is an option if SAM feels limiting. |
| 2 | DNS Approach | **TBD** | Route 53 (recommended) vs external DNS. Depends on current registrar. |
| 3 | Map Library | **Proposed: MapLibre GL JS** | Free, performant, vector tiles. Leaflet is simpler but less capable. |
| 4 | Clustering Algo | **Proposed: Distance + Time window** | Simple MVP. Can swap in DBSCAN or H3-based later. |
| 5 | Local Flink | **Deferred to post-MVP** | Focus on serverless first. Add Flink as a "bonus" streaming demo later. |

---

## Open Questions

1. **Where is `eliiskeans.com` currently registered?** (Determines DNS migration approach)
2. **SAM vs CDK preference?** SAM is simpler for this scope, CDK gives more flexibility. Both work.
3. **Any preference on map style?** (Dark/light basemap, specific tile provider)
4. **GitHub Actions for CI/CD, or something else?**
