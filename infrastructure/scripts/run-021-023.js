/**
 * VoteCapsule™ — Run Migrations 021, 022, 023
 *
 * Executes the three pending migrations against Aurora PostgreSQL.
 * Uses the schema_migrations.filename tracking column (same as run-migrations.js).
 * Migration 023 originally referenced a 'version' column INSERT — we patch that
 * to use filename so it stays consistent with our migration tracker.
 *
 * Usage: node run-021-023.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 60000,
  query_timeout: 120000,
};

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'packages', 'database', 'migrations');

const MIGRATIONS = [
  '021_kenya_2027_election_seed.sql',
  '022_iebc_form_collation.sql',
  '023_party_nomination_elections.sql',
];

async function runMigration(client, filename) {
  // Check if already executed
  const check = await client.query(
    'SELECT 1 FROM schema_migrations WHERE filename = $1',
    [filename]
  );
  if (check.rows.length > 0) {
    console.log(`  ⏭️  SKIP  ${filename} (already executed)`);
    return 'skipped';
  }

  const filePath = path.join(MIGRATIONS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ FILE NOT FOUND: ${filePath}`);
    return 'error';
  }

  let sql = fs.readFileSync(filePath, 'utf-8');

  // Migration 023 has: INSERT INTO schema_migrations (version, executed_at) VALUES ('023', NOW())
  // Patch to use our filename-based tracker instead
  sql = sql.replace(
    /INSERT INTO schema_migrations \(version, executed_at\)\s*VALUES \('023', NOW\(\)\)\s*ON CONFLICT \(version\) DO NOTHING;/g,
    `INSERT INTO schema_migrations (filename) VALUES ('${filename}') ON CONFLICT (filename) DO NOTHING;`
  );

  // Migration 021 has: INSERT INTO schema_migrations (version, executed_at) VALUES ('021', NOW())
  sql = sql.replace(
    /INSERT INTO schema_migrations \(version, executed_at\)\s*VALUES \('021', NOW\(\)\)\s*ON CONFLICT \(version\) DO NOTHING;/g,
    `INSERT INTO schema_migrations (filename) VALUES ('${filename}') ON CONFLICT (filename) DO NOTHING;`
  );

  // Migration 022 has: INSERT INTO schema_migrations (version, executed_at) VALUES ('022', NOW())
  sql = sql.replace(
    /INSERT INTO schema_migrations \(version, executed_at\)\s*VALUES \('022', NOW\(\)\)\s*ON CONFLICT \(version\) DO NOTHING;/g,
    `INSERT INTO schema_migrations (filename) VALUES ('${filename}') ON CONFLICT (filename) DO NOTHING;`
  );

  console.log(`  ⏳ Running ${filename}...`);
  try {
    await client.query('BEGIN');
    await client.query(sql);
    // Ensure we record the migration even if the SQL didn't include INSERT
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [filename]
    );
    await client.query('COMMIT');
    console.log(`  ✅ DONE  ${filename}`);
    return 'success';
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ❌ FAIL  ${filename}`);
    console.error(`     ${err.message.slice(0, 300)}`);
    return 'error';
  }
}

async function main() {
  const client = new Client(DB_CONFIG);

  console.log('=== VoteCapsule™ Migration Runner — 021, 022, 023 ===\n');
  console.log(`Host: ${DB_CONFIG.host}`);
  console.log(`DB:   ${DB_CONFIG.database}\n`);

  await client.connect();
  console.log('Connected to Aurora.\n');

  const results = {};
  for (const migration of MIGRATIONS) {
    results[migration] = await runMigration(client, migration);
  }

  console.log('\n=== Migration Summary ===');
  for (const [f, r] of Object.entries(results)) {
    const icon = r === 'success' ? '✅' : r === 'skipped' ? '⏭️ ' : '❌';
    console.log(`  ${icon} ${f}: ${r}`);
  }

  // Verification queries
  console.log('\n=== Post-Migration Verification ===');

  try {
    const r1 = await client.query('SELECT COUNT(*) as cnt FROM candidate_elections WHERE election_year = 2027');
    console.log(`  candidate_elections (2027): ${r1.rows[0].cnt} row(s) ${r1.rows[0].cnt == 1 ? '✅' : '❌ expected 1'}`);
  } catch (e) { console.log(`  candidate_elections: ERROR - ${e.message}`); }

  try {
    const r2 = await client.query('SELECT COUNT(*) as cnt FROM candidate_election_positions');
    const cnt = parseInt(r2.rows[0].cnt);
    console.log(`  candidate_election_positions: ${cnt} row(s) ${cnt >= 1881 ? '✅' : '⚠️  expected ~1881'}`);
  } catch (e) { console.log(`  candidate_election_positions: ERROR - ${e.message}`); }

  try {
    const r3 = await client.query('SELECT COUNT(*) as cnt FROM candidate_political_parties');
    console.log(`  candidate_political_parties: ${r3.rows[0].cnt} row(s) ${r3.rows[0].cnt >= 10 ? '✅' : '❌ expected 10'}`);
  } catch (e) { console.log(`  candidate_political_parties: ERROR - ${e.message}`); }

  try {
    const r4 = await client.query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema='public' AND table_name='iebc_form_b_collations'");
    console.log(`  iebc_form_b_collations table: ${r4.rows[0].cnt > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
  } catch (e) { console.log(`  iebc_form_b_collations: ERROR - ${e.message}`); }

  try {
    const r5 = await client.query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema='public' AND table_name='iebc_form_c_declarations'");
    console.log(`  iebc_form_c_declarations table: ${r5.rows[0].cnt > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
  } catch (e) { console.log(`  iebc_form_c_declarations: ERROR - ${e.message}`); }

  try {
    const r6 = await client.query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema='public' AND table_name='iebc_reconciliation_alerts'");
    console.log(`  iebc_reconciliation_alerts table: ${r6.rows[0].cnt > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
  } catch (e) { console.log(`  iebc_reconciliation_alerts: ERROR - ${e.message}`); }

  try {
    const r7 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='evidence_capsules' AND column_name='tally_data'");
    console.log(`  evidence_capsules.tally_data column: ${r7.rows.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
  } catch (e) { console.log(`  tally_data column: ERROR - ${e.message}`); }

  try {
    const r8 = await client.query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema='public' AND table_name='candidate_nomination_rules'");
    console.log(`  candidate_nomination_rules table: ${r8.rows[0].cnt > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
  } catch (e) { console.log(`  candidate_nomination_rules: ERROR - ${e.message}`); }

  try {
    const r9 = await client.query("SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_name='candidate_elections' AND column_name='party_id'");
    console.log(`  candidate_elections.party_id column: ${r9.rows[0].cnt > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
  } catch (e) { console.log(`  party_id column: ERROR - ${e.message}`); }

  // Position breakdown
  try {
    const r10 = await client.query('SELECT position_code, COUNT(*) as cnt FROM candidate_election_positions GROUP BY position_code ORDER BY position_code');
    if (r10.rows.length > 0) {
      console.log('\n  Position breakdown:');
      r10.rows.forEach(r => console.log(`    ${r.position_code}: ${r.cnt}`));
    }
  } catch (e) { /* skip */ }

  await client.end();
  console.log('\n=== Done ===');
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
