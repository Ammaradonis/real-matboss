# Frontend Production Deployment (Booking UI + Admin Dashboard)

## Services
- `booking-ui`: React/Vite static app served by Nginx (container port `80`, external `5173` locally)
- `admin-dashboard`: React/Vite static app served by Nginx (container port `80`, external `5174` locally)

## Required Environment Variables
### booking-ui
- `VITE_API_URL=https://<booking-api-host>`

### admin-dashboard
- `VITE_API_URL=https://<booking-api-host>`
- `VITE_TENANT_ID=<tenant-uuid>`

## Local Production Validation
```powershell
npm --prefix .\booking-ui ci
npm --prefix .\booking-ui run build
npm --prefix .\admin-dashboard ci
npm --prefix .\admin-dashboard run build
```

## Docker Build Commands
```powershell
docker build -t matboss-booking-ui:local .\booking-ui
docker build -t matboss-admin-dashboard:local .\admin-dashboard
```

## Reverse Proxy
- Development proxy config: `nginx/default.conf`
- Production-hardened proxy config: `nginx/production.conf`
- Both route:
  - `/book/` -> booking UI
  - `/admin/` -> admin dashboard
  - `/api/` -> booking API
  - `/ws/` -> booking API WebSocket gateway

## Railway Deployment
1. Create two Railway services from this repo:
   - service A rooted at `booking-ui`
   - service B rooted at `admin-dashboard`
2. Set env vars in each service from `.env.production.example`.
3. Ensure backend service CORS allows both frontend origins.
4. Trigger deploys with:
```powershell
.\scripts\deploy-railway-frontends.ps1 -BookingUiService "<booking-ui-service>" -AdminDashboardService "<admin-dashboard-service>"
```

## Post-Deploy Smoke Checklist
1. Open `/book/` and complete discovery booking submission.
2. Open `/admin/`, login, verify lead appears and can change status.
3. Export CSV from Bookings tab.
4. Confirm websocket updates appear after a new booking.

## Monitoring and Runtime Resilience
- Use React error boundaries in each app root for graceful fallback screens.
- Configure Railway log drains/alerts for 5xx spikes.
- Keep Nginx health endpoint (`/health`) enabled for readiness probes.
