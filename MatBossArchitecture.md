# MatBoss — Technical Architecture Document

> **Platform**: Multi-purpose martial arts booking, lead management & marketing system
> **Deployment & Hosting**: [https://railway.com/](https://railway.com/)
> **Last Updated**: February 2026

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Feature Wireframe Tree](#2-feature-wireframe-tree)
3. [Technical Architecture](#3-technical-architecture)
4. [Backend API — Booking API (NestJS)](#4-backend-api--booking-api-nestjs)
5. [Frontend — Booking UI (React)](#5-frontend--booking-ui-react)
6. [Frontend — Admin Dashboard (React)](#6-frontend--admin-dashboard-react)
7. [Static Marketing Pages](#7-static-marketing-pages)
8. [Database Architecture](#8-database-architecture)
9. [Nginx Reverse Proxy & Production Config](#9-nginx-reverse-proxy--production-config)
10. [Martial Arts Scraper (Python)](#10-martial-arts-scraper-python)
11. [Scraper Setbacks, Failures & Shortcomings](#11-scraper-setbacks-failures--shortcomings)
12. [Platform Strengths](#12-platform-strengths)
13. [Known Weaknesses & Insecurities](#13-known-weaknesses--insecurities)
14. [Deployment on Railway](#14-deployment-on-railway)
15. [Improvement Roadmap & Future Solutions](#15-improvement-roadmap--future-solutions)

---

## 1. Platform Overview

MatBoss is a **multi-purpose platform** built for the martial arts industry. It combines:

- **Discovery call booking system** — Prospects schedule 30-minute consultations via a polished calendar UI
- **Admin CRM dashboard** — Lead pipeline management, analytics, email campaigns, CSV export
- **Email automation engine** — Template-based email system with queue, scheduling, blackout dates
- **4 static marketing/proof pages** — Conversion-optimized storytelling pages with interactive visualizations
- **Landing page** — Hero section with 3D globe, time paradox display, lead capture modal
- **Martial arts school scraper** — Enterprise-grade Python scraper for decision-maker extraction

The platform is designed to operate across timezones — built in Vienna, serving U.S. martial arts schools — with the core value proposition of **sub-3-minute response time** to inbound leads.

---

## 2. Feature Wireframe Tree

```
MatBoss Platform
│
├── 🌐 Landing Page (/)
│   ├── Hero Section (day/night mode, time paradox display)
│   ├── 3D Interactive Globe (Three.js, 2D fallback on mobile)
│   ├── Demo Section (missed-lead cards, parallax)
│   ├── "4,500 Mile Promise" Section
│   ├── Lead Capture Modal (name, email, phone, county selector)
│   ├── Scroll Progress Bar
│   └── Notification Pills (chaos loop animation)
│
├── 📅 Booking UI (/book/)
│   ├── Step 1: Calendar Grid (date selection, 60-day advance)
│   ├── Step 2: Slot Picker (morning/afternoon/evening grouping)
│   ├── Step 3: School Details Form
│   │   ├── Section 1: School Information
│   │   │   ├── School/Gym Name *
│   │   │   ├── City + State (US dropdown)
│   │   │   ├── Active Students (range selector)
│   │   │   ├── Instructor Count
│   │   │   └── Current Booking System (Mindbody, Zen Planner, etc.)
│   │   ├── Section 2: Contact Information
│   │   │   ├── Name * / Email * / Phone
│   │   │   └── Preferred Contact Method (email/phone/text)
│   │   └── Section 3: Discovery Call Goals
│   │       ├── Scheduling Challenges (textarea)
│   │       ├── Monthly Budget Range
│   │       └── Implementation Timeline
│   ├── Step 4: Confirmation View (full review before submit)
│   ├── Step 5: Success View (booking confirmation)
│   └── Step Indicator (visual progress bar)
│
├── 🛡️ Admin Dashboard (/admin/)
│   ├── Login (password-based admin auth)
│   ├── Dashboard Page
│   │   ├── Stat Cards Row 1 (Total Bookings, Confirmed, Pending, Avg Students)
│   │   ├── Stat Cards Row 2 (Conversion Rate, This Month, Emails Sent, Total Leads)
│   │   ├── Today's Calls (upcoming calls with qualification scores)
│   │   ├── Lead Pipeline (funnel visualization by status)
│   │   ├── Top States (geographic breakdown)
│   │   ├── Budget Ranges (bar chart)
│   │   ├── Purchase Timeline (bar chart)
│   │   ├── Current Systems Used (competitor breakdown)
│   │   └── Weekly Bookings (12-week bar chart)
│   ├── Bookings Page
│   │   ├── Search (name, email, school)
│   │   ├── Status Filter (new, contacted, qualified, proposal, closed_won, closed_lost)
│   │   ├── Sortable Table (school, date, location, students, score, lead status, booking)
│   │   ├── Detail Modal (full booking info, lead status update, admin notes)
│   │   └── CSV Export
│   ├── Leads Page (Kanban Pipeline)
│   │   ├── Columns: New → Contacted → Qualified → Proposal → Closed Won / Lost
│   │   ├── Lead Cards (school, email, score, date, location, student count)
│   │   └── Quick Status Move Buttons
│   ├── Emails Page
│   │   ├── Templates Tab
│   │   │   ├── Template List (name, category, version, variables)
│   │   │   ├── Toggle Active/Inactive
│   │   │   ├── Preview Modal (rendered HTML iframe)
│   │   │   ├── Edit Panel (subject, HTML body, plain text body)
│   │   │   └── Send Test Email
│   │   ├── Queue Tab
│   │   │   ├── Status Filter (all, pending, sent, failed)
│   │   │   └── Queue Table (to, subject, template, status, attempts, scheduled, sent)
│   │   └── Blackout Dates Tab
│   │       ├── Add Blackout Date (date picker + reason)
│   │       └── Active Blackout Dates List (with remove)
│   └── Settings Page
│       ├── Discovery Call Configuration
│       │   ├── Call Duration (minutes)
│       │   ├── Minimum Notice (hours)
│       │   ├── Max Advance Booking (days)
│       │   ├── Buffer Between Calls (minutes)
│       │   └── Admin Timezone (ET/CT/MT/PT)
│       ├── Change Admin Password
│       └── Session Management (Sign Out)
│
├── 📊 Static Marketing Pages
│   ├── /live-proof/ — "Live Proof"
│   │   ├── Live System Dashboard (KPIs, response time comparison)
│   │   ├── Before/After Revenue Graph (interactive slider)
│   │   ├── Video Mosaic (muted autoplay, county-linked)
│   │   ├── Results Ticker (scrolling marquee)
│   │   ├── County Clustering Map (D3.js + TopoJSON)
│   │   ├── School Filter (type, size, location)
│   │   ├── ROI Calculator (5 sliders, real-time output)
│   │   └── CTA Form (phone + preferred time)
│   ├── /the-ghosts/ — "The Ghosts"
│   │   ├── Loss Counter (animated ticker)
│   │   ├── Loss Calculator (leads/month, response rate)
│   │   ├── Response Time Comparison Table
│   │   ├── One Week Timeline (3 modes: current/competitor/MatBoss)
│   │   ├── Anonymized Inquiry Log
│   │   ├── Isometric Dojo Cutaway (SVG, interactive hotspots)
│   │   ├── Ghost Gallery (4 ghost personas with modals)
│   │   ├── Before/After Split Slider
│   │   ├── "Your Week Without MatBoss" (7-day accordion)
│   │   └── CTA Form
│   ├── /the-system/ — "The System"
│   │   ├── Plain English / Technical Truth Toggle
│   │   ├── Journey Map (school type selector: kids/adult/mixed/traditional)
│   │   ├── Animated Node Network (8 nodes, scroll-activated)
│   │   ├── Operational Status Dashboard (uptime, P95, errors, incidents)
│   │   ├── API Response Time Chart (SVG, P50/P95)
│   │   ├── Integration Verification (FB, IG, Google, SMS, Email, Mindbody, etc.)
│   │   ├── Security Posture Badges
│   │   ├── Architecture Diagram (visual + technical toggle)
│   │   ├── Day in the Life Player (timeline scrubber)
│   │   ├── Test Message Playground (AI response demo with personality sliders)
│   │   ├── Integration Galaxy (orbital visualization)
│   │   ├── County Coverage Map (D3.js, 3,143 counties)
│   │   └── CTA
│   └── /vienna-to-every-dojo/ — "Vienna to Every Dojo"
│       ├── Arabic Quote + Translation
│       ├── Strategic Timeline (2015–2024, scroll-activated)
│       ├── 4,500 Miles Globe (Three.js, rotatable)
│       ├── Philosophy Cards (3 expandable)
│       ├── Testimonials
│       ├── Vienna Studio Section (live feed placeholder)
│       ├── Manifesto + Network Visualization (SVG)
│       └── CTA Form
│
├── 🔧 Backend API (/api/v1/)
│   ├── Auth Module (register, login, refresh, logout)
│   ├── Availability Module (rules, overrides, slot generation)
│   ├── Booking Module (create, discovery, cancel, confirm, events)
│   ├── Provider Module (list, by-url, by-id, update settings)
│   ├── Event Type Module (list, by-slug, create, update)
│   ├── Admin Module (login, password, bookings, leads, analytics, settings, CSV export)
│   ├── Email Module (templates CRUD, queue, bulk send, blackout dates, preview, test)
│   ├── Notification Module (email sending, ICS generation)
│   ├── WebSocket Gateway (real-time booking/availability updates)
│   └── Health Module (health + readiness endpoints)
│
└── 🕷️ Martial Arts Scraper (separate project)
    ├── CLI Interface (run, resume, validate, info, test)
    ├── Browser Pool (Playwright, single browser + multiple contexts)
    ├── Scraper Engine (orchestration, concurrent workers)
    ├── Decision-Maker Extractor (5-tier hierarchy)
    ├── Email Verifier (DNS MX + SMTP RCPT TO)
    ├── Summary Generator (14–20 sentence business summaries)
    ├── Widget Detector (8 booking systems)
    ├── Error Recovery System (circuit breaker, 4 strategies, 4 render engines)
    ├── Checkpoint Manager (progress persistence every 20 rows)
    └── Performance Manager (memory monitoring, adaptive throttling)
```

---

## 3. Technical Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend API** | NestJS (TypeScript) | REST API, WebSocket, cron jobs |
| **Database** | PostgreSQL 15+ | Primary data store with `pgcrypto`, `btree_gist` |
| **Booking UI** | React + Vite + TypeScript | Public-facing booking flow |
| **Admin Dashboard** | React + Vite + TypeScript | Internal CRM & analytics |
| **Styling** | Tailwind CSS (apps), Custom CSS (static pages) | UI styling |
| **Static Pages** | Vanilla HTML/CSS/JS | Marketing & proof pages |
| **3D Visualizations** | Three.js, D3.js, TopoJSON | Globe, maps, charts |
| **Email** | Nodemailer + Handlebars | Transactional & campaign emails |
| **Real-time** | Socket.IO (WebSocket) | Live booking updates |
| **Scraper** | Python 3.10+ / Playwright / aiohttp | Web scraping engine |
| **Reverse Proxy** | Nginx | Routing, rate limiting, security headers |
| **Deployment** | [Railway](https://railway.com/) | Hosting & CI/CD |

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RAILWAY.COM DEPLOYMENT                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐               │
│  │  Nginx   │──▶│  Booking UI  │   │    Admin     │               │
│  │  Reverse │   │  (React/Vite)│   │  Dashboard   │               │
│  │  Proxy   │──▶│  Port 5173   │   │  (React/Vite)│               │
│  │  Port 80 │   └──────────────┘   │  Port 5174   │               │
│  │          │──▶┌──────────────┐   └──────────────┘               │
│  │          │   │  Static Pages│                                    │
│  │          │   │  /live-proof │                                    │
│  │          │   │  /the-ghosts │                                    │
│  │          │   │  /the-system │                                    │
│  │          │   │  /vienna-... │                                    │
│  │          │   └──────────────┘                                    │
│  │          │                                                       │
│  │          │──▶┌──────────────────────────────────┐               │
│  │          │   │       NestJS Booking API          │               │
│  │          │   │         Port 3000                 │               │
│  └──────────┘   │                                  │               │
│                 │  ┌────────┐ ┌──────────────────┐ │               │
│                 │  │  Auth  │ │   Availability   │ │               │
│                 │  └────────┘ └──────────────────┘ │               │
│                 │  ┌────────┐ ┌──────────────────┐ │               │
│                 │  │Booking │ │    Provider       │ │               │
│                 │  └────────┘ └──────────────────┘ │               │
│                 │  ┌────────┐ ┌──────────────────┐ │               │
│                 │  │ Admin  │ │   Event Type     │ │               │
│                 │  └────────┘ └──────────────────┘ │               │
│                 │  ┌────────┐ ┌──────────────────┐ │               │
│                 │  │ Email  │ │  Notification    │ │               │
│                 │  └────────┘ └──────────────────┘ │               │
│                 │  ┌────────┐ ┌──────────────────┐ │               │
│                 │  │  WS    │ │     Health       │ │               │
│                 │  │Gateway │ └──────────────────┘ │               │
│                 │  └────────┘                      │               │
│                 └──────────────┬───────────────────┘               │
│                                │                                    │
│                 ┌──────────────▼───────────────────┐               │
│                 │        PostgreSQL 15+             │               │
│                 │  pgcrypto | btree_gist            │               │
│                 │  Exclusion constraints             │               │
│                 │  Optimistic locking                │               │
│                 └──────────────────────────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    SCRAPER (Separate Deployment)                     │
├─────────────────────────────────────────────────────────────────────┤
│  Python 3.10+ │ Playwright │ aiohttp │ dnspython │ aiosmtplib     │
│  5 workers │ 15 browser contexts │ Checkpoint every 20 rows        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Backend API — Booking API (NestJS)

### Module Breakdown

#### Auth Module (`booking-api/src/auth/`)
- **Registration** with bcrypt password hashing (10 salt rounds)
- **Login** returning JWT access token (1h) + refresh token (7d)
- **Refresh token rotation** — old token revoked, new pair issued
- **Token revocation** on logout (hashed in `refresh_tokens` table)
- **API token validation** for public embed widgets

#### Availability Module (`booking-api/src/availability/`)
- **Recurring rules** — weekly schedule per provider (day + start/end time)
- **Date overrides** — AVAILABLE or BLOCKED for specific dates
- **Slot generation** — timezone-aware computation using `date-fns` and `date-fns-tz`
- **Buffer handling** — configurable before/after buffers between bookings
- **Conflict detection** — removes already-booked slots from available pool

#### Booking Module (`booking-api/src/booking/`)
- **Booking creation** with transactional concurrency control (serializable isolation)
- **Discovery call booking** — extended flow capturing school info, challenges, budget, timeline
- **Qualification scoring** — automatic lead scoring based on student count, budget, timeline
- **Cancellation** with optimistic locking (`version` column)
- **Confirmation** flow with status transitions
- **Audit trail** — every state change logged in `booking_events`
- **Async notification dispatch** on booking events

#### Provider Module (`booking-api/src/provider/`)
- CRUD for provider profiles (bio, specialties, booking URL)
- Multi-tenant support via `tenant_id`
- Public booking URL resolution (`/providers/by-url/:tenantSlug/:bookingUrl`)
- Settings management (buffer, notice hours, advance days)

#### Event Type Module (`booking-api/src/event-type/`)
- Supports `ONE_ON_ONE`, `GROUP`, `CLASS` kinds
- Configurable duration, max attendees, pricing, color
- Slug-based lookup for public URLs
- Active/inactive toggle, approval requirement flag

#### Admin Module (`booking-api/src/admin/`)
- **Admin auth** — separate password-based login (bcrypt)
- **Discovery call management** — list, filter, search bookings with joined discovery data
- **Lead status management** — update lead_status (new → contacted → qualified → proposal → closed_won/closed_lost)
- **Follow-up scheduling** — set follow-up dates with notes
- **Analytics aggregation** — total bookings, status breakdown, conversion rate, month comparison, lead funnel, top states, budget/timeline/system breakdowns, weekly trend, today's calls, email stats
- **Admin settings** — key-value store for discovery call configuration
- **CSV export** — full lead data export with all discovery fields
- **Blackout date management** — prevent bookings on specific dates

#### Email Module (`booking-api/src/email/`)
- **Template system** — DB-stored templates with categories, Handlebars variables, versioning
- **Email queue** — persistent queue with retry logic (max 3 attempts)
- **Bulk send** — send template to multiple bookings at once
- **Preview** — render template with sample variables
- **Test send** — send test email to arbitrary address
- **Cron processing** — scheduled job processes pending queue items
- **ICS calendar generation** — `.ics` attachments for booking confirmations

#### Notification Module (`booking-api/src/notification/`)
- Email delivery via Nodemailer (SMTP)
- SMS placeholder (console logging, ready for provider integration)
- Template-based notifications for booking lifecycle events

#### WebSocket Gateway (`booking-api/src/websocket/`)
- Socket.IO-based real-time updates
- Events: booking created, confirmed, cancelled, availability changed
- Room-based subscriptions per provider

#### Health Module (`booking-api/src/health/`)
- `/api/v1/health` — basic health check
- `/api/v1/health/ready` — readiness probe (DB connectivity)

### Global Middleware & Security

| Feature | Implementation |
|---------|---------------|
| **Helmet** | Security headers (XSS, content-type, etc.) |
| **Compression** | gzip response compression |
| **CORS** | Configurable origins via `CORS_ORIGINS` env |
| **Validation** | Global `ValidationPipe` with whitelist + transform |
| **Rate Limiting** | `@nestjs/throttler` — global rate limiting |
| **Input Sanitization** | Custom `SanitizeInterceptor` — strips HTML/scripts from all string inputs |
| **Exception Filter** | Custom `HttpExceptionFilter` — consistent error response format |
| **Swagger** | Auto-generated API docs at `/api/docs` (non-production) |

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema` | Core tables: tenants, users, providers, event_types, availability_rules, availability_overrides, bookings, booking_events, notifications, api_tokens, refresh_tokens |
| `002_seed_data` | Demo tenant, admin user, sample provider with availability rules and event types |
| `003_discovery_calls` | Discovery call details table, admin_settings key-value store, lead status tracking |
| `004_email_system` | Email templates, email queue, blackout dates, 4 seeded templates (confirmation, reminder, follow-up, nurture) |

Migration runner: `booking-api/scripts/migrate.js` — custom Node.js script using `pg` Pool with tracking table `_migrations`.

---

## 5. Frontend — Booking UI (React)

**Stack**: React 18 + Vite + TypeScript + Tailwind CSS + date-fns + date-fns-tz

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `App` | `App.tsx` | Main orchestrator — 5-step booking flow state machine |
| `CalendarGrid` | `CalendarGrid.tsx` | Month-view calendar with date selection, past/future limits |
| `SlotPicker` | `SlotPicker.tsx` | Time slots grouped by morning/afternoon/evening |
| `SchoolDetailsForm` | `BookingForm.tsx` | 3-section form (school info, contact, goals) with validation |
| `ConfirmationView` | `ConfirmationView.tsx` | Full review of all entered data before submission |
| `SuccessView` | `SuccessView.tsx` | Post-booking confirmation with details |
| `StepIndicator` | `StepIndicator.tsx` | Visual step progress indicator |
| `EventTypeCard` | `EventTypeCard.tsx` | Event type display card (reusable) |

### API Client (`api.ts`)
- Fetch-based client with `/api/v1` base
- Methods: `getProviders`, `getProviderByUrl`, `getEventTypes`, `getSlots`, `createDiscoveryBooking`, `getBooking`
- Automatic error extraction from JSON responses

### Key UX Features
- **Timezone-aware** — auto-detects customer timezone via `Intl.DateTimeFormat`
- **60-day advance booking** window
- **Client-side validation** — required fields, email format
- **Loading states** with spinners
- **Error dismissal** — inline error banners
- **Back navigation** through all steps
- **Dark theme** — custom `mat-*` color palette

---

## 6. Frontend — Admin Dashboard (React)

**Stack**: React 18 + Vite + TypeScript + Tailwind CSS + date-fns + date-fns-tz

### Pages

| Page | Features |
|------|----------|
| **Dashboard** | 8 stat cards, today's calls, lead funnel, top states, budget/timeline/system breakdowns, 12-week bar chart |
| **Bookings** | Searchable/filterable table, detail modal with lead status + notes, CSV export |
| **Leads** | Kanban-style pipeline (6 columns), qualification scores, quick status buttons |
| **Emails** | 3 tabs: Templates (edit/preview/test), Queue (status filter), Blackout Dates (add/remove) |
| **Settings** | Discovery call config (duration, notice, advance, buffer, timezone), password change, logout |

### Auth System (`auth.tsx`)
- React Context-based auth provider
- `localStorage` token persistence (`admin_token`)
- Auto-redirect to login on 401
- Separate from main user auth (admin-only password)

### API Client (`api.ts`)
- Bearer token injection from localStorage
- 401 handling with auto-logout
- CSV response handling (`text/csv` content-type)
- Full CRUD for templates, queue, blackout dates, bookings, settings

---

## 7. Static Marketing Pages

All 4 pages share a consistent design language: dark theme, grain texture overlay, scroll progress bar, time paradox display (local vs Vienna time), and CTA forms.

### `/live-proof/` — Live Proof
- **Purpose**: Show real-time system performance with anonymized data
- **Interactive Elements**: School size slider, ROI calculator (5 inputs), conversion funnel SVG, video mosaic with autoplay, results ticker, D3.js county clustering map with TopoJSON
- **Libraries**: D3.js v7.9, TopoJSON Client v3.1

### `/the-ghosts/` — The Ghosts
- **Purpose**: Visualize the cost of missed leads ("ghosts")
- **Interactive Elements**: Animated loss counter, loss calculator, response time comparison, one-week timeline (3 modes), anonymized inquiry log, isometric dojo SVG cutaway with hotspots, ghost gallery (4 personas with modals), before/after split slider, 7-day accordion
- **Libraries**: Vanilla JS only

### `/the-system/` — The System
- **Purpose**: Explain how the AI booking system works
- **Interactive Elements**: Plain English / Technical Truth toggle, school-type journey map, scroll-activated node network (8 nodes), operational status dashboard, API latency chart (SVG), integration galaxy (orbital CSS animation), test message playground with personality sliders (formality/length/friendliness), D3.js county map
- **Libraries**: D3.js v7.9, TopoJSON Client v3.1

### `/vienna-to-every-dojo/` — Vienna to Every Dojo
- **Purpose**: Origin story — Vienna timezone advantage as a feature
- **Interactive Elements**: Arabic quote, scroll-activated timeline (6 milestones, 2015–2024), Three.js rotatable globe, philosophy cards, testimonials, Vienna studio placeholder (live feed ready), manifesto with SVG network visualization, active schools counter
- **Libraries**: Three.js v0.160

### Landing Page (`/`)
- **Purpose**: Main entry point and lead capture
- **Interactive Elements**: Day/night hero mode (based on local time), parallax missed-lead cards, 3D interactive globe (Three.js with 2D mobile fallback), time paradox display (local + Vienna), county dropdown, lead capture modal with validation, notification pill chaos loop, scroll-reveal animations, swipe navigation (touch devices)
- **Libraries**: Three.js, date-fns

---

## 8. Database Architecture

### PostgreSQL 15+ with Extensions

| Extension | Purpose |
|-----------|---------|
| `pgcrypto` | `gen_random_uuid()` for UUID primary keys |
| `btree_gist` | Exclusion constraints on time ranges (prevent double-booking) |

### Core Tables

| Table | Records | Purpose |
|-------|---------|---------|
| `tenants` | Multi-tenant root | School/organization isolation |
| `users` | Auth + profiles | Email/password, role (ADMIN/PROVIDER/MEMBER/PUBLIC) |
| `providers` | Bookable staff | Bio, specialties, booking URL, buffer settings |
| `event_types` | Session types | ONE_ON_ONE, GROUP, CLASS with duration/pricing |
| `availability_rules` | Weekly schedule | Day + time range per provider |
| `availability_overrides` | Date exceptions | AVAILABLE or BLOCKED overrides |
| `bookings` | Core records | Temporal booking with optimistic locking (`version`) |
| `booking_events` | Audit log | Every state change with actor, IP, user-agent |
| `discovery_calls` | Lead details | School info, challenges, budget, timeline, lead_status, qualification_score |
| `notifications` | Delivery tracking | Email/SMS with status (QUEUED→SENT→DELIVERED/FAILED) |
| `email_templates` | Campaign templates | HTML/text body, variables, versioning, categories |
| `email_queue` | Send queue | Scheduled sends with retry (max 3 attempts) |
| `blackout_dates` | No-booking dates | Date + reason |
| `admin_settings` | Config store | Key-value JSONB for runtime configuration |
| `api_tokens` | Widget auth | Scoped tokens for public booking embeds |
| `refresh_tokens` | JWT tracking | Hashed tokens with expiry and revocation |
| `_migrations` | Schema tracking | Applied migration history |

### Key Database Features

- **Exclusion constraint** on `bookings` — prevents overlapping active bookings per provider using `tstzrange` with GiST index
- **Optimistic locking** — `version` column on bookings for concurrent update safety
- **Partial indexes** — `idx_bookings_active` filters out cancelled bookings for query performance
- **Auto-updated timestamps** — `trigger_set_updated_at()` function on all mutable tables
- **Email template versioning** — auto-increment `version` on update via trigger
- **Enum types** — 7 custom PostgreSQL enums for type safety

---

## 9. Nginx Reverse Proxy & Production Config

### Development (`nginx/default.conf`)
- Upstream proxies: API (port 3000), Booking UI (port 5173), Admin (port 5174)
- WebSocket upgrade support at `/ws`
- Static page aliases for all 4 marketing pages
- Health check proxy at `/health`

### Production (`nginx/production.conf`)
- **Rate limiting zones**:
  - `api_auth` — 5 req/min (login/register)
  - `api_booking` — 10 req/min (booking creation)
  - `api_general` — 30 req/sec (all other API)
- **Security headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, CSP, HSTS
- **Gzip compression** (level 6) for text, CSS, JSON, JS, XML, SVG
- **SSL-ready** (commented out, ready for cert deployment)
- **Exploit blocking** — denies `.` paths, wp-admin, phpmyadmin, xmlrpc
- **Static asset caching** — 1h expiry with `Cache-Control: public`
- **Client body limit** — 10MB max upload
- **Keepalive** — 32 connections to API backend

---

## 10. Martial Arts Scraper (Python)

### Architecture

The scraper is a **separate Python project** (`martial-arts-scraper/`) designed for enterprise-grade web scraping of U.S. martial arts school websites.

### Core Components

| Module | Lines | Purpose |
|--------|-------|---------|
| `scraper_engine.py` | 779 | Main orchestration — coordinates all components |
| `browser_pool.py` | 683 | Playwright browser pooling (single browser + multiple contexts) |
| `decision_maker_extractor.py` | ~28K | 5-tier hierarchical name extraction (Owner → Master → Instructor → Director → Black Belt) |
| `email_verifier.py` | ~44K | DNS MX + SMTP RCPT TO validation with caching |
| `summary_generator.py` | ~51K | 14–20 sentence business summaries with booking system detection |
| `widget_detector.py` | ~58K | Detects 8 booking platforms (Mindbody, Zen Planner, Pike13, etc.) |
| `error_recovery.py` | ~45K | Circuit breaker, 4 scraping strategies, 4 render engines |
| `performance.py` | ~32K | Memory monitoring, adaptive throttling |
| `checkpoint_manager.py` | ~8K | Progress persistence every 20 rows |
| `csv_handler.py` | ~20K | Input/output CSV handling |
| `nlp_extractor.py` | ~30K | NLP-based entity extraction |
| `hybrid_scraper.py` | ~15K | Hybrid scraping (JS + static fallback) |
| `robots_handler.py` | ~3K | robots.txt compliance |
| `config_loader.py` | ~8K | YAML config + env var overrides |
| `cli.py` | ~11K | CLI interface (run, resume, validate, info, test) |

### Key Features

- **5 concurrent workers** with browser context pooling (15 max contexts, single browser instance)
- **4-level graceful degradation**: Primary (full JS) → Secondary (partial JS) → Tertiary (static HTML) → Emergency (homepage only)
- **Circuit breaker pattern** — stops hitting domains that consistently fail
- **Checkpoint/resume** — saves progress every 20 rows, resume from any checkpoint
- **Email verification cascade** — DNS MX → SMTP RCPT TO → next candidate
- **Verification caching** — disk-persistent cache (MX: 24h TTL, SMTP: 1h TTL)
- **8 booking system detectors** — Mindbody, Zen Planner, Pike13, Wodify, Kicksite, PerfectMind, Rainmaker, Member Solutions
- **22 user agents** with 5 browser personas for anti-detection
- **robots.txt compliance**
- **Configurable via YAML + environment variables**

---

## 11. Scraper Setbacks, Failures & Shortcomings

Based on analysis of the scraper codebase, PowerShell run scripts, error recovery system, and configuration, the following issues were uncovered during development and PowerShell runs:

### 11.1 Memory Pressure & Browser Crashes

**Problem**: The original implementation created one browser instance per context (~150MB each). With `browser_pool_size: 22`, this consumed **3.3GB+ RAM** on a Windows machine, causing OOM kills and browser crashes mid-run.

**Evidence**: The `browser_pool.py` explicitly documents this as a "key improvement over old implementation" — the rewrite moved to a single browser + multiple contexts architecture. The `performance.py` module (31K+ lines) exists solely to manage memory pressure with configurable warning (2.5GB) and critical (3GB) thresholds.

**What could've been done better**: Start with the single-browser architecture from day one. Profile memory usage before scaling concurrency.

### 11.2 Checkpoint Loss on Crash

**Problem**: Early runs processed hundreds of URLs without saving progress. When the scraper crashed (memory, network, or browser failure), all progress was lost and the entire batch had to restart.

**Evidence**: The `checkpoint_manager.py` and `resume.ps1` script were built specifically to address this. The checkpoint interval of 20 rows was tuned after losing large batches.

**What could've been done better**: Implement row-level persistence from the start (write each result immediately to output CSV). The current 20-row interval still risks losing up to 19 rows on crash.

### 11.3 SMTP Verification Failures & Timeouts

**Problem**: Many martial arts school email servers don't support SMTP RCPT TO verification — they either timeout, return false negatives, or block the connection entirely. Some ISPs block outbound port 25 traffic, making SMTP verification impossible from certain networks.

**Evidence**: The `email_verifier.py` (44K lines) implements extensive retry logic, exponential backoff, and a cascading verification system. The config has separate `smtp_timeout: 10` and `dns_timeout: 5` settings, indicating these were tuned after timeout issues. The verification cache with disk persistence was added to avoid re-verifying the same domains.

**What could've been done better**: 
- Use a third-party email verification API (e.g., ZeroBounce, NeverBounce) as primary, with SMTP as fallback
- Accept DNS MX validation as "likely valid" without SMTP verification
- Implement a domain-level blocklist for known non-responsive mail servers

### 11.4 Cloudflare / Bot Detection Blocking

**Problem**: Many martial arts school websites use Cloudflare or similar WAFs that detect and block automated browsers. The scraper encounters CAPTCHA challenges, JavaScript challenges, and outright 403 blocks.

**Evidence**: The `error_recovery.py` explicitly classifies `CLOUDFLARE`, `CAPTCHA`, and `BLOCKED` as distinct error types. The 4-level degradation strategy (Primary → Secondary → Tertiary → Emergency) was built to handle these scenarios. The 22 user agents and 5 browser personas in `config.yaml` are anti-detection measures.

**What could've been done better**:
- Integrate a residential proxy rotation service (e.g., Bright Data, Oxylabs)
- Use stealth Playwright plugins (`playwright-extra` with stealth plugin)
- Implement request fingerprint randomization (TLS fingerprint, HTTP/2 settings)

### 11.5 Rate Limiting & Connection Throttling

**Problem**: Running 5 concurrent workers against small hosting providers triggers rate limits. Some shared hosting servers return 429 or simply drop connections under concurrent load.

**Evidence**: The config has `min_delay_ms: 50`, `max_delay_ms: 300`, and `backoff_multiplier: 2.0`. The error recovery system has specific handling for `RATE_LIMITED` errors with configurable retry configs. The `performance.py` module implements adaptive throttling.

**What could've been done better**:
- Implement per-domain rate limiting (not just global)
- Respect `Retry-After` headers
- Reduce default workers to 3 for initial runs, scale up only after profiling

### 11.6 JavaScript-Heavy Sites Timing Out

**Problem**: Some martial arts school websites are built with heavy JavaScript frameworks (React, Angular) that take 10+ seconds to render. The default `page_timeout: 30` and `navigation_timeout: 45` were insufficient for some sites, while being too generous for simple static sites.

**Evidence**: The `network_idle_timeout: 5` setting and the separate navigation vs page timeouts indicate iterative tuning. The `hybrid_scraper.py` module was built as a fallback for sites where full JS rendering fails.

**What could've been done better**:
- Implement adaptive timeouts based on initial page load speed
- Use `networkidle` event detection instead of fixed timeouts
- Pre-classify sites by technology stack (static vs SPA) and adjust strategy

### 11.7 Decision-Maker Extraction Accuracy

**Problem**: Many martial arts school websites don't clearly list ownership information. Names are embedded in narrative text, image alt tags, or social media links. The 5-tier hierarchy sometimes extracts instructor names instead of owners.

**Evidence**: The `decision_maker_extractor.py` (28K lines) and `nlp_extractor.py` (30K lines) represent massive investment in extraction logic. The config defines ownership patterns ("owned by", "founded by", etc.) and martial arts-specific titles (Shihan, Sabumnim, Sifu, Sensei).

**What could've been done better**:
- Cross-reference extracted names with LinkedIn or business registration APIs
- Use LLM-based extraction (GPT-4 or Claude) for ambiguous cases
- Implement confidence scoring and flag low-confidence extractions for manual review

### 11.8 Output Path Confusion (Windows vs Linux)

**Problem**: The scraper was developed on Windows but designed for Linux deployment. Output paths (`/mnt/user-data/outputs/` vs `./outputs/`) caused confusion and file-not-found errors during PowerShell runs.

**Evidence**: The `config.yaml` has a comment `# Use ./outputs on Windows, /mnt/user-data/outputs on Linux`. The `setup.ps1` has explicit Windows detection logic for output directory creation.

**What could've been done better**: Use a single relative path (`./outputs/`) as default and let deployment configuration override it via environment variable.

### 11.9 Virtual Environment Activation Issues

**Problem**: PowerShell execution policy restrictions on Windows prevented `venv\Scripts\Activate.ps1` from running, causing the scraper to use system Python (wrong version or missing dependencies).

**Evidence**: The `run.ps1` script checks for venv existence and warns if not found. The main `setup.ps1` for the website project requires `powershell -ExecutionPolicy Bypass`.

**What could've been done better**: Use `py -m` prefix for all Python commands (bypasses venv activation) or provide a `.bat` fallback for restricted environments.

---

## 12. Platform Strengths

### Architecture Strengths

1. **Multi-tenant from day one** — `tenant_id` on all core tables enables future SaaS expansion
2. **Temporal integrity** — PostgreSQL exclusion constraints with `tstzrange` make double-booking physically impossible at the database level
3. **Optimistic locking** — `version` column on bookings prevents lost updates under concurrency
4. **Modular NestJS architecture** — each domain (auth, booking, availability, etc.) is a self-contained module
5. **Full audit trail** — every booking state change is logged with actor, timestamp, IP, and user-agent
6. **Timezone-aware throughout** — `date-fns-tz` used consistently across backend and frontend
7. **Migration-based schema management** — versioned SQL migrations with tracking table
8. **Global input sanitization** — custom interceptor strips malicious HTML/scripts from all inputs

### Product Strengths

9. **Complete discovery call pipeline** — from booking to lead qualification to email nurture to CSV export
10. **Qualification scoring** — automatic lead scoring based on school size, budget, and timeline
11. **Email automation** — template system with variables, queue, retry, preview, test send, and blackout dates
12. **4 conversion-optimized marketing pages** — each targeting a different psychological angle (proof, loss aversion, system trust, origin story)
13. **Interactive visualizations** — D3.js maps, Three.js globes, SVG charts, parallax effects
14. **Real-time updates** — WebSocket gateway for live booking/availability changes
15. **Admin analytics** — comprehensive dashboard with conversion rates, geographic data, budget/timeline breakdowns, weekly trends

### Security Strengths

16. **Production-ready Nginx config** — rate limiting per endpoint type, security headers, exploit path blocking
17. **bcrypt password hashing** — industry-standard with 10 salt rounds
18. **JWT with refresh rotation** — short-lived access tokens, revocable refresh tokens
19. **CORS configuration** — configurable allowed origins
20. **Helmet middleware** — comprehensive security headers
21. **API token scoping** — public embed tokens with limited permissions

### Scraper Strengths

22. **Enterprise error recovery** — circuit breaker, 4-level degradation, retry with backoff
23. **Checkpoint/resume** — never lose more than 20 rows of progress
24. **8 booking system detectors** — comprehensive martial arts industry coverage
25. **Email verification cascade** — DNS MX + SMTP with caching
26. **Anti-detection** — 22 user agents, 5 personas, rate limiting, robots.txt compliance

---

## 13. Known Weaknesses & Insecurities

### Backend Weaknesses

1. **No Redis cache layer** — the booking API uses raw PostgreSQL for everything; adding Redis would dramatically improve slot query performance and session management
2. **No pagination** — admin booking list and analytics queries return all results; will degrade with scale
3. **SMS is console-only** — notification service logs SMS to console instead of sending via Twilio/similar
4. **No email bounce handling** — email queue tracks send status but doesn't process bounces or complaints
5. **Single admin password** — no multi-user admin support; single shared password in `admin_settings`
6. **No RBAC in admin** — all admin actions available to anyone with the password
7. **Migration runner is custom** — no rollback safety, no dry-run mode, no migration locking for concurrent deploys
8. **No request logging/APM** — no structured request logging or application performance monitoring

### Frontend Weaknesses

9. **No client-side routing** — admin dashboard uses `useState` for page switching instead of React Router (no deep linking, no browser back button)
10. **No optimistic UI updates** — all mutations wait for server response before updating UI
11. **No offline support** — no service worker or offline-first architecture
12. **Hardcoded demo IDs** — booking UI uses hardcoded `DEMO_TENANT_ID` and `DEMO_PROVIDER_ID`

### Security Concerns

13. **Admin token in localStorage** — vulnerable to XSS attacks; should use httpOnly cookies
14. **No CSRF protection** — API relies on CORS only; no CSRF tokens for state-changing requests
15. **No rate limiting on booking UI** — only Nginx production config has rate limits; development has none
16. **SSL not yet configured** — production Nginx config has SSL commented out
17. **Database password in migration script** — `migrate.js` has a hardcoded fallback connection string

### Scraper Concerns

18. **No proxy rotation** — all requests come from a single IP, making blocking trivial
19. **SMTP port 25 often blocked** — ISP restrictions make email verification unreliable
20. **No LLM integration** — extraction relies on regex/NLP patterns; LLM would improve accuracy significantly
21. **Large codebase** — several modules exceed 30K+ lines, indicating potential over-engineering or need for refactoring

---

## 14. Deployment on Railway

### [Railway](https://railway.com/) Deployment Strategy

[Railway](https://railway.com/) is the chosen deployment and hosting platform for MatBoss. Railway provides:

- **Managed PostgreSQL** — provision a PostgreSQL 15+ instance directly from the Railway dashboard
- **Automatic deployments** — connect GitHub repo for CI/CD on every push
- **Environment variables** — secure configuration management for all secrets
- **Custom domains** — map `matboss.com` to Railway services
- **Horizontal scaling** — scale API instances independently
- **Built-in monitoring** — logs, metrics, and health checks
- **Zero-downtime deploys** — rolling deployments with health check validation

### Recommended Railway Service Layout

```
Railway Project: matboss
├── Service: booking-api (NestJS)
│   ├── Build: npm run build
│   ├── Start: node dist/main.js
│   ├── Port: 3000
│   └── Env: DATABASE_URL, JWT_SECRET, SMTP_*, CORS_ORIGINS
├── Service: booking-ui (React/Vite)
│   ├── Build: npm run build
│   ├── Static: dist/
│   └── Env: VITE_API_URL
├── Service: admin-dashboard (React/Vite)
│   ├── Build: npm run build
│   ├── Static: dist/
│   └── Env: VITE_API_URL
├── Service: static-sites (Nginx)
│   ├── Serves: /, /live-proof, /the-ghosts, /the-system, /vienna-to-every-dojo
│   └── Config: nginx/production.conf
├── Database: PostgreSQL 15+
│   └── Auto-provisioned by Railway
└── (Optional) Service: scraper (Python)
    ├── Build: pip install -r requirements.txt && playwright install chromium
    └── Run: python scraper.py run --input jobs/input.csv
```

### Railway Environment Variables

```env
# Database (auto-provided by Railway PostgreSQL plugin)
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<random-64-char>

# SMTP (email delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=matboss@domain.com
SMTP_PASS=<app-password>
SMTP_FROM="MatBoss <matboss@domain.com>"

# CORS
CORS_ORIGINS=https://matboss.com,https://book.matboss.com,https://admin.matboss.com

# Admin
ADMIN_DEFAULT_PASSWORD=<bcrypt-hash>

# App
NODE_ENV=production
PORT=3000
```

---

## 15. Improvement Roadmap & Future Solutions

### High Priority

| # | Improvement | Impact | Effort |
|---|------------|--------|--------|
| 1 | **Add Redis caching** — cache availability slots, session data, rate limiting | High | Medium |
| 2 | **Implement pagination** — cursor-based pagination on all list endpoints | High | Low |
| 3 | **Multi-admin support** — replace single password with user-based admin auth + RBAC | High | Medium |
| 4 | **Move admin token to httpOnly cookies** — eliminate XSS token theft vector | High | Low |
| 5 | **Add React Router to admin dashboard** — enable deep linking and browser navigation | Medium | Low |
| 6 | **Integrate Twilio/SMS provider** — replace console logging with actual SMS delivery | High | Low |
| 7 | **Add proxy rotation to scraper** — residential proxies for anti-detection | High | Medium |
| 8 | **LLM-based extraction** — use GPT-4/Claude for decision-maker extraction on ambiguous sites | High | Medium |

### Medium Priority

| # | Improvement | Impact | Effort |
|---|------------|--------|--------|
| 9 | **Email bounce/complaint handling** — webhook integration with SendGrid/SES for deliverability | Medium | Medium |
| 10 | **Structured logging + APM** — integrate Pino + OpenTelemetry for observability | Medium | Medium |
| 11 | **Row-level scraper persistence** — write each result immediately instead of batching 20 | Medium | Low |
| 12 | **Third-party email verification API** — ZeroBounce/NeverBounce as primary, SMTP as fallback | Medium | Low |
| 13 | **Adaptive scraper timeouts** — classify sites by tech stack and adjust strategy automatically | Medium | Medium |
| 14 | **CSRF tokens** — add CSRF protection for all state-changing API endpoints | Medium | Low |
| 15 | **SSL/TLS deployment** — enable HTTPS in Nginx production config on [Railway](https://railway.com/) | High | Low |

### Low Priority / Future

| # | Improvement | Impact | Effort |
|---|------------|--------|--------|
| 16 | **Webhook integrations** — Zapier/Make.com triggers for booking events | Medium | Medium |
| 17 | **Calendar sync** — Google Calendar / Outlook integration for providers | Medium | High |
| 18 | **Mobile app** — React Native companion for admin dashboard | Low | High |
| 19 | **A/B testing** — test different booking form layouts and CTA copy | Low | Medium |
| 20 | **Internationalization** — multi-language support for booking UI | Low | Medium |
| 21 | **Scraper distributed mode** — Redis-based work distribution across multiple nodes | Low | High |
| 22 | **Payment integration** — Stripe for paid consultation bookings | Medium | Medium |

---

> **Document generated from full source code analysis of `matboss-website` and `martial-arts-scraper` projects.**
> **Deployment target: [https://railway.com/](https://railway.com/)**
