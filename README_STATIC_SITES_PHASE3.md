# Static Sites Phase 3: Production Container + Railway Deployment

## Artifacts Added
- `docker-compose.fullstack.yml` — full local stack (PostgreSQL, booking-api, booking-ui, admin-dashboard, static-sites, nginx proxy).
- `nginx/Dockerfile` — production Nginx image builder that can copy `default.conf` or `production.conf`.
- `static-sites/railway.toml` — Railway deployment config for static-sites.
- `static-sites/.env.railway.example` — static-sites service env template.
- `scripts/deploy-railway-static-sites.ps1` — deploy only static-sites.
- `scripts/deploy-railway-platform.ps1` — deploy booking-api + booking-ui + admin-dashboard + static-sites.
- `scripts/monitor-platform.ps1` — endpoint and latency monitoring sweep.

## Directory Structure (Deployment-Relevant)
```text
real-matboss/
  docker-compose.fullstack.yml
  docker-compose.frontend.yml
  nginx/
    Dockerfile
    default.conf
    production.conf
  static-sites/
    Dockerfile
    nginx.conf
    railway.json
    railway.toml
    .env.railway.example
    index.html
    live-proof/index.html
    the-ghosts/index.html
    the-system/index.html
    vienna-to-every-dojo/index.html
    assets/
    data/
  scripts/
    deploy-railway-static-sites.ps1
    deploy-railway-platform.ps1
    monitor-platform.ps1
```

## Local Full-Stack Run
```powershell
docker compose -f .\docker-compose.fullstack.yml up --build
```

Endpoints:
- Platform entry: `http://localhost:8080`
- Static-only container: `http://localhost:5175`
- Booking UI: `http://localhost:5173`
- Admin dashboard: `http://localhost:5174`
- Backend API: `http://localhost:3000/api/v1/health`

## Railway Deployment
1. Create four Railway services rooted at:
   - `booking-api`
   - `booking-ui`
   - `admin-dashboard`
   - `static-sites`
2. Attach PostgreSQL plugin to `booking-api` service.
3. Set required service env vars:
   - `booking-api`: see `booking-api/.env.example`
   - `static-sites`: see `static-sites/.env.railway.example`
4. Trigger deploys:
```powershell
.\scripts\deploy-railway-platform.ps1 `
  -BookingApiService "<booking-api-service>" `
  -BookingUiService "<booking-ui-service>" `
  -AdminDashboardService "<admin-dashboard-service>" `
  -StaticSitesService "<static-sites-service>"
```

## Post-Deploy Validation Checklist
1. Open `/` and all static routes:
   - `/live-proof/`
   - `/the-ghosts/`
   - `/the-system/`
   - `/vienna-to-every-dojo/`
2. Submit CTA form and verify handoff to `/book/`.
3. Confirm `/admin/` loads and shows booking entries from backend.
4. Confirm `/api/v1/health` and `/api/v1/health/ready` return `200`.
5. Run monitoring sweep:
```powershell
.\scripts\monitor-platform.ps1 -BaseUrl "https://<your-domain>"
```

## Phase 3 Report (Current)
- Local load test baseline (`200` concurrent static page requests):
  - `avg`: `306.71 ms`
  - `p95`: `358.13 ms`
  - `max`: `363.48 ms`
  - `failed`: `0`
- Target SLO:
  - `p95 < 1000 ms` on static route set.
  - `99.9%` route uptime on `/`, `/live-proof/`, `/the-ghosts/`, `/the-system/`, `/vienna-to-every-dojo/`.

## Scaling and Reliability Notes
- Keep `nginx/production.conf` as edge proxy; scale API and frontends independently.
- Horizontal scale recommendation:
  - `nginx-proxy`: 2+ replicas
  - `booking-api`: 2+ replicas behind health checks
  - `static-sites`: 2+ replicas if traffic spikes
- Use Railway logs + health checks for restart automation (`ON_FAILURE` policy is enabled).

## Ammar-Specific Rollout Guidance
- Keep county dataset (`static-sites/data/all-us-counties.txt`) synced with backend pipelines before major campaigns.
- Preserve Vienna time-paradox widgets on landing to reinforce cross-timezone response positioning.
- For U.S. county expansion, prioritize high-intent states first in campaign copy and map emphasis.
