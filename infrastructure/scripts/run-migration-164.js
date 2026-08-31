#!/usr/bin/env node
/**
 * VoteCapsule™ — Migration 164 Runner
 * Seeds thumbnail_url into campaign_material_categories and
 * campaign_material_types so the Supplier Catalogue shows
 * real product images instead of SVG icon fallbacks.
 */
'use strict';

const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const pool = new Pool({
  host:     'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port:     5432,
  database: 'votecapsule',
  user:     'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl:      { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const MIGRATION_FILE = '164_seed_campaign_thumbnails.sql';
const MIGRATION_PATH = path.join(
  __dirname,
  '../../packages/database/migrations',
  MIGRATION_FILE
);

async function main() {
  console.log('VoteCapsule — Migration 164: Seed Campaign Thumbnails');
  console.log('='.repeat(55));
  console.log('Connecting to Aurora …');

  const client = await pool.connect();
  console.log('Connected.\n');

  // ── Check schema_migrations table exists ─────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename  VARCHAR(255) PRIMARY KEY,
      run_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Skip if already applied ───────────────────────────────
  const check = await client.query(
    'SELECT filename FROM schema_migrations WHERE filename = $1',
    [MIGRATION_FILE]
  );
  if (check.rows.length > 0) {
    console.log(`SKIP — ${MIGRATION_FILE} already recorded in schema_migrations.`);
    await runVerification(client);
    client.release();
    await pool.end();
    return;
  }

  // ── Load SQL ──────────────────────────────────────────────
  if (!fs.existsSync(MIGRATION_PATH)) {
    console.error(`ERROR: Migration file not found at:\n  ${MIGRATION_PATH}`);
    client.release();
    await pool.end();
    process.exit(1);
  }
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // ── Run migration ─────────────────────────────────────────
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [MIGRATION_FILE]
    );
    await client.query('COMMIT');
    console.log(`OK — ${MIGRATION_FILE} applied successfully.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`FAILED — ${MIGRATION_FILE}`);
    console.error(`Error: ${err.message}`);
    client.release();
    await pool.end();
    process.exit(1);
  }

  // ── Verify results ────────────────────────────────────────
  await runVerification(client);

  client.release();
  await pool.end();
  console.log('\nDone.');
}

async function runVerification(client) {
  console.log('Verification:');

  const cats = await client.query(
    `SELECT code, thumbnail_url
     FROM campaign_material_categories
     WHERE thumbnail_url IS NOT NULL
     ORDER BY sort_order
     LIMIT 12`
  );
  console.log(`  Categories with thumbnails : ${cats.rows.length}`);
  cats.rows.forEach(r =>
    console.log(`    ${r.code.padEnd(30)} → ${r.thumbnail_url ? '✓ ' + r.thumbnail_url.split('/').pop() : '✗ NULL'}`)
  );

  const types = await client.query(
    `SELECT COUNT(*) AS total,
            COUNT(thumbnail_url) AS with_thumb
     FROM campaign_material_types`
  );
  const { total, with_thumb } = types.rows[0];
  console.log(`\n  Material types total       : ${total}`);
  console.log(`  Material types with thumbs : ${with_thumb}`);
  console.log(`  Coverage                   : ${Math.round((with_thumb / total) * 100)}%`);

  // Sample of types with and without thumbnails
  const sample = await client.query(
    `SELECT code, thumbnail_url
     FROM campaign_material_types
     WHERE thumbnail_url IS NOT NULL
     ORDER BY code
     LIMIT 8`
  );
  console.log('\n  Sample types with thumbnails:');
  sample.rows.forEach(r =>
    console.log(`    ${r.code.padEnd(30)} → ${r.thumbnail_url.split('/').pop()}`)
  );
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
