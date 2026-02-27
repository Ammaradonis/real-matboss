# Time Slot Guide (Pacific / California)

## Source of truth

Seeded owner availability lives in:

- `booking-api/migrations/006_realistic_pacific_owner_schedule.sql`

The booking UI does not hardcode slots. It always reads generated slots from:

- `GET /api/v1/providers/:providerId/availability`

## Current weekly template (Pacific time)

`America/Los_Angeles` schedule currently seeded:

- Sunday (`0`): `10:00-12:00`, `16:30-18:00`
- Monday (`1`): `08:00-09:30`, `12:30-14:00`, `20:30-22:00`
- Tuesday (`2`): `09:00-10:30`, `13:30-15:00`, `20:00-21:30`
- Wednesday (`3`): `08:30-10:00`, `11:30-13:00`, `19:45-21:15`
- Thursday (`4`): `09:00-10:30`, `13:00-14:30`, `20:15-21:45`
- Friday (`5`): `09:30-11:00`, `14:00-15:30`, `18:30-20:00`
- Saturday (`6`): `08:00-10:30`, `15:00-17:00`

This mirrors martial-arts owner behavior: short admin blocks, midday consults, and after-class evening calls, with reduced weekend hours.

## Change recurring slot windows

1. Open `booking-api/migrations/006_realistic_pacific_owner_schedule.sql`.
2. Edit the `INSERT INTO availability_rules (...) VALUES ...` block.
3. Keep day mapping:
- `0` Sunday
- `1` Monday
- `2` Tuesday
- `3` Wednesday
- `4` Thursday
- `5` Friday
- `6` Saturday
4. Keep `time_zone` as `America/Los_Angeles`.

Row format:

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

## Change realistic exceptions (blocked/open windows)

Use `availability_overrides` in the same migration:

- `kind = 'BLOCKED'` removes slots during owner commitments.
- `kind = 'AVAILABLE'` adds extra ad-hoc consult windows.

Current examples include:

- Tuesday belt-testing prep block.
- Thursday instructor sync block.
- Saturday belt-testing block.
- Sunday family window block.
- Every-other-week Wednesday overflow consult hour.

## Apply and verify

From `booking-api`:

```bash
npm run migrate
```

Then verify quickly:

```bash
curl "http://localhost:3000/api/v1/providers/44444444-4444-4444-4444-444444444444/availability?from=2026-03-07T00:00:00.000Z&to=2026-03-08T00:00:00.000Z&viewerTz=America/Los_Angeles&eventTypeId=55555555-5555-5555-5555-555555555551" -H "x-tenant-id: 11111111-1111-1111-1111-111111111111"
```

In `booking-ui`, check:

- Step 1 shows weekends inside the 60-day window.
- Step 2 reflects updated Pacific-time slots.

## Safe workflow for future edits

If `006` is already applied in shared environments, create a new file like:

- `booking-api/migrations/007_adjust_owner_schedule.sql`

and repeat the same `DELETE + INSERT` pattern. This keeps history clean and makes roll-forward changes easy.
