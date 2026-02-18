/* eslint-disable no-console */
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const FORCE_SEED = /^(1|true|yes)$/i.test(String(process.env.FORCE_SEED ?? ''));
const SEED_KEY = process.env.SEED_KEY || 'default-seed-v1';
const TENANT_ID = process.env.SEED_TENANT_ID || '11111111-1111-1111-1111-111111111111';
const TENANT_NAME = process.env.SEED_TENANT_NAME || 'MatBoss Demo Tenant';
const TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'matboss-demo';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '22222222-2222-2222-2222-222222222222';
const ADMIN_EMAIL = (process.env.ADMIN_LOGIN_EMAIL || 'admin@matboss.online').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_LOGIN_PASSWORD || 'password123';
const ADMIN_NAME = process.env.ADMIN_LOGIN_NAME || 'MatBoss Admin';
const ADMIN_TIME_ZONE = process.env.ADMIN_LOGIN_TIME_ZONE || 'Europe/Vienna';

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

async function resolveAdminRoleLabel(client) {
  const roleRows = await client.query(
    `
      SELECT enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'user_role_enum'
        AND lower(e.enumlabel) = 'admin'
      ORDER BY CASE WHEN e.enumlabel = 'ADMIN' THEN 0 ELSE 1 END
      LIMIT 1
    `,
  );
  return roleRows.rows[0]?.enumlabel ?? 'ADMIN';
}

async function hasColumn(client, tableName, columnName) {
  const result = await client.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [tableName, columnName],
  );
  return result.rowCount > 0;
}

async function ensureAdminCredentials(client) {
  const adminRole = await resolveAdminRoleLabel(client);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const usersHasPassword = await hasColumn(client, 'users', 'password');
  const usersHasIsActive = await hasColumn(client, 'users', 'is_active');

  await client.query(
    `
      INSERT INTO tenants (id, name, slug)
      VALUES ($1, $2, $3)
      ON CONFLICT (slug) DO NOTHING
    `,
    [TENANT_ID, TENANT_NAME, TENANT_SLUG],
  );

  const updated = await client.query(
    `
      UPDATE users
      SET
        password_hash = $1,
        name = $2,
        time_zone = $3,
        updated_at = NOW()
      WHERE tenant_id = $4
        AND (id = $5 OR lower(email) = lower($6))
    `,
    [passwordHash, ADMIN_NAME, ADMIN_TIME_ZONE, TENANT_ID, ADMIN_USER_ID, ADMIN_EMAIL],
  );

  if (usersHasPassword) {
    await client.query(
      `
        UPDATE users
        SET password = $1
        WHERE tenant_id = $2
          AND (id = $3 OR lower(email) = lower($4))
      `,
      [passwordHash, TENANT_ID, ADMIN_USER_ID, ADMIN_EMAIL],
    );
  }

  if (!updated.rowCount) {
    if (usersHasPassword && usersHasIsActive) {
      await client.query(
        `
          INSERT INTO users (
            id,
            tenant_id,
            email,
            password,
            password_hash,
            name,
            role,
            time_zone,
            is_active
          )
          VALUES ($1, $2, $3, $4, $4, $5, $6::user_role_enum, $7, true)
          ON CONFLICT (tenant_id, email)
          DO UPDATE SET
            password = EXCLUDED.password,
            password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            time_zone = EXCLUDED.time_zone
        `,
        [ADMIN_USER_ID, TENANT_ID, ADMIN_EMAIL, passwordHash, ADMIN_NAME, adminRole, ADMIN_TIME_ZONE],
      );
    } else if (usersHasPassword) {
      await client.query(
        `
          INSERT INTO users (
            id,
            tenant_id,
            email,
            password,
            password_hash,
            name,
            role,
            time_zone
          )
          VALUES ($1, $2, $3, $4, $4, $5, $6::user_role_enum, $7)
          ON CONFLICT (tenant_id, email)
          DO UPDATE SET
            password = EXCLUDED.password,
            password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            time_zone = EXCLUDED.time_zone
        `,
        [ADMIN_USER_ID, TENANT_ID, ADMIN_EMAIL, passwordHash, ADMIN_NAME, adminRole, ADMIN_TIME_ZONE],
      );
    } else if (usersHasIsActive) {
      await client.query(
        `
          INSERT INTO users (
            id,
            tenant_id,
            email,
            password_hash,
            name,
            role,
            time_zone,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6::user_role_enum, $7, true)
          ON CONFLICT (tenant_id, email)
          DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            time_zone = EXCLUDED.time_zone
        `,
        [ADMIN_USER_ID, TENANT_ID, ADMIN_EMAIL, passwordHash, ADMIN_NAME, adminRole, ADMIN_TIME_ZONE],
      );
    } else {
      await client.query(
        `
          INSERT INTO users (
            id,
            tenant_id,
            email,
            password_hash,
            name,
            role,
            time_zone
          )
          VALUES ($1, $2, $3, $4, $5, $6::user_role_enum, $7)
          ON CONFLICT (tenant_id, email)
          DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            time_zone = EXCLUDED.time_zone
        `,
        [ADMIN_USER_ID, TENANT_ID, ADMIN_EMAIL, passwordHash, ADMIN_NAME, adminRole, ADMIN_TIME_ZONE],
      );
    }
  }

  console.log(`Admin credentials ensured for ${ADMIN_EMAIL}`);
}

async function seed() {
  await ensureSeedTrackingTable();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await ensureAdminCredentials(client);

    if (!FORCE_SEED && (await wasSeedAlreadyApplied(SEED_KEY))) {
      await client.query('COMMIT');
      console.log(`Seed "${SEED_KEY}" already applied. Skipping non-auth seed rows.`);
      return;
    }

    await client.query(
      `
        INSERT INTO api_tokens (tenant_id, provider_id, token, scope, is_active)
        VALUES (
          $1,
          '44444444-4444-4444-4444-444444444444',
          'demo-widget-token',
          'widget:read',
          true
        )
        ON CONFLICT (token) DO NOTHING;
      `,
      [TENANT_ID],
    );

    await client.query(
      `
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
          $1,
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
      `,
      [TENANT_ID],
    );

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
