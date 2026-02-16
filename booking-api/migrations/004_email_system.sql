CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key VARCHAR(120) NOT NULL,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(120) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key, version)
);

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  "to" VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  status email_queue_status_enum NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blackout_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider_id, date)
);

DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON email_templates;
CREATE TRIGGER trg_email_templates_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_email_queue_updated_at ON email_queue;
CREATE TRIGGER trg_email_queue_updated_at
BEFORE UPDATE ON email_queue
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE FUNCTION trigger_email_template_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_template_version ON email_templates;
CREATE TRIGGER trg_email_template_version
BEFORE UPDATE ON email_templates
FOR EACH ROW
WHEN (OLD.html_body IS DISTINCT FROM NEW.html_body OR OLD.subject IS DISTINCT FROM NEW.subject)
EXECUTE FUNCTION trigger_email_template_version();

INSERT INTO email_templates (tenant_id, key, name, category, subject, html_body, text_body, variables, version)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'booking-confirmation',
    'Booking Confirmation',
    'transactional',
    'Your MatBoss discovery call is confirmed',
    '<h1>Confirmed</h1><p>Hello {{name}}, your call is on {{start}}.</p>',
    'Hello {{name}}, your call is on {{start}}.',
    '["name","start"]'::jsonb,
    1
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'booking-reminder',
    'Booking Reminder',
    'transactional',
    'Reminder: your MatBoss call starts soon',
    '<h1>Reminder</h1><p>Your call starts at {{start}}.</p>',
    'Your call starts at {{start}}.',
    '["start"]'::jsonb,
    1
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'follow-up',
    'Follow-up Email',
    'followup',
    'Next steps for your dojo growth',
    '<p>Hi {{name}}, here are your next steps.</p>',
    'Hi {{name}}, here are your next steps.',
    '["name"]'::jsonb,
    1
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'nurture-1',
    'Nurture Sequence #1',
    'nurture',
    'How MatBoss cuts response times below 3 minutes',
    '<p>See how we run timezone-aware booking from Vienna.</p>',
    'See how we run timezone-aware booking from Vienna.',
    '[]'::jsonb,
    1
  )
ON CONFLICT (tenant_id, key, version) DO NOTHING;
