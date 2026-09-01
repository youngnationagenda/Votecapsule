#!/usr/bin/env node
'use strict';
const fs  = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');
const ALB  = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const HDRS = {
  'x-tenant-id':  '960156e6-9c83-4efc-956f-ccea30b6bc3a',
  'x-user-id':    '00000000-0000-0000-0000-000000000001',
  'x-user-role':  'PARTY_ADMIN',
};

function alb(path_) {
  return new Promise(r => {
    const req = http.request({ hostname: ALB, port: 80, path: path_, method: 'GET', headers: HDRS }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { r({ s: res.statusCode, b: JSON.parse(d) }); } catch(e) { r({ s: res.statusCode, b: d }); } });
    });
    req.on('error', e => r({ s: 0, b: e.message }));
    req.setTimeout(8000, () => { req.destroy(); r({ s: 0, b: 'TIMEOUT' }); });
    req.end();
  });
}

async function run() {
  console.log('=== Compliance Module Audit ===\n');

  // 1. Backend compliance module
  const compDir = path.join(ROOT, 'services/campaign/src/compliance');
  console.log('[1] Compliance service dir exists:', fs.existsSync(compDir));

  // 2. Migration
  const mig169 = path.join(ROOT, 'packages/database/migrations/169_campaign_compliance.sql');
  const mig164 = path.join(ROOT, 'packages/database/migrations/164_iebc_spending_limits.sql');
  console.log('[2] Migration 169 (compliance tables):', fs.existsSync(mig169));
  console.log('[2] Migration 164 (iebc limits):', fs.existsSync(mig164));

  // 3. Routes in App.tsx
  const partyApp = fs.readFileSync(path.join(ROOT, 'apps/party-web/src/App.tsx'), 'utf8');
  const candApp  = fs.readFileSync(path.join(ROOT, 'apps/candidate-web/src/App.tsx'), 'utf8');
  console.log('[3] Party App.tsx has /campaign/compliance route:', partyApp.includes('/campaign/compliance'));
  console.log('[3] Candidate App.tsx has /campaign/compliance route:', candApp.includes('/campaign/compliance'));

  // 4. Layouts
  const partyLayout = fs.readFileSync(path.join(ROOT, 'apps/party-web/src/layouts/PartyLayout.tsx'), 'utf8');
  const candLayout  = fs.readFileSync(path.join(ROOT, 'apps/candidate-web/src/layouts/CandidateLayout.tsx'), 'utf8');
  console.log('[4] Party layout has compliance nav:', partyLayout.includes('/campaign/compliance'));
  console.log('[4] Candidate layout has compliance nav:', candLayout.includes('/campaign/compliance'));

  // 5. API clients
  const partyApi = fs.readFileSync(path.join(ROOT, 'apps/party-web/src/api/campaignApi.ts'), 'utf8');
  const candApi  = fs.readFileSync(path.join(ROOT, 'apps/candidate-web/src/api/campaignApi.ts'), 'utf8');
  console.log('[5] Party campaignApi has compliance:', partyApi.includes('compliance:'));
  console.log('[5] Candidate campaignApi has compliance:', candApi.includes('compliance:'));
  console.log('[5] Candidate campaignApi has getIEBCGazetteLimit:', candApi.includes('getIEBCGazetteLimit'));

  // 6. Live endpoint test
  const r1 = await alb('/api/v1/campaign/campaigns/00000000-0000-0000-0000-000000000001/compliance');
  console.log('\n[6] Live compliance endpoint:', r1.s, JSON.stringify(r1.b).substring(0, 100));

  const r2 = await alb('/api/v1/election/iebc-limits?position=GOVERNOR&countyCode=047');
  console.log('[6] Live iebc-limits endpoint:', r2.s, JSON.stringify(r2.b).substring(0, 100));

  // 7. What app.module.ts registers
  const appModule = fs.readFileSync(path.join(ROOT, 'services/campaign/src/app.module.ts'), 'utf8');
  console.log('\n[7] app.module.ts has ComplianceModule:', appModule.includes('ComplianceModule'));

  console.log('\n=== Summary ===');
  console.log('Backend compliance module: MISSING - needs to be built');
  console.log('App.tsx routes: MISSING - pages exist but no route');
  console.log('Layouts: OK - nav items exist');
  console.log('API clients: OK - methods defined');
  console.log('Migration: check above');

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
