#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  console.log('Connected to Aurora.\n');

  const filename = '138_campaign_permissions_seed.sql';
  const check = await client.query('SELECT filename FROM schema_migrations WHERE filename=$1', [filename]);
  if (check.rows.length > 0) { console.log('⏭️  Already run:', filename); client.release(); await pool.end(); return; }

  const sql = fs.readFileSync(path.join(__dirname, '../../packages/database/migrations/', filename), 'utf8');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    console.log('✅ SUCCESS:', filename);
  } catch (err) {
    console.error('❌ FAILED:', filename, '\n   Error:', err.message);
  }

  // Verify
  const r1 = await client.query("SELECT COUNT(*) as c FROM permissions WHERE resource='campaign'");
  console.log('\nCampaign permissions:', r1.rows[0].c);
  const r2 = await client.query("SELECT COUNT(*) as c FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE p.resource='campaign'");
  console.log('Role-permission wires:', r2.rows[0].c);
  const r3 = await client.query("SELECT name, status FROM campaigns ORDER BY created_at");
  console.log('Demo campaigns:', r3.rows.length, r3.rows.map(r => r.name + ' [' + r.status + ']').join(', '));
  const r4 = await client.query("SELECT COUNT(*) as c FROM campaign_events");
  console.log('Demo events:', r4.rows[0].c);
  const r5 = await client.query("SELECT COUNT(*) as c FROM campaign_tasks");
  console.log('Demo tasks:', r5.rows[0].c);

  client.release();
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
