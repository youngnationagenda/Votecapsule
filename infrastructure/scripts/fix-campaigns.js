#!/usr/bin/env node
'use strict';
const http = require('http');

const ALB         = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const REAL_TENANT = '960156e6-9c83-4efc-956f-ccea30b6bc3a';
const HDRS = {
  'x-tenant-id':  REAL_TENANT,
  'x-user-id':    '00000000-0000-0000-0000-000000000001',
  'x-user-role':  'PARTY_ADMIN',
  'Content-Type': 'application/json',
};

function alb(method, path, body) {
  return new Promise(resolve => {
    const r = http.request({ hostname: ALB, port: 80, path, method, headers: HDRS }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch(e) { resolve({ s: res.statusCode, b: d }); } });
    });
    r.on('error', e => resolve({ s: 0, b: e.message }));
    r.setTimeout(12000, () => { r.destroy(); resolve({ s: 0, b: 'TIMEOUT' }); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  console.log('=== Campaign Fix ===');
  console.log('Tenant:', REAL_TENANT, '\n');

  // Step 1: List all campaigns for this tenant
  const r1 = await alb('GET', '/api/v1/campaign/campaigns');
  const camps = Array.isArray(r1.b) ? r1.b : (r1.b?.data ?? []);
  console.log('[1] Existing campaigns:', camps.length);
  camps.forEach(c => console.log('   ', c.id, '|', c.name, '| status:', c.status));

  // Step 2: Get elections for this tenant
  const re = await alb('GET', '/api/v1/election/elections');
  const els = Array.isArray(re.b) ? re.b : (re.b?.data ?? []);
  console.log('\n[2] Elections:', els.length);
  els.forEach(e => console.log('   ', e.id, '|', e.name, '| status:', e.status));

  if (els.length === 0) {
    console.log('\n❌ No elections found for this tenant. Cannot create campaigns.');
    process.exit(1);
  }

  // Step 3: If no campaigns exist, create one that is ACTIVE
  if (camps.length === 0) {
    console.log('\n[3] Creating initial campaign...');
    const elId = els[0].id;
    const r3 = await alb('POST', '/api/v1/campaign/campaigns', {
      name: 'My First Campaign 2027',
      description: 'Initial campaign created automatically',
      electionId: elId,
      countyCode: '047',
    });
    console.log('    Create:', r3.s, JSON.stringify(r3.b).substring(0, 200));

    if (r3.s === 201) {
      const cid = r3.b.id;
      // Advance status to planning then active
      const rp = await alb('PATCH', `/api/v1/campaign/campaigns/${cid}/status`, { status: 'planning' });
      console.log('    → planning:', rp.s);
      const ra = await alb('PATCH', `/api/v1/campaign/campaigns/${cid}/status`, { status: 'active' });
      console.log('    → active:', ra.s);
      console.log('\n✅ Campaign created and activated:', cid);
    }
  } else {
    // Check if any campaign is active — if not, activate the created one
    const active = camps.find(c => c.status === 'active');
    if (!active) {
      const cid = camps[0].id;
      const status = camps[0].status;
      console.log(`\n[3] No active campaign. Advancing "${camps[0].name}" (${status}) to active...`);
      
      if (status === 'created') {
        const rp = await alb('PATCH', `/api/v1/campaign/campaigns/${cid}/status`, { status: 'planning' });
        console.log('    → planning:', rp.s, rp.s >= 400 ? JSON.stringify(rp.b) : '');
        const ra = await alb('PATCH', `/api/v1/campaign/campaigns/${cid}/status`, { status: 'active' });
        console.log('    → active:', ra.s, ra.s >= 400 ? JSON.stringify(ra.b) : '');
      } else if (status === 'planning') {
        const ra = await alb('PATCH', `/api/v1/campaign/campaigns/${cid}/status`, { status: 'active' });
        console.log('    → active:', ra.s, ra.s >= 400 ? JSON.stringify(ra.b) : '');
      }
    } else {
      console.log('\n✅ Active campaign already exists:', active.id, active.name);
    }
  }

  // Final check
  const rf = await alb('GET', '/api/v1/campaign/campaigns');
  const final = Array.isArray(rf.b) ? rf.b : (rf.b?.data ?? []);
  console.log('\n[Final] Campaigns for tenant:');
  final.forEach(c => console.log('  ', c.id, '|', c.name, '| status:', c.status));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
