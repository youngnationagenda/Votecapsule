/**
 * Discover tenant & candidate table names so we can fix migration 021.
 */
const { Client } = require('pg');

const client = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000,
});

async function main() {
  await client.connect();
  console.log('Connected.\n');

  // Find tenant-related tables
  const r1 = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%tenant%' OR table_name LIKE '%identity%') ORDER BY table_name"
  );
  console.log('Tenant/identity tables:');
  r1.rows.forEach(r => console.log(' ', r.name || r.table_name));

  // Find candidate-related tables
  const r2 = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%candidate%' ORDER BY table_name"
  );
  console.log('\nCandidate tables:');
  r2.rows.forEach(r => console.log(' ', r.table_name));

  // Show columns of candidate_elections
  const r3 = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='candidate_elections' ORDER BY ordinal_position LIMIT 20"
  );
  console.log('\ncandidate_elections columns:');
  r3.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

  // Check tenants table
  const r4 = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('tenants','identity_tenants','tenant_organizations','organizations') ORDER BY table_name"
  );
  console.log('\nLooking for tenants/orgs tables:');
  r4.rows.forEach(r => console.log(' ', r.table_name));

  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
