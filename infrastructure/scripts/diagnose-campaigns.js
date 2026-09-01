#!/usr/bin/env node
'use strict';
const http = require('http');

const ALB  = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

function alb(method, path, headers, body) {
  return new Promise(resolve => {
    const opts = { hostname: ALB, port: 80, path, method, headers: { 'Content-Type': 'application/json', ...headers } };
    const r = http.request(opts, res => {
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
  console.log('=== Campaign Diagnosis ===\n');

  // 1. Check campaigns exist at all
  const r1 = await alb('GET', '/api/v1/campaign/campaigns', {
    'x-tenant-id': '00000000-0000-0000-0000-000000000000',
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PARTY_ADMIN',
  });
  console.log('[1] GET /campaigns (fake tenant):', r1.s, Array.isArray(r1.b) ? 'count='+r1.b.length : JSON.stringify(r1.b).substring(0, 150));

  // 2. Use the real tenant from elections
  const REAL_TENANT = '960156e6-9c83-4efc-956f-ccea30b6bc3a';
  const REAL_ELECTION = '3375eca5-235e-4cd5-a78b-19ea5e7a3e12';

  const r2 = await alb('GET', '/api/v1/campaign/campaigns', {
    'x-tenant-id': REAL_TENANT,
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PARTY_ADMIN',
  });
  const camps = Array.isArray(r2.b) ? r2.b : (r2.b?.data ?? []);
  console.log('[2] GET /campaigns (REAL tenant):', r2.s, '| count:', camps.length);
  if (camps.length > 0) {
    camps.slice(0,3).forEach(c => console.log('    campaign:', c.id, c.name, c.status, 'tenant:', c.tenantId));
  }

  // 3. Try platform admin
  const r3 = await alb('GET', '/api/v1/campaign/campaigns', {
    'x-tenant-id': REAL_TENANT,
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PLATFORM_SUPER_ADMIN',
    'x-platform-admin': 'true',
  });
  const allCamps = Array.isArray(r3.b) ? r3.b : (r3.b?.data ?? []);
  console.log('[3] GET /campaigns (platform admin):', r3.s, '| count:', allCamps.length);
  if (allCamps.length > 0) {
    allCamps.slice(0,5).forEach(c => console.log('    campaign:', c.id, c.name, c.status, 'tenant:', c.tenantId));
  }

  // 4. Try to create a campaign
  console.log('\n[4] Creating test campaign...');
  const r4 = await alb('POST', '/api/v1/campaign/campaigns', {
    'x-tenant-id': REAL_TENANT,
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PARTY_ADMIN',
  }, {
    name: 'Test Campaign — Diagnostic ' + Date.now(),
    electionId: REAL_ELECTION,
  });
  console.log('    Create result:', r4.s, JSON.stringify(r4.b).substring(0, 300));

  // 5. Check DB via campaign service — what does DB contain?
  const r5 = await alb('GET', '/api/v1/campaign/campaigns/stats', {
    'x-tenant-id': REAL_TENANT,
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PARTY_ADMIN',
  });
  console.log('\n[5] GET /campaigns/stats:', r5.s, JSON.stringify(r5.b).substring(0, 200));

  // 6. Check the ACTUAL tenant IDs of existing campaigns
  const r6 = await alb('GET', '/api/v1/campaign/campaigns', {
    'x-tenant-id': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PARTY_ADMIN',
  });
  const camps6 = Array.isArray(r6.b) ? r6.b : (r6.b?.data ?? []);
  console.log('[6] GET /campaigns (election tenant):', r6.s, '| count:', camps6.length);
  if (camps6.length > 0) camps6.forEach(c => console.log('    ', c.id, c.name, c.status));

  // 7. Check what election this campaign was linked to
  console.log('\n[7] Elections available:');
  const r7 = await alb('GET', '/api/v1/election/elections', {
    'x-tenant-id': REAL_TENANT,
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PARTY_ADMIN',
  });
  const els = Array.isArray(r7.b) ? r7.b : (r7.b?.data ?? []);
  els.forEach(e => console.log('    election:', e.id, e.name, e.status, 'tenant:', e.tenantId));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
