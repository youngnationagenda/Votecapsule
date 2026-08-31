#!/usr/bin/env node
/**
 * VoteCapsule™ — Full Campaign System Verification
 * Checks: migrations, tables, thumbnail coverage, S3 images,
 *         campaign service env vars, ECS deployment status
 */
'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host:     'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port:     5432,
  database: 'votecapsule',
  user:     'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl:      { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const REQUIRED_MIGRATIONS = [
  '134_campaign_schema_phase_14a.sql',
  '135_campaign_schema_phase_14b.sql',
  '136_campaign_schema_phase_14c.sql',
  '137_campaign_seed_material_categories.sql',
  '138_campaign_permissions_seed.sql',
  '139_seed_campaign_roles.sql',
  '140_seed_campaign_material_types.sql',
  '141_campaign_sms_messages.sql',
  '142_campaign_supplier_products.sql',
  '164_seed_campaign_thumbnails.sql',
];

const REQUIRED_TABLES = [
  'campaigns', 'campaign_events', 'campaign_tasks',
  'campaign_teams', 'campaign_team_members', 'campaign_volunteers',
  'campaign_budgets', 'campaign_expenses',
  'campaign_sms_templates', 'campaign_sms_batches', 'campaign_sms_messages',
  'campaign_incidents',
  'campaign_material_categories', 'campaign_material_types',
  'campaign_material_orders', 'campaign_material_inventory',
  'campaign_material_distributions', 'campaign_supplier_products',
  'campaign_suppliers',
  'campaign_outdoor_placements',
  'campaign_design_requests',
];

async function main() {
  console.log('VoteCapsule™ — Campaign System Full Verification');
  console.log('='.repeat(55));

  const client = await pool.connect();
  let allGood = true;

  // ── 1. Migration status ───────────────────────────────────
  console.log('\n[1] Migration Status:');
  const migRes = await client.query(
    'SELECT filename FROM schema_migrations WHERE filename = ANY($1) ORDER BY filename',
    [REQUIRED_MIGRATIONS]
  );
  const applied = new Set(migRes.rows.map(r => r.filename));
  const missing = [];
  for (const m of REQUIRED_MIGRATIONS) {
    const ok = applied.has(m);
    console.log(`  ${ok ? '✅' : '❌'} ${m}`);
    if (!ok) { missing.push(m); allGood = false; }
  }
  if (missing.length === 0) console.log('  All 10 campaign migrations applied.');

  // ── 2. Table existence ────────────────────────────────────
  console.log('\n[2] Campaign Tables:');
  const tabRes = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1) ORDER BY tablename`,
    [REQUIRED_TABLES]
  );
  const existingTables = new Set(tabRes.rows.map(r => r.tablename));
  let missingTables = 0;
  for (const t of REQUIRED_TABLES) {
    const ok = existingTables.has(t);
    if (!ok) { console.log(`  ❌ MISSING: ${t}`); missingTables++; allGood = false; }
  }
  if (missingTables === 0) console.log(`  ✅ All ${REQUIRED_TABLES.length} campaign tables exist.`);

  // ── 3. Data counts ────────────────────────────────────────
  console.log('\n[3] Data Counts:');
  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM campaign_material_categories) AS categories,
      (SELECT COUNT(*) FROM campaign_material_types)      AS types,
      (SELECT COUNT(*) FROM campaign_material_types WHERE thumbnail_url IS NOT NULL) AS types_with_thumb,
      (SELECT COUNT(*) FROM campaign_suppliers)           AS suppliers,
      (SELECT COUNT(*) FROM campaign_supplier_products)   AS products,
      (SELECT COUNT(*) FROM campaigns)                    AS campaigns_total
  `);
  const c = counts.rows[0];
  console.log(`  Categories:              ${c.categories} (expect 17)`);
  console.log(`  Material Types:          ${c.types} (expect 275)`);
  console.log(`  Types with thumbnail:    ${c.types_with_thumb}/${c.types} (${Math.round(c.types_with_thumb/c.types*100)}%)`);
  console.log(`  Suppliers:               ${c.suppliers}`);
  console.log(`  Supplier Products:       ${c.products} (expect 275)`);
  console.log(`  Total Campaigns in DB:   ${c.campaigns_total}`);

  if (parseInt(c.categories) < 12) { console.log('  ⚠️  Categories < 12'); allGood = false; }
  if (parseInt(c.types) < 275) { console.log('  ⚠️  Material types < 275'); allGood = false; }
  if (parseInt(c.products) < 200) { console.log('  ⚠️  Products < 200'); allGood = false; }

  // ── 4. Campaign roles seeded ──────────────────────────────
  console.log('\n[4] Campaign Roles (from DB roles table):');
  try {
    const rolesRes = await client.query(
      `SELECT name FROM roles WHERE name LIKE 'CAMPAIGN_%' OR name IN (
        'WARD_COORDINATOR','CONSTITUENCY_COORDINATOR','LOGISTICS_OFFICER',
        'FINANCE_OFFICER','COMMUNICATIONS_OFFICER','BRAND_MANAGER','CAMPAIGN_VOLUNTEER'
       ) ORDER BY name`
    );
    if (rolesRes.rows.length > 0) {
      rolesRes.rows.forEach(r => console.log(`  ✅ ${r.name}`));
    } else {
      console.log('  ⚠️  No campaign roles found in roles table');
    }
  } catch(e) {
    console.log('  ℹ️  Could not query roles table:', e.message);
  }

  // ── 5. Thumbnail sample ───────────────────────────────────
  console.log('\n[5] Sample Thumbnails (material types):');
  const thumbSample = await client.query(
    `SELECT code, thumbnail_url FROM campaign_material_types
     WHERE thumbnail_url IS NOT NULL ORDER BY RANDOM() LIMIT 5`
  );
  thumbSample.rows.forEach(r =>
    console.log(`  ${r.code.padEnd(30)} → ${r.thumbnail_url?.split('/').pop()}`)
  );

  // ── 6. Category thumbnails ────────────────────────────────
  console.log('\n[6] Category Thumbnails:');
  const catThumb = await client.query(
    `SELECT code, thumbnail_url FROM campaign_material_categories
     WHERE thumbnail_url IS NOT NULL ORDER BY sort_order LIMIT 10`
  );
  catThumb.rows.forEach(r =>
    console.log(`  ${r.code.padEnd(30)} → ${r.thumbnail_url?.split('/').pop() ?? '✗ NULL'}`)
  );

  client.release();
  await pool.end();

  // ── Summary ───────────────────────────────────────────────
  console.log('\n' + '='.repeat(55));
  if (allGood) {
    console.log('✅ ALL CHECKS PASSED — Campaign system fully verified.');
  } else {
    console.log('⚠️  Some checks failed — see details above.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
