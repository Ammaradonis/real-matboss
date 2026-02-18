/* eslint-disable no-console */
const { Pool } = require('pg');

const FORCE_SEED = /^(1|true|yes)$/i.test(String(process.env.FORCE_SEED ?? ''));
const SEED_KEY = process.env.SEED_KEY || 'default-seed-v1';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:946732@localhost:5432/matboss',
});

async function ensureSeedTrackingTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _seed_runs (
      seed_key TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function wasSeedAlreadyApplied(seedKey) {
  const result = await pool.query(
    'SELECT 1 FROM _seed_runs WHERE seed_key = $1',
    [seedKey],
  );
  return result.rowCount > 0;
}

async function seed() {
  await ensureSeedTrackingTable();
  if (!FORCE_SEED && (await wasSeedAlreadyApplied(SEED_KEY))) {
    console.log(`Seed "${SEED_KEY}" already applied. Skipping.`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
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

    await client.query(`
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
        'demo-discovery-booking',
        NOW() + INTERVAL '2 days',
        NOW() + INTERVAL '2 days 30 minutes',
        'CONFIRMED'
      )
      ON CONFLICT (public_token) DO NOTHING;
    `);

    await client.query(
      `
        INSERT INTO _seed_runs (seed_key, applied_at)
        VALUES ($1, NOW())
        ON CONFLICT (seed_key)
        DO UPDATE SET applied_at = EXCLUDED.applied_at
      `,
      [SEED_KEY],
    );

    await client.query('COMMIT');
    console.log(`Seed complete (${SEED_KEY})`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
