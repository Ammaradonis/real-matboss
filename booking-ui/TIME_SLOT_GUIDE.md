# Time Slot Guide (Pacific / California)

This project seeds booking availability from:

- `booking-api/migrations/005_pacific_california_availability.sql`

The booking UI reads slots from `GET /api/v1/providers/:providerId/availability`, so this migration is the single source for default seeded slots.

## 1) Edit Weekly Availability Rules

In `booking-api/migrations/005_pacific_california_availability.sql`, update the `INSERT INTO availability_rules (...) VALUES ...` block.

Current schedule uses Pacific Time (`America/Los_Angeles`) and includes weekends.

Day mapping:

- `0` = Sunday
- `1` = Monday
- `2` = Tuesday
- `3` = Wednesday
- `4` = Thursday
- `5` = Friday
- `6` = Saturday

Each row shape:

```sql
(
  tenant_id,
  provider_id,
  event_type_id,
  day_of_week,
  start_time,
  end_time,
  time_zone
)
```

Example (add a Sunday afternoon window):

```sql
('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 0, '15:00', '17:00', 'America/Los_Angeles')
```

## 2) Edit Realistic Exception Blocks (Overrides)

In the same migration, update the `INSERT INTO availability_overrides` section.

- `kind = 'BLOCKED'` removes slots in that period.
- Use this for owner meetings, family windows, tournaments, etc.

If you do not need seeded exceptions, remove that section entirely.

## 3) Apply Changes

From `booking-api`:

```bash
npm run migrate
```

If your environment only applies new migrations once and you are iterating locally, create a new migration (for example `006_adjust_owner_schedule.sql`) instead of editing `005`.

## 4) Verify in API + UI

1. Fetch slots for a target date:

```bash
curl "http://localhost:3000/api/v1/providers/44444444-4444-4444-4444-444444444444/availability?from=2026-03-07T00:00:00.000Z&to=2026-03-08T00:00:00.000Z&viewerTz=America/Los_Angeles&eventTypeId=55555555-5555-5555-5555-555555555551" -H "x-tenant-id: 11111111-1111-1111-1111-111111111111"
```

2. Open `booking-ui` and confirm:
- Step 1 date selection includes weekend days.
- Step 2 shows the expected Pacific-time slot windows.

## 5) Keep It Realistic for Martial Arts Owners

Recommended pattern:

- Weekdays: morning admin windows + midday owner windows + later evening follow-up windows.
- Weekends: shorter consultation blocks (Sat + Sun), not full-day availability.
- Add blocked overrides for recurring events (belt tests, tournaments, staff meetings).

