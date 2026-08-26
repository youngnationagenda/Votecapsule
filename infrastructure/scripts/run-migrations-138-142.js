#!/usr/bin/env node
/**
 * VoteCapsule™ — Campaign Migrations 138–142 Runner
 * Seeds campaign roles, permissions, material types, mockup templates, supplier products
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
  const check = await client.query(
    'SELECT filename FROM schema_migrations WHERE filename = $1',
    [filename]
  );
  if (check.rows.length > 0) {
    console.log(`  SKIP  Already run: ${filename}`);
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
    console.log(`  OK    SUCCESS: ${filename}`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  FAIL  FAILED: ${filename}`);
    console.error(`        Error: ${err.message.substring(0, 200)}`);
    return false;
  }
}

async function main() {
  console.log('VoteCapsule Campaign Migrations 138-142');
  console.log('Connecting to Aurora...');
  const client = await pool.connect();
  console.log('Connected.\n');

  const migrationsDir = path.join(__dirname, '../../packages/database/migrations');
  const migrationFiles = [
    '138_campaign_permissions_seed.sql',
    '139_seed_campaign_roles.sql',
    '140_seed_campaign_material_types.sql',
    '141_campaign_sms_messages.sql',
    '142_campaign_supplier_products.sql',
  ];

  let passed = 0;
  let failed = 0;

  for (const filename of migrationFiles) {
    const filePath = path.join(migrationsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  WARN  File not found: ${filename}`);
      continue;
    }

    let sql = fs.readFileSync(filePath, 'utf8');
    // Make DDL statements safe
    sql = sql.replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ');
    sql = sql.replace(/CREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ');

    const ok = await runMigration(client, filename, sql);
    if (ok) passed++; else failed++;
  }

  console.log(`\nResult: ${passed} ran/skipped, ${failed} failed`);

  // Verify campaign_roles table has data (migration 139)
  try {
    const roles = await client.query(
      "SELECT name FROM campaign_roles ORDER BY name LIMIT 15"
    );
    if (roles.rows.length > 0) {
      console.log('\nCampaign roles seeded:');
      roles.rows.forEach(r => console.log(`  - ${r.name}`));
    } else {
      console.log('\nWARN: campaign_roles table is empty');
    }
  } catch (e) {
    console.log('\nINFO: campaign_roles table check:', e.message);
  }

  // Verify material types count
  try {
    const mt = await client.query("SELECT COUNT(*) as c FROM campaign_material_types");
    console.log(`\nMaterial types in DB: ${mt.rows[0].c}`);
  } catch (e) {
    console.log('Material types check failed:', e.message);
  }

  client.release();
  await pool.end();
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
