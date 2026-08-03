/**
 * Check whether migrations 021, 022, 023 have been executed
 * and verify the resulting tables/data exist.
 */
const { Client } = require('pg');

const client = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function main() {
  await client.connect();
  console.log('Connected to Aurora.\n');

  // 1. Check schema_migrations for 021/022/023
  const migs = await client.query(
    "SELECT filename FROM schema_migrations WHERE filename LIKE '%02%' ORDER BY id"
  );
  console.log('=== Migrations 020+ in schema_migrations ===');
  migs.rows.forEach(r => console.log(' ', r.filename));

  // 2. Check key tables
  const tables = [
    'candidate_elections',
    'candidate_election_positions',
    'candidate_political_parties',
    'iebc_form_b_collations',
    'iebc_form_c_declarations',
    'iebc_reconciliation_alerts',
  ];
  console.log('\n=== Table existence check ===');
  for (const t of tables) {
    const r = await client.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
      [t]
    );
    const exists = parseInt(r.rows[0].cnt) > 0;
    if (exists) {
      const cnt = await client.query(`SELECT COUNT(*) as cnt FROM ${t}`);
      console.log(`  ${exists ? '✅' : '❌'} ${t}: ${cnt.rows[0].cnt} rows`);
    } else {
      console.log(`  ❌ ${t}: TABLE DOES NOT EXIST`);
    }
  }

  // 3. Check tally columns on evidence_capsules
  const tallyCol = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='evidence_capsules' AND column_name='tally_data'"
  );
  console.log('\n=== evidence_capsules.tally_data column ===');
  console.log(tallyCol.rows.length > 0 ? '  ✅ tally_data column exists' : '  ❌ tally_data column MISSING');

  await client.end();
  console.log('\nDone.');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
