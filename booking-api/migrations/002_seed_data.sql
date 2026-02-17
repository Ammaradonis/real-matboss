DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(160);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role_enum DEFAULT 'MEMBER';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS time_zone VARCHAR(100) DEFAULT 'UTC';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'firstName'
    ) THEN
      ALTER TABLE users ALTER COLUMN "firstName" SET DEFAULT '';
      UPDATE users SET "firstName" = '' WHERE "firstName" IS NULL;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'lastName'
    ) THEN
      ALTER TABLE users ALTER COLUMN "lastName" SET DEFAULT '';
      UPDATE users SET "lastName" = '' WHERE "lastName" IS NULL;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'createdAt'
    ) THEN
      ALTER TABLE users ALTER COLUMN "createdAt" SET DEFAULT NOW();
      UPDATE users SET "createdAt" = NOW() WHERE "createdAt" IS NULL;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'updatedAt'
    ) THEN
      ALTER TABLE users ALTER COLUMN "updatedAt" SET DEFAULT NOW();
      UPDATE users SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'providers') THEN
    ALTER TABLE providers ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE providers ADD COLUMN IF NOT EXISTS booking_url VARCHAR(140);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_types') THEN
    ALTER TABLE event_types ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE event_types ADD COLUMN IF NOT EXISTS slug VARCHAR(140);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'availability_rules') THEN
    ALTER TABLE availability_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug_unique ON tenants(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email_unique ON users(tenant_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_tenant_booking_url_unique ON providers(tenant_id, booking_url);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_types_provider_slug_unique ON event_types(provider_id, slug);

INSERT INTO tenants (id, name, slug)
VALUES ('11111111-1111-1111-1111-111111111111', 'MatBoss Demo Tenant', 'matboss-demo')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (id, tenant_id, email, password, password_hash, name, time_zone)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'admin@matboss.online',
  COALESCE(
    NULLIF(current_setting('matboss.admin_password_hash', true), ''),
    '$2b$10$hD2K9Lhdg4f9ymJv9fVh5Ot8gTGe0rXe3G5UpiRaY1oCbcnZ6FQ4W'
  ),
  COALESCE(
    NULLIF(current_setting('matboss.admin_password_hash', true), ''),
    '$2b$10$hD2K9Lhdg4f9ymJv9fVh5Ot8gTGe0rXe3G5UpiRaY1oCbcnZ6FQ4W'
  ),
  'MatBoss Admin',
  'Europe/Vienna'
)
ON CONFLICT (tenant_id, email) DO NOTHING;

INSERT INTO users (id, tenant_id, email, password, password_hash, name, time_zone)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'provider@matboss.online',
  '$2b$10$hD2K9Lhdg4f9ymJv9fVh5Ot8gTGe0rXe3G5UpiRaY1oCbcnZ6FQ4W',
  '$2b$10$hD2K9Lhdg4f9ymJv9fVh5Ot8gTGe0rXe3G5UpiRaY1oCbcnZ6FQ4W',
  'Ammar Alkheder',
  'Europe/Vienna'
)
ON CONFLICT (tenant_id, email) DO NOTHING;

DO $$
DECLARE
  role_type TEXT;
  admin_label TEXT;
  provider_label TEXT;
BEGIN
  SELECT c.udt_name
  INTO role_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'users'
    AND c.column_name = 'role';

  IF role_type IS NULL THEN
    RETURN;
  END IF;

  SELECT e.enumlabel
  INTO admin_label
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typname = role_type
    AND e.enumlabel IN ('ADMIN', 'admin')
  ORDER BY CASE WHEN e.enumlabel = 'ADMIN' THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT e.enumlabel
  INTO provider_label
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typname = role_type
    AND e.enumlabel IN ('PROVIDER', 'provider')
  ORDER BY CASE WHEN e.enumlabel = 'PROVIDER' THEN 0 ELSE 1 END
  LIMIT 1;

  IF admin_label IS NOT NULL THEN
    EXECUTE format(
      'UPDATE users SET role = %L::%I WHERE id = %L',
      admin_label,
      role_type,
      '22222222-2222-2222-2222-222222222222'
    );
  END IF;

  IF provider_label IS NOT NULL THEN
    EXECUTE format(
      'UPDATE users SET role = %L::%I WHERE id = %L',
      provider_label,
      role_type,
      '33333333-3333-3333-3333-333333333333'
    );
  END IF;
END
$$;

INSERT INTO providers (
  id,
  tenant_id,
  user_id,
  name,
  bio,
  specialties,
  booking_url,
  time_zone,
  buffer_before_minutes,
  buffer_after_minutes,
  minimum_notice_hours,
  maximum_advance_days
)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'Ammar Alkheder',
  'Founder in Vienna serving U.S. martial arts schools',
  'Discovery calls, lead qualification, operations',
  'ammar-vienna',
  'America/New_York',
  15,
  15,
  24,
  60
)
ON CONFLICT (tenant_id, booking_url) DO NOTHING;

INSERT INTO event_types (
  id,
  tenant_id,
  provider_id,
  name,
  slug,
  kind,
  duration_minutes,
  max_attendees,
  price_cents,
  color,
  requires_approval,
  is_active
)
VALUES
  (
    '55555555-5555-5555-5555-555555555551',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    '30m Discovery Call',
    'discovery-30',
    'ONE_ON_ONE',
    30,
    1,
    0,
    '#1f7aec',
    FALSE,
    TRUE
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'Group Strategy Session',
    'group-strategy',
    'GROUP',
    60,
    8,
    0,
    '#0ea5a6',
    TRUE,
    TRUE
  )
ON CONFLICT (provider_id, slug) DO NOTHING;

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
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 1, '09:00', '17:00', 'America/New_York'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 2, '09:00', '17:00', 'America/New_York'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 3, '09:00', '17:00', 'America/New_York'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 4, '09:00', '17:00', 'America/New_York'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 5, '09:00', '17:00', 'America/New_York')
ON CONFLICT DO NOTHING;
