#!/usr/bin/env node
'use strict';
const http = require('http');
const ALB  = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

// Real tenant + election from DB
const REAL_TENANT   = '960156e6-9c83-4efc-956f-ccea30b6bc3a';
const REAL_ELECTION = '3375eca5-235e-4cd5-a78b-19ea5e7a3e12';
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
  console.log('Real tenant:', REAL_TENANT);
  console.log('Real election:', REAL_ELECTION);

  const r1 = await alb('GET', '/api/v1/campaign/campaigns');
  console.log('\n[A] GET /campaigns:', r1.s, '| count:', Array.isArray(r1.b)?r1.b.length:r1.b?.data?.length??JSON.stringify(r1.b).substring(0,100));

  const r2 = await alb('GET', '/api/v1/election/elections/active');
  console.log('[B] GET /elections/active:', r2.s, '|', JSON.stringify(r2.b).substring(0,200));

  const r3 = await alb('GET', '/api/v1/election/elections');
  const elList = Array.isArray(r3.b)?r3.b:r3.b?.data??[];
  console.log('[C] GET /elections:', r3.s, '| count:', elList.length);
  elList.forEach(e => console.log('    election:', e.id, e.name, e.status, 'tenant:', e.tenantId));

  // Create campaign
  const r4 = await alb('POST', '/api/v1/campaign/campaigns', {
    name: 'Test Campaign Sonie Diagnostics',
    tenantId: REAL_TENANT,
    electionId: REAL_ELECTION,
    candidateId: '00000000-0000-0000-0000-000000000001',
  });
  console.log('\n[D] POST /campaigns:', r4.s, '|', JSON.stringify(r4.b).substring(0,300));

  // Check CreateCampaignDto
  const r5 = await alb('POST', '/api/v1/campaign/campaigns', {
    name: 'Test',
    electionId: REAL_ELECTION,
    // NO tenantId, NO candidateId
  });
  console.log('[E] POST /campaigns (no tenantId, no candidateId):', r5.s, '|', JSON.stringify(r5.b).substring(0,200));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
