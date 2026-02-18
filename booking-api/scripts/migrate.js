/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const DB_CONNECT_RETRIES = Number(process.env.DB_CONNECT_RETRIES ?? 30);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? 3000);
const MIGRATE_FORCE_ALL = /^(1|true|yes)$/i.test(
  String(process.env.MIGRATE_FORCE_ALL ?? ''),
);
const REQUIRED_TABLES = [
  'tenants',
  'users',
  'providers',
  'event_types',
  'availability_rules',
  'bookings',
  'discovery_calls',
  'admin_settings',
  'email_templates',
  'email_queue',
  'blackout_dates',
];

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:946732@localhost:5432/matboss',
  connectionTimeoutMillis: 5000,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabase() {
  for (let attempt = 1; attempt <= DB_CONNECT_RETRIES; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      if (attempt > 1) {
        console.log(`Database reachable after ${attempt} attempts.`);
      }
      return;
    } catch (error) {
      if (attempt === DB_CONNECT_RETRIES) {
        throw error;
      }
      console.log(
        `Database not ready (attempt ${attempt}/${DB_CONNECT_RETRIES}). Retrying in ${DB_CONNECT_RETRY_DELAY_MS}ms...`,
      );
      await sleep(DB_CONNECT_RETRY_DELAY_MS);
    }
  }
}

async function ensureTrackingTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function isSchemaComplete() {
  const result = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [REQUIRED_TABLES],
  );

  const existing = new Set(result.rows.map((row) => row.table_name));
  const missing = REQUIRED_TABLES.filter((tableName) => !existing.has(tableName));

  return {
    complete: missing.length === 0,
    missing,
  };
}

async function migrate() {
  await waitForDatabase();

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  await ensureTrackingTable();

  let forceAll = MIGRATE_FORCE_ALL;
  const schemaStatus = await isSchemaComplete();
  if (!schemaStatus.complete && !forceAll) {
    forceAll = true;
    console.log(
      `Schema is incomplete (missing: ${schemaStatus.missing.join(
        ', ',
      )}). Reapplying all idempotent migrations.`,
    );
  }

  for (const file of files) {
    const already = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (already.rowCount && !forceAll) {
      console.log(`Skipping ${file}`);
      continue;
    }

    if (already.rowCount && forceAll) {
      console.log(`Reapplying ${file} (forced mode).`);
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `
          INSERT INTO _migrations(name, applied_at)
          VALUES($1, NOW())
          ON CONFLICT (name)
          DO UPDATE SET applied_at = EXCLUDED.applied_at
        `,
        [file],
      );
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed ${file}`);
      throw error;
    } finally {
      client.release();
    }
  }

  const finalStatus = await isSchemaComplete();
  if (!finalStatus.complete) {
    throw new Error(
      `Schema is still incomplete after migrations. Missing tables: ${finalStatus.missing.join(
        ', ',
      )}`,
    );
  }
}

migrate()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
