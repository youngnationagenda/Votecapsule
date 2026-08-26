#!/usr/bin/env node
/**
 * VoteCapsule Candidate Portal — CloudFront smoke test
 */
const https = require('https');

const CF_HOST = 'dfsqw4ew7l8lz.cloudfront.net'; // candidate.votecapsule.yna.co.ke

function get(path) {
  return new Promise((resolve) => {
    https.get(
      { hostname: CF_HOST, path, headers: { 'User-Agent': 'VoteCapsule-SmokeTest/2.0' } },
      (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
      }
    ).on('error', (e) => resolve({ status: 0, body: '', err: e.message }));
  });
}

async function main() {
  console.log('VoteCapsule Candidate Portal Smoke Test');
  console.log('CloudFront: https://' + CF_HOST);
  console.log('');

  const checks = [
    { path: '/',                                          label: 'index.html (SPA shell)',        keyword: 'assets/',              critical: true  },
    { path: '/assets/index-Ct11cpI5.js',                 label: 'App entry JS',                  keyword: '/campaign',            critical: true  },
    { path: '/assets/MyCampaignTeamPage-BP0yDj4i.js',   label: 'My Team & Roles page',          keyword: 'CAMPAIGN_MANAGER',     critical: true  },
    { path: '/assets/MyPrintingDesignPage-B68Wdeon.js', label: 'Printing & Design page',        keyword: 'Design Request',       critical: true  },
    { path: '/assets/MyCampaignDashboard-DCu0RK8N.js',  label: 'Campaign Dashboard',            keyword: 'campaign',             critical: false },
    { path: '/assets/campaignApi-CiA3ubwU.js',           label: 'Campaign API client',           keyword: 'roles',                critical: true  },
    { path: '/assets/index-ChPUk9lq.css',                label: 'Tailwind CSS bundle',           keyword: 'sidebar',              critical: false },
    { path: '/assets/redux-BMXKaob5.js',                 label: 'Redux store',                   keyword: 'accessToken',          critical: false },
  ];

  let passed = 0, failed = 0;

  for (const { path, label, keyword, critical } of checks) {
    const r = await get(path);
    const ok = r.status === 200 && r.body.includes(keyword);
    const tag = ok ? 'OK  ' : (critical ? 'FAIL' : 'WARN');
    console.log(`  [${tag}] ${label}`);
    console.log(`        HTTP ${r.status} | ${r.body.length} bytes | keyword "${keyword}": ${r.body.includes(keyword)}`);
    if (ok) passed++; else if (critical) failed++;
  }

  console.log('');
  console.log(`Result: ${passed} passed, ${failed} critical failures`);

  if (failed > 0) {
    console.log('PORTAL IS NOT SERVING CORRECTLY');
    process.exit(1);
  } else {
    console.log('PORTAL IS LIVE AND SERVING ALL PAGES');
    console.log('URL: https://candidate.votecapsule.yna.co.ke');
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
