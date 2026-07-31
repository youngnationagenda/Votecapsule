/**
 * Check migration status and table counts
 */
const { Client } = require('pg');

const DB_CONFIG = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
};

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('Connected to Aurora.\n');

  // Migration count
  try {
    const { rows } = await client.query('SELECT COUNT(*) as total FROM schema_migrations');
    const latest = await client.query('SELECT filename FROM schema_migrations ORDER BY id DESC LIMIT 3');
    console.log(`Migrations executed: ${rows[0].total}/142`);
    console.log('Last 3:', latest.rows.map(r => r.filename).join(', '));
  } catch(e) { console.log('schema_migrations not ready yet:', e.message); }

  // Table counts
  const checks = [
    ['users', 'SELECT COUNT(*) FROM users'],
    ['roles', 'SELECT COUNT(*) FROM roles'],
    ['nec_counties', 'SELECT COUNT(*) FROM nec_counties'],
    ['nec_constituencies', 'SELECT COUNT(*) FROM nec_constituencies'],
    ['nec_wards', 'SELECT COUNT(*) FROM nec_wards'],
    ['nec_registration_centres', 'SELECT COUNT(*) FROM nec_registration_centres'],
    ['nec_polling_stations', 'SELECT COUNT(*) FROM nec_polling_stations'],
    ['nec_election_versions', 'SELECT COUNT(*) FROM nec_election_versions'],
  ];

  console.log('\nTable counts:');
  for (const [name, sql] of checks) {
    try {
      const r = await client.query(sql);
      console.log(`  ${name}: ${r.rows[0].count}`);
    } catch(e) {
      console.log(`  ${name}: NOT YET CREATED`);
    }
  }

  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
