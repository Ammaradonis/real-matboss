/* eslint-disable no-console */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:946732@localhost:5432/matboss',
});

const SQL = `
SELECT COUNT(*)::int AS overlap_count
FROM bookings b1
JOIN bookings b2
  ON b1.provider_id = b2.provider_id
 AND b1.id < b2.id
WHERE b1.status IN ('PENDING', 'CONFIRMED')
  AND b2.status IN ('PENDING', 'CONFIRMED')
  AND tstzrange(b1.start_ts, b1.end_ts, '[)') && tstzrange(b2.start_ts, b2.end_ts, '[)');
`;

async function main() {
  const result = await pool.query(SQL);
  const overlaps = result.rows[0]?.overlap_count ?? 0;

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        overlapCount: overlaps,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
