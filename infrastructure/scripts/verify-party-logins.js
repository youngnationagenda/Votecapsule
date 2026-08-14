/**
 * VoteCapsule™ — Party Login Verification Script (Task 6)
 * Tests Cognito login for all 98 party accounts
 *
 * Usage: node verify-party-logins.js [--limit N] [--start N]
 *   --limit N   Only test first N parties (default: all 98)
 *   --start N   Start from index N (0-based, default: 0)
 *
 * Output: infrastructure/scripts/party-login-verification.txt
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const POOL_ID = 'us-east-1_i3N2tg34A';
const CLIENT_ID = '3hi86ci06546ki038k6msmik0s';
const REGION = 'us-east-1';

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const startArg = args.find(a => a.startsWith('--start='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 98;
const START = startArg ? parseInt(startArg.split('=')[1], 10) : 0;

const parties = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../party_seed_data.json'),
    'utf8'
  )
);

function makePassword(abbreviation) {
  return `VCap2027#${abbreviation.toUpperCase()}!`;
}

function run(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 });
    return { ok: true, output: out };
  } catch (e) {
    return { ok: false, error: e.stderr || e.message || String(e) };
  }
}

const results = { pass: 0, fail: 0, failures: [] };
const logLines = [];
const timestamp = new Date().toISOString();

logLines.push(`VoteCapsule™ Party Login Verification — ${timestamp}`);
logLines.push(`Pool: ${POOL_ID}  |  Client: ${CLIENT_ID}`);
logLines.push(`Testing parties ${START + 1}–${Math.min(START + LIMIT, 98)} of 98`);
logLines.push('='.repeat(65));
logLines.push('');

const testParties = parties.slice(START, START + LIMIT);

for (let i = 0; i < testParties.length; i++) {
  const p = testParties[i];
  const email = p.email;
  const password = makePassword(p.abbreviation);

  process.stdout.write(`[${String(START + i + 1).padStart(2,'0')}/98] ${p.abbreviation.padEnd(15)} `);

  const authResult = run(
    `aws cognito-idp initiate-auth ` +
    `--client-id ${CLIENT_ID} ` +
    `--auth-flow USER_PASSWORD_AUTH ` +
    `--auth-parameters USERNAME="${email}",PASSWORD="${password}" ` +
    `--region ${REGION} ` +
    `--output json`
  );

  if (authResult.ok) {
    let tokenPreview = '';
    try {
      const parsed = JSON.parse(authResult.output);
      const idToken = parsed?.AuthenticationResult?.IdToken ?? '';
      tokenPreview = idToken.substring(0, 30) + '...';
    } catch (_) {}

    console.log(`PASS`);
    logLines.push(`PASS  [${String(START+i+1).padStart(2,'0')}] ${p.abbreviation.padEnd(15)} ${email.padEnd(38)} token=${tokenPreview}`);
    results.pass++;
  } else {
    const errMsg = authResult.error.trim().split('\n')[0] ?? 'Unknown error';
    console.log(`FAIL — ${errMsg.substring(0, 80)}`);
    logLines.push(`FAIL  [${String(START+i+1).padStart(2,'0')}] ${p.abbreviation.padEnd(15)} ${email.padEnd(38)} err=${errMsg.substring(0,60)}`);
    results.fail++;
    results.failures.push({ abbr: p.abbreviation, email, error: errMsg });
  }
}

logLines.push('');
logLines.push('='.repeat(65));
logLines.push(`TOTAL: ${results.pass} PASSED, ${results.fail} FAILED of ${testParties.length} tested`);
logLines.push('');

if (results.failures.length > 0) {
  logLines.push('FAILURES:');
  results.failures.forEach(f => {
    logLines.push(`  ${f.abbr}: ${f.email} — ${f.error.substring(0, 100)}`);
  });
}

console.log('\n' + '='.repeat(65));
console.log(`RESULTS: ${results.pass} PASSED, ${results.fail} FAILED of ${testParties.length}`);
console.log('='.repeat(65));

const outPath = path.join(__dirname, 'party-login-verification.txt');
fs.writeFileSync(outPath, logLines.join('\n'), 'utf8');
console.log(`\nVerification log saved to: ${outPath}`);

if (results.fail > 0) process.exit(1);
