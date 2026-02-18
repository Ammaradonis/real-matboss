# MatBoss Booking API

NestJS + PostgreSQL backend for the multi-tenant MatBoss booking platform.

## Stack

- NestJS (TypeScript)
- PostgreSQL + TypeORM
- Socket.IO (`@nestjs/websockets`)
- Nodemailer + Handlebars + ICS
- `date-fns` + `date-fns-tz`
- Jest (unit + integration/e2e stubs)

## Core Modules

- `auth` (register/login/refresh/logout, API token validation)
- `availability` (rules, overrides, slot generation, buffers, blackout enforcement)
- `booking` (creation/discovery/cancel/confirm, qualification scoring, audit trail)
- `provider` (CRUD + tenant URL resolution)
- `event-type` (CRUD + slug lookup + event configuration)
- `admin` (auth, discovery management, analytics, CSV export, settings)
- `email` (templates, queue, preview/test, bulk send, blackout dates, ICS)
- `notification` (SMTP send + SMS placeholder)
- `websocket` (booking/availability events)
- `health` (`/api/v1/health`, `/api/v1/health/ready`)

## Local Setup

1. Install dependencies:
```bash
npm install
```
2. Set environment variables (see `.env.example`).
3. Start PostgreSQL and run migrations:
```bash
npm run migrate
npm run seed
```
4. Run API:
```bash
npm run start:dev
```

## Test Commands

```bash
npm test
npm run test:cov
npm run test:e2e
```

Coverage target is configured via `npm run test:cov` and currently executes all unit suites under `src`.

## Load Testing

Run built-in load test script (100-concurrency defaults):
```bash
npm run loadtest
```

Optional booking-create scenario:
```bash
set LOADTEST_RUN_BOOKING=1&& npm run loadtest
```

Artifacts are written to:
- `reports/loadtest-report.json`
- `reports/loadtest-report.md`

Validate no active-booking overlaps in DB:
```bash
npm run validate:overlaps
```

## Docker

```bash
docker compose up --build
```

This starts:
- PostgreSQL (`postgres:946732`)
- API on `http://localhost:3000`

## Railway

- `Dockerfile` is used for build/deploy.
- `Procfile` entry: `web: node dist/main.js`
- Healthcheck path in `railway.toml`: `/api/v1/health/ready`
- Required env vars are listed in `.env.example`.
