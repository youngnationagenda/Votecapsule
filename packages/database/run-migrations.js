#!/usr/bin/env node
/**
 * VoteCapsule™ — Migration Runner
 * Runs pending SQL migration files in order against RDS
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'votecapsule',
  user:     process.env.DB_USER     || 'vcadmin',
  password: process.env.DB_PASSWORD || 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl:      { rejectUnauthorized: false },
};

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('✅ Connected to RDS');

  // Get already-applied migrations
  const { rows: applied } = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY id'
  );
  const appliedSet = new Set(applied.map(r => r.filename));
  console.log(`📋 Already applied: ${appliedSet.size} migrations`);

  // Get all migration files, sorted
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !f.startsWith('nec/'))
    .sort();

  // Determine which to run (from args or all pending)
  const targetFiles = process.argv.slice(2);
  const toRun = files.filter(f => {
    if (targetFiles.length > 0) return targetFiles.some(t => f.includes(t));
    return !appliedSet.has(f);
  });

  if (toRun.length === 0) {
    console.log('✅ All migrations are up to date. Nothing to run.');
    await client.end();
    return;
  }

  console.log(`\n🚀 Running ${toRun.length} migration(s):\n`);

  for (const filename of toRun) {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.log(`  ⚠️  File not found: ${filename} — skipping`);
      continue;
    }

    console.log(`  ▶  ${filename}`);
    const sql = fs.readFileSync(filepath, 'utf-8');

    try {
      await client.query(sql);
      if (!appliedSet.has(filename)) {
        await client.query(
          'INSERT INTO schema_migrations (filename, executed_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING',
          [filename]
        );
      }
      console.log(`  ✅ ${filename} — DONE`);
    } catch (err) {
      console.error(`  ❌ ${filename} — FAILED: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log('\n🎉 All migrations completed successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Migration runner failed:', err.message);
  process.exit(1);
});
