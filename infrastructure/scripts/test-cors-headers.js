/**
 * test-cors-headers.js
 * Tests CORS headers from CloudFront with various Origin headers
 * to pinpoint exactly why images fail in the browser.
 */
const https = require('https');

function fetchWithHeaders(url, extraHeaders = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'VoteCapsule-DiagnoseTool/1.0',
        ...extraHeaders,
      },
      timeout: 10000,
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: body.slice(0, 300),
      }));
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'TIMEOUT' }); });
    req.end();
  });
}

const TEST_URL = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BANNER_PULL_UP.jpg';
const TEST_URL2 = 'https://d1campaign.votecapsule.yna.co.ke/suppliers/me-advertising/images/spotlight.svg';

async function main() {
  console.log('=== CORS HEADER DIAGNOSIS ===\n');
  console.log('Testing URL:', TEST_URL);

  // Test 1: No Origin header (normal server-side request)
  const r1 = await fetchWithHeaders(TEST_URL, {});
  console.log('\n[1] No Origin header:');
  console.log('    Status:', r1.status);
  console.log('    ACAO:', r1.headers['access-control-allow-origin'] ?? 'MISSING');
  console.log('    Vary:', r1.headers['vary'] ?? 'MISSING');
  console.log('    x-cache:', r1.headers['x-cache'] ?? '?');

  // Test 2: Origin = party portal
  const r2 = await fetchWithHeaders(TEST_URL, { 'Origin': 'https://party.votecapsule.yna.co.ke' });
  console.log('\n[2] Origin: https://party.votecapsule.yna.co.ke');
  console.log('    Status:', r2.status);
  console.log('    ACAO:', r2.headers['access-control-allow-origin'] ?? 'MISSING');
  console.log('    Vary:', r2.headers['vary'] ?? 'MISSING');
  console.log('    x-cache:', r2.headers['x-cache'] ?? '?');
  if (r2.status !== 200) console.log('    Body:', r2.body.slice(0, 200));

  // Test 3: Origin = candidate portal
  const r3 = await fetchWithHeaders(TEST_URL, { 'Origin': 'https://candidate.votecapsule.yna.co.ke' });
  console.log('\n[3] Origin: https://candidate.votecapsule.yna.co.ke');
  console.log('    Status:', r3.status);
  console.log('    ACAO:', r3.headers['access-control-allow-origin'] ?? 'MISSING');
  console.log('    x-cache:', r3.headers['x-cache'] ?? '?');

  // Test 4: OPTIONS preflight
  const r4 = await fetchWithHeaders(TEST_URL, {
    'Origin': 'https://party.votecapsule.yna.co.ke',
    'Access-Control-Request-Method': 'GET',
  });
  console.log('\n[4] OPTIONS preflight simulation:');
  console.log('    Status:', r4.status);
  console.log('    ACAO:', r4.headers['access-control-allow-origin'] ?? 'MISSING');
  console.log('    ACAM:', r4.headers['access-control-allow-methods'] ?? 'MISSING');

  // Test 5: SVG image with Origin
  const r5 = await fetchWithHeaders(TEST_URL2, { 'Origin': 'https://party.votecapsule.yna.co.ke' });
  console.log('\n[5] SVG with Origin:');
  console.log('    URL:', TEST_URL2);
  console.log('    Status:', r5.status);
  console.log('    Content-Type:', r5.headers['content-type']);
  console.log('    ACAO:', r5.headers['access-control-allow-origin'] ?? 'MISSING');
  console.log('    x-cache:', r5.headers['x-cache'] ?? '?');
  console.log('    SVG snippet:', r5.body.slice(0, 80));

  // Test 6: Check ALL response headers for a hit  
  console.log('\n[6] ALL response headers (with Origin):');
  const r6 = await fetchWithHeaders(TEST_URL, { 'Origin': 'https://party.votecapsule.yna.co.ke' });
  Object.entries(r6.headers).forEach(([k, v]) => console.log(`    ${k}: ${v}`));

  // Test 7: Check if the S3 bucket has public access
  console.log('\n[7] Direct S3 URL test (no CloudFront):');
  const s3Url = 'https://votecapsule-campaign-assets.s3.us-east-1.amazonaws.com/catalogue/BANNER_PULL_UP.jpg';
  const r7 = await fetchWithHeaders(s3Url, { 'Origin': 'https://party.votecapsule.yna.co.ke' });
  console.log('    S3 direct URL:', s3Url);
  console.log('    Status:', r7.status);
  console.log('    ACAO:', r7.headers['access-control-allow-origin'] ?? 'MISSING');
  console.log('    Body:', r7.body.slice(0, 200));

  console.log('\n=== DIAGNOSIS COMPLETE ===');
}

main().catch(e => { console.error('FATAL:', e.message); });
