/* eslint-disable no-console */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:946732@localhost:5432/matboss',
});

async function seed() {
  await pool.query(`
    INSERT INTO api_tokens (tenant_id, provider_id, token, scope, is_active)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      '44444444-4444-4444-4444-444444444444',
      'demo-widget-token',
      'widget:read',
      true
    )
    ON CONFLICT (token) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO bookings (
      tenant_id,
      provider_id,
      event_type_id,
      customer_name,
      customer_email,
      public_token,
      start_ts,
      end_ts,
      status
    )
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      '44444444-4444-4444-4444-444444444444',
      '55555555-5555-5555-5555-555555555551',
      'Demo School Owner',
      'owner@example.com',
      gen_random_uuid()::text,
      NOW() + INTERVAL '2 days',
      NOW() + INTERVAL '2 days 30 minutes',
      'CONFIRMED'
    )
    ON CONFLICT DO NOTHING;
  `);

  console.log('Seed complete');
}

seed()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
