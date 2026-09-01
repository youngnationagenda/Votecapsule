#!/usr/bin/env node
'use strict';
const http = require('http');

const ALB = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

function alb(method, path, headers, body) {
  return new Promise(resolve => {
    const opts = {
      hostname: ALB, port: 80, path, method,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(d) }); }
        catch(e) { resolve({ s: res.statusCode, b: d }); }
      });
    });
    r.on('error', e => resolve({ s: 0, b: e.message }));
    r.setTimeout(12000, () => { r.destroy(); resolve({ s: 0, b: 'TIMEOUT' }); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  console.log('=== Full Campaign Debug ===\n');

  // 1. Find ALL unique tenantIds that have campaigns
  const r0 = await alb('GET', '/api/v1/campaign/campaigns', {
    'x-tenant-id': '960156e6-9c83-4efc-956f-ccea30b6bc3a',
    'x-platform-admin': 'true',
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PLATFORM_SUPER_ADMIN',
  });
  const allCamps = Array.isArray(r0.b) ? r0.b : (r0.b?.data ?? []);
  console.log('[1] ALL campaigns (platform admin):', allCamps.length);
  const tenants = {};
  allCamps.forEach(c => {
    if (!tenants[c.tenantId]) tenants[c.tenantId] = [];
    tenants[c.tenantId].push({ id: c.id, name: c.name, status: c.status });
  });
  Object.entries(tenants).forEach(([tid, camps]) => {
    console.log(`\n  Tenant: ${tid}`);
    camps.forEach(c => console.log(`    ${c.status.padEnd(10)} | ${c.name}`));
  });

  // 2. Check ALL tenants from tenant service
  console.log('\n[2] Tenants from tenant service:');
  const rt = await alb('GET', '/api/v1/tenant/tenants', {
    'x-tenant-id': '960156e6-9c83-4efc-956f-ccea30b6bc3a',
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PLATFORM_SUPER_ADMIN',
    'x-platform-admin': 'true',
  });
  const tlist = Array.isArray(rt.b) ? rt.b : (rt.b?.data ?? rt.b?.tenants ?? []);
  console.log('  Count:', tlist.length, '| raw:', JSON.stringify(rt.b).substring(0, 300));

  // 3. Try election service with both tenant IDs
  const TENANTS = [
    '960156e6-9c83-4efc-956f-ccea30b6bc3a',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'cec71928-e243-401e-a61c-ab985020971a',
  ];

  console.log('\n[3] Elections per tenant:');
  for (const tid of TENANTS) {
    const re = await alb('GET', '/api/v1/election/elections', {
      'x-tenant-id': tid, 'x-user-id': '00000000-0000-0000-0000-000000000001', 'x-user-role': 'PARTY_ADMIN',
    });
    const els = Array.isArray(re.b) ? re.b : (re.b?.data ?? []);
    console.log(`  ${tid}: ${els.length} elections`);
    els.forEach(e => console.log(`    ${e.id} | ${e.name} | status:${e.status}`));
  }

  // 4. Can we create + GET campaign with each tenant?
  console.log('\n[4] Campaign creation test for each tenant with election:');
  for (const [tid, camps_] of Object.entries(tenants)) {
    // if this tenant has no campaigns, try to create
    if (camps_.filter(c => c.status !== 'archived').length === 0) {
      console.log(`  Tenant ${tid}: no active campaigns`);
    } else {
      console.log(`  Tenant ${tid}: has ${camps_.length} campaigns (${camps_.map(c=>c.status).join(', ')})`);
    }
  }

  // 5. Check what the frontend receives — simulate the exact query
  console.log('\n[5] Exact frontend query simulation:');
  console.log('  party-web: campaignApi.list() → GET /campaign/campaigns (with tenantId from JWT)');
  console.log('  candidate-web: campaignApi.list({ candidateId: user.id }) → GET /campaign/campaigns?candidateId=...');
  
  // candidateId filter
  const rC = await alb('GET', '/api/v1/campaign/campaigns?candidateId=00000000-0000-0000-0000-000000000001', {
    'x-tenant-id': '960156e6-9c83-4efc-956f-ccea30b6bc3a',
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'CANDIDATE',
  });
  const byCandidate = Array.isArray(rC.b) ? rC.b : (rC.b?.data ?? []);
  console.log('  GET /campaigns?candidateId=...:', rC.s, 'count:', byCandidate.length);

  // 6. Identity service — check what tenantId real users have
  console.log('\n[6] Identity service users:');
  const ru = await alb('GET', '/api/v1/identity/users?limit=10&page=1', {
    'x-tenant-id': '960156e6-9c83-4efc-956f-ccea30b6bc3a',
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PARTY_ADMIN',
  });
  console.log('  GET /identity/users:', ru.s, JSON.stringify(ru.b).substring(0, 400));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
