const http = require('http');
const ALB = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

function get(path, method = 'GET', body = null) {
  return new Promise(r => {
    const opts = { hostname: ALB, path, method, port: 80, timeout: 10000,
      headers: body ? {'Content-Type':'application/json','Content-Length':Buffer.byteLength(JSON.stringify(body))} : {} };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => r({ s: res.statusCode, b: d.slice(0, 150) }));
    });
    req.on('error', e => r({ s: 0, b: e.message }));
    req.on('timeout', () => { req.destroy(); r({ s: 0, b: 'TIMEOUT' }); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== ALB Route Check ===\n');
  const tests = [
    // Phase 7 - running, OLD prefix (api/v1 not api/v1/service)
    ['GET', '/api/v1/notification/health'],
    ['GET', '/api/v1/notification/notifications/stats'],
    ['GET', '/api/v1/candidate/health'],
    ['GET', '/api/v1/election/health'],
    ['GET', '/api/v1/reporting/health'],
    // Core services - cycling
    ['GET', '/api/v1/identity/health'],
    ['POST','/api/v1/identity/auth/login'],
    ['GET', '/api/v1/geography/health'],
    ['GET', '/api/v1/geography/stats'],
    // Phase 8
    ['GET', '/api/v1/audit/health'],
    ['GET', '/api/v1/billing/health'],
  ];

  for (const [method, path] of tests) {
    const body = method === 'POST' ? { email: 'admin@votecapsule.co.ke', password: 'VoteC@psule2027!' } : null;
    const r = await get(path, method, body);
    const icon = r.s >= 200 && r.s < 300 ? '✅' : r.s === 404 ? '🔍' : r.s === 503 ? '⏳' : r.s === 401 ? '🔒' : '❌';
    console.log(`${icon} [${r.s}] ${method} ${path}`);
    if (r.s === 404 || (r.s >= 500 && r.s < 600)) console.log(`     ${r.b.slice(0,120)}`);
  }
  console.log('\n404 = route not found in service (wrong prefix or service not built with new prefix)');
  console.log('503 = no healthy ECS target (service cycling/starting)');
  console.log('200 = working');
}
main().catch(console.error);
