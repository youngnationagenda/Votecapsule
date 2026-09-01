#!/usr/bin/env node
'use strict';
const http = require('http');

const ALB   = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const HDRS  = { 'x-tenant-id':'00000000-0000-0000-0000-000000000000','x-user-id':'00000000-0000-0000-0000-000000000001','x-user-role':'PARTY_ADMIN','Content-Type':'application/json' };

function alb(method, path, body) {
  return new Promise(resolve => {
    const r = http.request({ hostname: ALB, port: 80, path, method, headers: HDRS }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    r.setTimeout(12000, () => { r.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  console.log('=== Full Campaign Diagnostics ===\n');

  // 1. Elections
  const elections = await alb('GET', '/api/v1/election/elections');
  const elList = Array.isArray(elections.body) ? elections.body : elections.body?.data ?? [];
  console.log('[1] Elections:', elections.status, '| count:', elList.length);
  if (elList.length > 0) {
    const e = elList[0];
    console.log('    First election:', JSON.stringify({ id: e.id, name: e.name, status: e.status, tenantId: e.tenantId }));
  } else {
    console.log('    ⚠️  NO ELECTIONS in DB — candidates cannot be linked to an election');
    console.log('    Full body:', JSON.stringify(elections.body).substring(0, 200));
  }

  // 2. Active election
  const active = await alb('GET', '/api/v1/election/elections/active');
  console.log('[2] Active election:', active.status, '|', JSON.stringify(active.body).substring(0, 200));

  // 3. Campaigns
  const campaigns = await alb('GET', '/api/v1/campaign/campaigns');
  const cList = Array.isArray(campaigns.body) ? campaigns.body : campaigns.body?.data ?? [];
  console.log('[3] Campaigns:', campaigns.status, '| count:', cList.length);
  if (cList.length > 0) {
    const c = cList[0];
    console.log('    First campaign:', JSON.stringify({ id: c.id, name: c.name, status: c.status, electionId: c.electionId, tenantId: c.tenantId }));
  }

  // 4. Try creating a campaign with the real election ID
  if (elList.length > 0) {
    const elId = elList[0].id;
    console.log('\n[4] Creating campaign with real electionId:', elId);
    const create = await alb('POST', '/api/v1/campaign/campaigns', {
      name: 'Test Campaign from Sonie Diagnostics',
      tenantId: '00000000-0000-0000-0000-000000000000',
      electionId: elId,
      candidateId: '00000000-0000-0000-0000-000000000001',
    });
    console.log('    Create result:', create.status, '|', JSON.stringify(create.body).substring(0, 300));
  }

  // 5. If campaigns exist, test event creation
  if (cList.length > 0) {
    const cId = cList[0].id;
    console.log('\n[5] Creating event on campaign:', cId);
    const ev = await alb('POST', `/api/v1/campaign/campaigns/${cId}/events`, {
      eventName: 'Test Rally - Diagnostic',
      eventType: 'RALLY',
      startTime: '2027-03-01T09:00:00Z',
      endTime:   '2027-03-01T12:00:00Z',
      venueName: 'Test Venue',
      expectedAttendance: 1000,
    });
    console.log('    Event create:', ev.status, '|', JSON.stringify(ev.body).substring(0, 300));
  }

  // 6. Check campaign service logs for recent errors
  console.log('\n[6] Campaign service entity/DB check (campaigns table columns)');
  // Test the create campaign DTO validation
  const badCreate = await alb('POST', '/api/v1/campaign/campaigns', {
    name: '',  // empty name — should give validation error
    tenantId: '00000000-0000-0000-0000-000000000000',
    electionId: '00000000-0000-0000-0000-000000000001',
    candidateId: '00000000-0000-0000-0000-000000000002',
  });
  console.log('    Validation test (empty name):', badCreate.status, '|', JSON.stringify(badCreate.body).substring(0, 200));

  // 7. Check if the TENANT is actually in the DB
  console.log('\n[7] Tenant check');
  const tenant = await alb('GET', '/api/v1/tenant/tenants/00000000-0000-0000-0000-000000000000');
  console.log('    Fake tenant GET:', tenant.status);

  // 8. Get actual tenant from identity service
  const me = await alb('GET', '/api/v1/identity/users/me');
  console.log('    Identity /me:', me.status, '|', JSON.stringify(me.body).substring(0, 200));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
