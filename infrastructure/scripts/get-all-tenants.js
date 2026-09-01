#!/usr/bin/env node
'use strict';
const http = require('http');
const ALB = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

function alb(path, headers) {
  return new Promise(resolve => {
    const r = http.request({ hostname: ALB, port: 80, path, method: 'GET', headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch(e) { resolve({ s: res.statusCode, b: d }); } });
    });
    r.on('error', e => resolve({ s: 0, b: e.message }));
    r.setTimeout(10000, () => { r.destroy(); resolve({ s: 0, b: 'TIMEOUT' }); });
    r.end();
  });
}

async function run() {
  const HDRS = {
    'x-tenant-id': '960156e6-9c83-4efc-956f-ccea30b6bc3a',
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'PLATFORM_SUPER_ADMIN',
    'x-platform-admin': 'true',
  };

  const r = await alb('/api/v1/tenant/tenants', HDRS);
  const tenants = r.b?.data ?? r.b?.tenants ?? (Array.isArray(r.b) ? r.b : []);
  console.log('Status:', r.s, '| Total tenants:', tenants.length);
  tenants.forEach(t => {
    console.log(`  ${t.id} | ${(t.name||'').substring(0,40).padEnd(40)} | ${(t.type||'').padEnd(15)} | ${t.status}`);
  });

  // Also check campaigns per tenant for first 5
  console.log('\nCampaigns per tenant:');
  for (const t of tenants.slice(0, 8)) {
    const rc = await alb('/api/v1/campaign/campaigns', { ...HDRS, 'x-tenant-id': t.id });
    const camps = Array.isArray(rc.b) ? rc.b : (rc.b?.data ?? []);
    if (camps.length > 0) {
      console.log(`  ${t.id} (${t.name?.substring(0,25)}): ${camps.length} campaigns`);
      camps.forEach(c => console.log(`    ${c.status.padEnd(10)} | ${c.name}`));
    }
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
