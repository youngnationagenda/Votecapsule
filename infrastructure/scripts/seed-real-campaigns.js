#!/usr/bin/env node
/**
 * Seeds initial campaigns for real party tenants that have no campaigns.
 * Uses the Kenya General Election 2027 as the election.
 * Creates one 'active' campaign per party so the portal is usable immediately.
 */
'use strict';
const http = require('http');
const { Client } = require('pg');

const ALB = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const GENERAL_ELECTION_ID = '6ec7783b-b320-4709-8d02-384fb605a3e6'; // Kenya General Election 2027

function alb(method, path, headers, body) {
  return new Promise(resolve => {
    const opts = { hostname: ALB, port: 80, path, method, headers: { 'Content-Type': 'application/json', ...headers } };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch(e) { resolve({ s: res.statusCode, b: d }); } });
    });
    r.on('error', e => resolve({ s: 0, b: e.message }));
    r.setTimeout(15000, () => { r.destroy(); resolve({ s: 0, b: 'TIMEOUT' }); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  // Get all party tenants from DB
  const db = new Client({
    host: 'vote-capsule-db-writer.c43i6c8ow71c.us-east-1.rds.amazonaws.com',
    port: 5432, database: 'votecapsule', user: 'vcadmin',
    password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
  });
  await db.connect();

  // Get all active political party tenants
  const tenantsResult = await db.query(
    "SELECT id, name, slug FROM tenants WHERE type='political_party' AND status='active' ORDER BY name"
  );
  const allTenants = tenantsResult.rows;
  console.log(`Found ${allTenants.length} party tenants\n`);

  // Find tenants with no campaigns
  const campResult = await db.query('SELECT DISTINCT tenant_id FROM campaigns');
  const tenantsWithCampaigns = new Set(campResult.rows.map(r => r.tenant_id));
  const tenantsWithout = allTenants.filter(t => !tenantsWithCampaigns.has(t.id));
  console.log(`Tenants with campaigns: ${tenantsWithCampaigns.size}`);
  console.log(`Tenants WITHOUT campaigns: ${tenantsWithout.length}\n`);

  let created = 0, failed = 0;

  for (const tenant of tenantsWithout) {
    const H = {
      'x-tenant-id': tenant.id,
      'x-user-id': '00000000-0000-0000-0000-000000000001',
      'x-user-role': 'PARTY_ADMIN',
    };

    // Create campaign
    const r1 = await alb('POST', '/api/v1/campaign/campaigns', H, {
      name: `${tenant.name} — Kenya 2027 General Election`,
      description: `Official campaign for ${tenant.name} in the Kenya 2027 General Election`,
      electionId: GENERAL_ELECTION_ID,
    });

    if (r1.s === 201) {
      const cid = r1.b.id;
      // Advance to active: created → planning → active
      const rp = await alb('PATCH', `/api/v1/campaign/campaigns/${cid}/status`, H, { status: 'planning' });
      const ra = await alb('PATCH', `/api/v1/campaign/campaigns/${cid}/status`, H, { status: 'active' });
      if (ra.s === 200) {
        console.log(`✅ Created + activated: [${tenant.name}] → ${cid}`);
        created++;
      } else {
        console.log(`⚠️  Created but couldn't activate: [${tenant.name}] → ${ra.s} ${JSON.stringify(ra.b).substring(0,100)}`);
        created++;
      }
    } else {
      console.log(`❌ Failed to create for [${tenant.name}]: ${r1.s} ${JSON.stringify(r1.b).substring(0,150)}`);
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Created: ${created} | Failed: ${failed}`);

  // Final count
  const finalResult = await db.query('SELECT status, COUNT(*) AS cnt FROM campaigns GROUP BY status');
  console.log('\nFinal campaign counts:');
  finalResult.rows.forEach(r => console.log(`  ${r.status}: ${r.cnt}`));

  await db.end();
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
