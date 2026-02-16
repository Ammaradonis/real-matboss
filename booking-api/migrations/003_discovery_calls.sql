CREATE TABLE IF NOT EXISTS discovery_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  school_name VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  county VARCHAR(120) NOT NULL,
  active_students INT NOT NULL,
  instructor_count INT NOT NULL DEFAULT 1,
  current_system VARCHAR(120),
  scheduling_challenges TEXT,
  budget_range VARCHAR(120),
  implementation_timeline VARCHAR(120),
  lead_status lead_status_enum NOT NULL DEFAULT 'new',
  follow_up_at TIMESTAMPTZ,
  admin_notes TEXT,
  qualification_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key VARCHAR(140) NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);

DROP TRIGGER IF EXISTS trg_discovery_calls_updated_at ON discovery_calls;
CREATE TRIGGER trg_discovery_calls_updated_at
BEFORE UPDATE ON discovery_calls
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER trg_admin_settings_updated_at
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

INSERT INTO admin_settings (tenant_id, key, value)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'discovery.callDurationMinutes', '30'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'discovery.minimumNoticeHours', '24'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'discovery.maximumAdvanceDays', '60'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'discovery.bufferMinutes', '15'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'discovery.adminTimezone', '"ET"'::jsonb)
ON CONFLICT (tenant_id, key) DO NOTHING;
