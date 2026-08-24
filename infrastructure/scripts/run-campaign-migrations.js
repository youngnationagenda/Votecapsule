#!/usr/bin/env node
/**
 * VoteCapsule™ — Campaign Migrations Runner
 * Runs migrations 134-137 with conflict-safe handling
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
});

async function runMigration(client, filename, sql) {
  // Check if already run
  const check = await client.query(
    'SELECT filename FROM schema_migrations WHERE filename = $1',
    [filename]
  );
  if (check.rows.length > 0) {
    console.log(`  ⏭️  Already run: ${filename}`);
    return true;
  }

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    await client.query('COMMIT');
    console.log(`  ✅ SUCCESS: ${filename}`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ❌ FAILED: ${filename}`);
    console.error(`     Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Connecting to Aurora...');
  const client = await pool.connect();
  console.log('Connected.\n');

  const migrationsDir = path.join(__dirname, '../../packages/database/migrations');
  const campaignFiles = [
    '134_campaign_schema_phase_14a.sql',
    '135_campaign_schema_phase_14b.sql',
    '136_campaign_schema_phase_14c.sql',
    '137_campaign_seed_material_categories.sql',
  ];

  let passed = 0;
  let failed = 0;

  for (const filename of campaignFiles) {
    const filePath = path.join(migrationsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${filename}`);
      continue;
    }

    let sql = fs.readFileSync(filePath, 'utf8');

    // Make all CREATE INDEX statements safe with IF NOT EXISTS
    sql = sql.replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ');
    // Make all CREATE TABLE statements safe
    sql = sql.replace(/CREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ');

    const ok = await runMigration(client, filename, sql);
    if (ok) passed++; else failed++;
  }

  console.log(`\n✅ Complete: ${passed} ran/skipped, ${failed} failed`);

  // Verify campaign tables exist
  const tables = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'campaign%' ORDER BY tablename"
  );
  console.log('\nCampaign tables in DB:');
  tables.rows.forEach(r => console.log(`  ✓ ${r.tablename}`));

  client.release();
  await pool.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
