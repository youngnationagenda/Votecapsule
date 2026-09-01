#!/usr/bin/env node
'use strict';
const http = require('http');
const ALB  = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const REAL_TENANT = '960156e6-9c83-4efc-956f-ccea30b6bc3a';

function alb(path, tenant) {
  return new Promise(resolve => {
    const r = http.request({
      hostname: ALB, port: 80, path, method: 'GET',
      headers: { 'x-tenant-id': tenant||'', 'x-user-id': '00000000-0000-0000-0000-000000000001', 'x-user-role': 'PARTY_ADMIN' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(d) }); }
        catch(e) { resolve({ s: res.statusCode, b: d }); }
      });
    });
    r.on('error', e => resolve({ s: 0, b: e.message }));
    r.setTimeout(10000, () => { r.destroy(); resolve({ s: 0, b: 'TIMEOUT' }); });
    r.end();
  });
}

async function run() {
  const r1 = await alb('/api/v1/election/elections/active', REAL_TENANT);
  console.log('[1] /elections/active (real tenant):', r1.s, JSON.stringify(r1.b).substring(0,200));

  const r2 = await alb('/api/v1/election/elections', REAL_TENANT);
  const list = Array.isArray(r2.b) ? r2.b : (r2.b.data || []);
  console.log('[2] /elections (real tenant):', r2.s, '| count:', list.length);
  list.forEach(e => console.log('   ', e.id, '|', e.name, '|', e.status, '| tenant:', e.tenantId));

  // What does election service return as "active"?
  const r3 = await alb('/api/v1/election/elections?isActive=true', REAL_TENANT);
  console.log('[3] /elections?isActive=true:', r3.s, JSON.stringify(r3.b).substring(0,200));

  // Now try creating a campaign with real election + real tenant
  const r4 = await new Promise(resolve => {
    const body = JSON.stringify({
      name: 'Sonie Test Campaign ' + Date.now(),
      electionId: list[0]?.id || '',
      // No candidateId
    });
    const req = http.request({
      hostname: ALB, port: 80, path: '/api/v1/campaign/campaigns', method: 'POST',
      headers: { 'x-tenant-id': REAL_TENANT, 'x-user-id': '00000000-0000-0000-0000-000000000001', 'x-user-role': 'PARTY_ADMIN', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch(e) { resolve({ s: res.statusCode, b: d }); } });
    });
    req.on('error', e => resolve({ s: 0, b: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ s: 0, b: 'TIMEOUT' }); });
    req.write(body);
    req.end();
  });
  console.log('[4] POST /campaigns (no candidateId):', r4.s, JSON.stringify(r4.b).substring(0,300));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
