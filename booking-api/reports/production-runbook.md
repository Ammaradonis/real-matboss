# Production Runbook (Railway)

## Deployment Artifacts

- `booking-api/Dockerfile`
- `booking-api/docker-compose.yml`
- `booking-api/Procfile`
- `booking-api/railway.toml`
- `booking-api/.env.example`

## Railway Env Template

```env
DATABASE_URL=<railway-postgres-url>
JWT_SECRET=<strong-access-secret>
JWT_REFRESH_SECRET=<strong-refresh-secret>
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=MatBoss <hello@matboss.online>
CORS_ORIGINS=https://matboss.com,https://book.matboss.com,https://admin.matboss.com
ADMIN_DEFAULT_PASSWORD=<bcrypt-hash>
NODE_ENV=production
PORT=3000
```

## Post-Deploy Health Checks

```bash
curl https://<booking-api-domain>/api/v1/health
curl https://<booking-api-domain>/api/v1/health/ready
```

## Post-Deploy Validation Flow

1. Create discovery booking via `POST /api/v1/bookings/discovery`.
2. Confirm WebSocket subscription receives `booking.created` and `availability.changed`.
3. Queue test email via `POST /api/v1/admin/email/test-send`.
4. Export leads via `GET /api/v1/admin/export/csv`.

## Load + Integrity Commands

```bash
npm run loadtest
npm run validate:overlaps
```

## Rollback Strategy

1. Revert to previous stable commit (`git revert <sha>` or redeploy previous successful Railway release).
2. Re-run migrations only if forward-safe (this project uses additive SQL migrations).
3. Re-check `/api/v1/health/ready` after rollback.

## Handover Notes (Vienna Ops)

- Default demo admin/provider seed uses `Europe/Vienna`.
- U.S. operator-facing booking windows are enforced with:
  - `minimum_notice_hours`
  - `maximum_advance_days`
  - provider buffers (`buffer_before_minutes`, `buffer_after_minutes`)
- This keeps Vienna-based operations aligned with ET/CT/MT/PT workflows while maintaining UTC persistence in DB.
