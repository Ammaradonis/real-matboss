UPDATE providers
SET
  name = 'MatBoss Pacific Operations',
  bio = 'California-based discovery ops for martial arts school owners',
  specialties = 'Owner availability planning, lead follow-up, enrollment operations',
  booking_url = 'matboss-discovery',
  time_zone = 'America/Los_Angeles',
  buffer_before_minutes = 10,
  buffer_after_minutes = 10,
  minimum_notice_hours = 12,
  maximum_advance_days = 60,
  updated_at = NOW()
WHERE id = '44444444-4444-4444-4444-444444444444';

UPDATE users
SET
  time_zone = 'America/Los_Angeles',
  updated_at = NOW()
WHERE id = '33333333-3333-3333-3333-333333333333';

UPDATE event_types
SET
  name = 'MatBoss Discovery Call',
  slug = 'discovery-30',
  kind = 'ONE_ON_ONE',
  duration_minutes = 30,
  max_attendees = 1,
  color = '#62d0ff',
  requires_approval = FALSE,
  is_active = TRUE,
  updated_at = NOW()
WHERE id = '55555555-5555-5555-5555-555555555551';

INSERT INTO admin_settings (tenant_id, key, value)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'discovery.minimumNoticeHours', '12'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'discovery.bufferMinutes', '10'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'discovery.adminTimezone', '"PT"'::jsonb)
ON CONFLICT (tenant_id, key)
DO UPDATE
SET
  value = EXCLUDED.value,
  updated_at = NOW();

DELETE FROM availability_overrides
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
  AND provider_id = '44444444-4444-4444-4444-444444444444'
  AND reason LIKE 'Seeded:%';

DELETE FROM availability_rules
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
  AND provider_id = '44444444-4444-4444-4444-444444444444'
  AND (event_type_id = '55555555-5555-5555-5555-555555555551' OR event_type_id IS NULL);

INSERT INTO availability_rules (
  tenant_id,
  provider_id,
  event_type_id,
  day_of_week,
  start_time,
  end_time,
  time_zone
)
VALUES
  -- Monday
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 1, '09:30', '11:30', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 1, '13:00', '15:00', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 1, '19:30', '21:00', 'America/Los_Angeles'),
  -- Tuesday
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 2, '09:30', '11:30', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 2, '13:00', '15:00', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 2, '19:30', '21:00', 'America/Los_Angeles'),
  -- Wednesday
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 3, '09:30', '11:30', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 3, '13:00', '15:00', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 3, '19:30', '21:00', 'America/Los_Angeles'),
  -- Thursday
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 4, '09:30', '11:30', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 4, '13:00', '15:00', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 4, '19:30', '21:00', 'America/Los_Angeles'),
  -- Friday
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 5, '09:30', '11:30', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 5, '13:00', '15:00', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 5, '19:30', '21:00', 'America/Los_Angeles'),
  -- Saturday
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 6, '08:30', '11:00', 'America/Los_Angeles'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 6, '14:00', '16:30', 'America/Los_Angeles'),
  -- Sunday
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 0, '10:00', '13:00', 'America/Los_Angeles');

WITH week_offsets AS (
  SELECT generate_series(0, 11) AS week_offset
)
INSERT INTO availability_overrides (
  tenant_id,
  provider_id,
  event_type_id,
  start_ts,
  end_ts,
  kind,
  reason
)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555551'::uuid,
  (
    (
      date_trunc('week', timezone('America/Los_Angeles', NOW()))::date
      + (week_offset * 7)
      + 1
    )::timestamp
    + TIME '14:00'
  ) AT TIME ZONE 'America/Los_Angeles',
  (
    (
      date_trunc('week', timezone('America/Los_Angeles', NOW()))::date
      + (week_offset * 7)
      + 1
    )::timestamp
    + TIME '14:30'
  ) AT TIME ZONE 'America/Los_Angeles',
  'BLOCKED'::override_kind_enum,
  'Seeded: Tuesday staff huddle'
FROM week_offsets
UNION ALL
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555551'::uuid,
  (
    (
      date_trunc('week', timezone('America/Los_Angeles', NOW()))::date
      + (week_offset * 7)
      + 3
    )::timestamp
    + TIME '10:30'
  ) AT TIME ZONE 'America/Los_Angeles',
  (
    (
      date_trunc('week', timezone('America/Los_Angeles', NOW()))::date
      + (week_offset * 7)
      + 3
    )::timestamp
    + TIME '11:00'
  ) AT TIME ZONE 'America/Los_Angeles',
  'BLOCKED'::override_kind_enum,
  'Seeded: Thursday prospect follow-up block'
FROM week_offsets
UNION ALL
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555551'::uuid,
  (
    (
      date_trunc('week', timezone('America/Los_Angeles', NOW()))::date
      + (week_offset * 7)
      + 6
    )::timestamp
    + TIME '11:30'
  ) AT TIME ZONE 'America/Los_Angeles',
  (
    (
      date_trunc('week', timezone('America/Los_Angeles', NOW()))::date
      + (week_offset * 7)
      + 6
    )::timestamp
    + TIME '12:00'
  ) AT TIME ZONE 'America/Los_Angeles',
  'BLOCKED'::override_kind_enum,
  'Seeded: Sunday owner family window'
FROM week_offsets;
