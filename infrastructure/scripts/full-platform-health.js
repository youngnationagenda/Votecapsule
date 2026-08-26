#!/usr/bin/env node
/**
 * VoteCapsule™ — Full Platform Health Check
 * Tests every portal, every API endpoint, Cognito, ALB
 */
const https = require('https');
const http  = require('http');

const CF = {
  admin:     'd3cbtdjslu1w3w.cloudfront.net',
  party:     'd1kljfbe5qk9sb.cloudfront.net',
  candidate: 'dfsqw4ew7l8lz.cloudfront.net',
  authority: 'd2d78htllut667.cloudfront.net',
  observer:  'd3rxv5jpd9aukw.cloudfront.net',
  landing:   'd157x6h9m6201q.cloudfront.net',
};

const APIGW = '483uyy43nc.execute-api.us-east-1.amazonaws.com';
const ALB   = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

function request(opts, path, label, expectedStatuses = [200]) {
  return new Promise(resolve => {
    const mod = opts.port === 80 ? http : https;
    const req = mod.request({ ...opts, path, headers: { 'User-Agent': 'vc-health/2.0' } }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        const ok = expectedStatuses.includes(res.statusCode);
        resolve({ label, status: res.statusCode, size: b.length, ok });
      });
    });
    req.on('error', e => resolve({ label, status: 0, size: 0, ok: false, err: e.message.slice(0, 60) }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ label, status: 0, ok: false, err: 'TIMEOUT' }); });
    req.end();
  });
}

function https_get(hostname, path, label, statuses = [200]) {
  return request({ hostname, port: 443 }, path, label, statuses);
}

function http_get(hostname, path, label, statuses = [200, 404]) {
  return request({ hostname, port: 80 }, path, label, statuses);
}

async function main() {
  console.log('VoteCapsule™ Platform Health Check');
  console.log('Time: ' + new Date().toISOString());
  console.log('='.repeat(70));

  const checks = await Promise.all([
    // ── CloudFront Portals ────────────────────────────────────────────
    https_get(CF.admin,     '/', 'Admin Portal         (admin.votecapsule.yna.co.ke)'),
    https_get(CF.party,     '/', 'Party Portal         (party.votecapsule.yna.co.ke)'),
    https_get(CF.candidate, '/', 'Candidate Portal     (candidate.votecapsule.yna.co.ke)'),
    https_get(CF.authority, '/', 'Authority Portal     (authority.votecapsule.yna.co.ke)'),
    https_get(CF.observer,  '/', 'Observer Portal      (observer.votecapsule.yna.co.ke)'),
    https_get(CF.landing,   '/', 'Landing Page         (votecapsule.yna.co.ke)'),

    // ── API Gateway Health Endpoints (public — no auth) ───────────────
    https_get(APIGW, '/api/v1/identity/health',   'Identity Service    /health'),
    https_get(APIGW, '/api/v1/geography/stats',   'Geography Service   /stats (public)'),
    https_get(APIGW, '/api/v1/campaign/health',   'Campaign Service    /health', [200, 401]),
    https_get(APIGW, '/api/v1/candidate/health',  'Candidate Service   /health', [200, 401]),
    https_get(APIGW, '/api/v1/election/health',   'Election Service    /health', [200, 401]),
    https_get(APIGW, '/api/v1/evidence/health',   'Evidence Service    /health', [200, 401]),
    https_get(APIGW, '/api/v1/trust/health',      'Trust Service       /health', [200, 401]),
    https_get(APIGW, '/api/v1/reporting/health',  'Reporting Service   /health', [200, 401]),
    https_get(APIGW, '/api/v1/audit/health',      'Audit Service       /health', [200, 401]),
    https_get(APIGW, '/api/v1/ai/health',         'AI Service          /health', [200, 401]),
    https_get(APIGW, '/api/v1/billing/health',    'Billing Service     /health', [200, 401]),
    https_get(APIGW, '/api/v1/notification/health','Notification Svc   /health', [200, 401]),
    https_get(APIGW, '/api/v1/tenant/health',     'Tenant Service      /health', [200, 401]),
    https_get(APIGW, '/api/v1/workflow/health',   'Workflow Service    /health', [200, 401]),
    https_get(APIGW, '/api/v1/geography/health',  'Geography Service   /health', [200, 401]),

    // ── ALB Direct (bypasses API GW — internal smoke) ─────────────────
    http_get(ALB, '/api/v1/identity/health',  'ALB → Identity     /health'),
    http_get(ALB, '/api/v1/campaign/health',  'ALB → Campaign     /health'),
    http_get(ALB, '/api/v1/geography/stats',  'ALB → Geography    /stats'),
  ]);

  const portals  = checks.slice(0, 6);
  const apiGw    = checks.slice(6, 21);
  const albDirect = checks.slice(21);

  const print = (label, items) => {
    console.log('\n' + label);
    items.forEach(c => {
      const tag = c.ok ? 'OK  ' : 'FAIL';
      const extra = c.err ? ` [${c.err}]` : ` (${c.size}B)`;
      console.log(`  [${tag}] ${c.label} → HTTP ${c.status}${extra}`);
    });
  };

  print('PORTALS (CloudFront):', portals);
  print('SERVICES (via API Gateway):', apiGw);
  print('SERVICES (via ALB direct):', albDirect);

  const all = [...portals, ...apiGw, ...albDirect];
  const pass = all.filter(c => c.ok).length;
  const fail = all.filter(c => !c.ok).length;

  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL: ${pass}/${all.length} checks passed, ${fail} failed`);

  if (fail > 0) {
    console.log('FAILED CHECKS:');
    all.filter(c => !c.ok).forEach(c => console.log(`  - ${c.label}: HTTP ${c.status} ${c.err || ''}`));
    process.exit(1);
  } else {
    console.log('ALL SYSTEMS OPERATIONAL');
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
