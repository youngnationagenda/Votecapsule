#!/usr/bin/env node
'use strict';
const http  = require('http');
const https = require('https');

const ALB = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const GW  = '483uyy43nc.execute-api.us-east-1.amazonaws.com';

const PARTY_HDRS = {
  'x-tenant-id': '00000000-0000-0000-0000-000000000000',
  'x-user-id':   '00000000-0000-0000-0000-000000000001',
  'x-user-role': 'PARTY_ADMIN',
  'Content-Type': 'application/json',
};

let done = 0, total = 0;
function finish() { if (++done >= total) process.exit(0); }

function req(mod, hostname, port, path, method, headers, body, label) {
  total++;
  const r = mod.request({ hostname, port, path, method, headers }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      let preview = d.substring(0, 300);
      try { preview = JSON.stringify(JSON.parse(d), null, 0).substring(0, 300); } catch(e) {}
      const icon = res.statusCode < 300 ? '✅' : res.statusCode === 401 ? '🔒' : res.statusCode === 403 ? '🚫' : res.statusCode === 400 ? '⚠️' : '❌';
      console.log(`${icon} [${res.statusCode}] ${label}`);
      if (res.statusCode >= 400) console.log(`   → ${preview}`);
      finish();
    });
  });
  r.on('error', e => { console.log(`❌ ERR ${label}: ${e.message}`); finish(); });
  r.setTimeout(12000, () => { console.log(`⏱ TIMEOUT ${label}`); r.destroy(); finish(); });
  if (body) r.write(JSON.stringify(body));
  r.end();
}

function alb(method, path, body, label, hdrs) {
  req(http, ALB, 80, path, method, hdrs || PARTY_HDRS, body, label);
}
function gw(method, path, body, label, token) {
  const h = { ...PARTY_HDRS };
  if (token) h['Authorization'] = 'Bearer ' + token;
  req(https, GW, 443, path, method, h, body, label);
}

console.log('=== Campaign & Event Create Diagnostics ===\n');
console.log('--- 1. Can we list campaigns (ALB)? ---');
alb('GET',  '/api/v1/campaign/campaigns', null, 'ALB GET /campaigns');

console.log('--- 2. Can we create campaign (ALB)? ---');
alb('POST', '/api/v1/campaign/campaigns', {
  name: 'Test Campaign',
  tenantId: '00000000-0000-0000-0000-000000000000',
  electionId: '00000000-0000-0000-0000-000000000001',
  candidateId: '00000000-0000-0000-0000-000000000002',
}, 'ALB POST /campaigns');

console.log('--- 3. API GW ANY/{proxy+} — no JWT (expect 401) ---');
gw('GET', '/api/v1/campaign/campaigns', null, 'GW GET /campaigns no-JWT');

console.log('--- 4. Elections list (ALB) ---');
alb('GET', '/api/v1/election/elections', null, 'ALB GET /elections', {
  'x-tenant-id': '00000000-0000-0000-0000-000000000000',
  'x-user-id': '00000000-0000-0000-0000-000000000001',
  'x-user-role': 'PARTY_ADMIN',
});

console.log('--- 5. Campaign controller routes registered? ---');
alb('GET', '/api/v1/campaign/campaigns/00000000-0000-0000-0000-000000000001', null, 'ALB GET /campaigns/:id (expect 404)');

console.log('--- 6. Create event (fake campaignId, ALB) ---');
alb('POST', '/api/v1/campaign/campaigns/00000000-0000-0000-0000-000000000001/events', {
  eventName: 'Test Rally',
  eventType: 'RALLY',
  startTime: '2027-01-01T09:00:00Z',
  endTime:   '2027-01-01T12:00:00Z',
}, 'ALB POST /campaigns/:id/events (fake id)');

console.log('--- 7. Check API GW routes for campaign ---');
alb('GET', '/api/v1/campaign/campaigns', null, 'ALB GET /campaigns (no-x-tenant)', {
  'x-user-id': '00000000-0000-0000-0000-000000000001',
  'x-user-role': 'PARTY_ADMIN',
  'Content-Type': 'application/json',
});
