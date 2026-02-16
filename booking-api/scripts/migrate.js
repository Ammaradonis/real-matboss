/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const DB_CONNECT_RETRIES = Number(process.env.DB_CONNECT_RETRIES ?? 30);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? 3000);

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

async function migrate() {
  await waitForDatabase();

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  await ensureTrackingTable();

  for (const file of files) {
    const already = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (already.rowCount) {
      console.log(`Skipping ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations(name) VALUES($1)', [file]);
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
}

migrate()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
