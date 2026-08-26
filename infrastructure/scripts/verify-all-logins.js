#!/usr/bin/env node
/**
 * VoteCapsule - Verify all portal logins via identity service API
 */
const http = require('http');
const ALB = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const PASSWORD = 'VoteCapsule@2026!';

const ACCOUNTS = [
  { email: 'candidate@votecapsule.co.ke',  label: 'Candidate Portal',    expectedRole: 'CANDIDATE' },
  { email: 'superadmin@votecapsule.co.ke', label: 'Super Admin',          expectedRole: 'PLATFORM_SUPER_ADMIN' },
  { email: 'admin@votecapsule.co.ke',      label: 'Tenant Admin',         expectedRole: 'TENANT_ADMIN' },
  { email: 'ccm@votecapsule.co.ke',        label: 'Campaign Manager',     expectedRole: 'CAMPAIGN_MANAGER' },
  { email: 'mccp@votecapsule.co.ke',       label: 'Campaign Manager 2',   expectedRole: 'CAMPAIGN_MANAGER' },
  { email: 'ppd@votecapsule.co.ke',        label: 'Party Campaign Dir',   expectedRole: 'PARTY_CAMPAIGN_DIRECTOR' },
  { email: 'authority@votecapsule.co.ke',  label: 'Authority Portal',     expectedRole: 'ELECTION_COMMISSIONER' },
  { email: 'observer@votecapsule.co.ke',   label: 'Observer Portal',      expectedRole: 'OBSERVER_ADMIN' },
  { email: 'agent@votecapsule.co.ke',      label: 'Field Agent',          expectedRole: 'CAPSULE_AGENT' },
  { email: 'validator@votecapsule.co.ke',  label: 'Validator',            expectedRole: 'VALIDATOR' },
  { email: 'yna@votecapsule.co.ke',        label: 'Candidate (YNA)',      expectedRole: 'CANDIDATE' },
  { email: 'mwaurasebastian@gmail.com',    label: 'Party Admin (YNA)',    expectedRole: 'PARTY_ADMIN' },
  { email: 'azimio@votecapsule.co.ke',     label: 'Party Admin (Azimio)', expectedRole: 'PARTY_ADMIN' },
  { email: 'kanu@votecapsule.co.ke',       label: 'Party Admin (KANU)',   expectedRole: 'PARTY_ADMIN' },
  { email: 'dc@votecapsule.co.ke',         label: 'Authority (DC)',       expectedRole: 'ELECTION_COMMISSIONER' },
];

function login(email) {
  return new Promise(resolve => {
    const body = JSON.stringify({ email, password: PASSWORD });
    const req = http.request({
      hostname: ALB, port: 80,
      path: '/api/v1/identity/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const d = JSON.parse(b);
            resolve({ ok: true, token: !!d.accessToken, role: d.user?.roles?.[0] || 'no-role', tenantId: d.user?.tenantId || null });
          } catch { resolve({ ok: true, token: true, role: '?', tenantId: null }); }
        } else {
          resolve({ ok: false, status: res.statusCode, body: b.slice(0, 100) });
        }
      });
    });
    req.setTimeout(8000, () => { req.destroy(); resolve({ ok: false, status: 0, body: 'TIMEOUT' }); });
    req.on('error', e => resolve({ ok: false, status: 0, body: e.message }));
    req.write(body); req.end();
  });
}

async function main() {
  console.log('VoteCapsule Login Verification');
  console.log('ALB:', ALB);
  console.log('Password:', PASSWORD);
  console.log('='.repeat(75));

  let pass = 0, fail = 0, roleWrong = 0;

  for (const acct of ACCOUNTS) {
    const r = await login(acct.email);
    if (r.ok && r.token) {
      const roleOk = r.role === acct.expectedRole;
      const tag = roleOk ? 'OK  ' : 'ROLE';
      console.log(`  [${tag}] ${acct.label.padEnd(22)} ${acct.email.padEnd(38)} role=${r.role}${!roleOk ? ' EXPECTED='+acct.expectedRole : ''}`);
      if (roleOk) pass++; else roleWrong++;
    } else {
      console.log(`  [FAIL] ${acct.label.padEnd(22)} ${acct.email.padEnd(38)} HTTP ${r.status} | ${r.body}`);
      fail++;
    }
  }

  console.log('='.repeat(75));
  console.log(`Result: ${pass} passed, ${roleWrong} wrong role, ${fail} login failed`);

  if (fail > 0 || roleWrong > 0) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
