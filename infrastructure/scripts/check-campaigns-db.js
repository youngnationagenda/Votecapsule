#!/usr/bin/env node
'use strict';
const { Client } = require('pg');

const client = new Client({
  host: 'vote-capsule-db-writer.c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function run() {
  await client.connect();
  console.log('Connected to DB\n');

  // 1. All campaigns
  const r1 = await client.query('SELECT id, name, status, tenant_id, candidate_id, created_at FROM campaigns ORDER BY created_at DESC');
  console.log('[1] All campaigns in DB:', r1.rows.length);
  r1.rows.forEach(c => console.log(`  ${c.id} | ${(c.name||'').substring(0,40).padEnd(40)} | ${c.status.padEnd(10)} | tenant: ${c.tenant_id}`));

  // 2. Column names in campaigns table
  const r2 = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='campaigns' ORDER BY ordinal_position");
  console.log('\n[2] campaigns table columns:');
  r2.rows.forEach(c => console.log(`  ${c.column_name.padEnd(25)} ${c.data_type.padEnd(20)} nullable:${c.is_nullable}`));

  // 3. Check tenant_id is actually indexed and filtering works
  const r3 = await client.query("SELECT COUNT(*) AS cnt FROM campaigns WHERE tenant_id = '960156e6-9c83-4efc-956f-ccea30b6bc3a'");
  console.log('\n[3] Campaigns for tenant 960156e6:', r3.rows[0].cnt);

  const r4 = await client.query("SELECT COUNT(*) AS cnt FROM campaigns WHERE tenant_id = 'e1a13ccd-e30b-4f15-8f0b-8943d1f2c09b'");
  console.log('[3] Campaigns for tenant e1a13ccd (Young Nation):', r4.rows[0].cnt);

  // 4. Tenants that have campaigns
  const r5 = await client.query('SELECT tenant_id, COUNT(*) AS cnt, array_agg(status) AS statuses FROM campaigns GROUP BY tenant_id ORDER BY cnt DESC');
  console.log('\n[4] Campaign counts by tenant:');
  r5.rows.forEach(r => console.log(`  ${r.tenant_id}: ${r.cnt} campaigns (${r.statuses.join(', ')})`));

  await client.end();
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
