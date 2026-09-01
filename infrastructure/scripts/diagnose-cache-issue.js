/**
 * diagnose-cache-issue.js
 * The problem:
 *   - Test [1]: Request with NO Origin → HTTP 200, NO ACAO header, cached as "no CORS"
 *   - Test [2]: Request WITH Origin → HTTP 200, ACAO header present
 *
 * When CloudFront caches a response WITHOUT Origin header (e.g. from a CDN
 * crawler, healthcheck, or image preload), it stores the response WITHOUT the
 * ACAO header. Then when a browser requests the SAME URL with an Origin header,
 * CloudFront returns the CACHED response (without ACAO) → browser blocks the image.
 *
 * The fix: CloudFront must be configured to use a CACHE POLICY that includes
 * "Origin" in the cache key, so CORS and non-CORS responses are cached separately.
 * Currently it uses legacy ForwardedValues with Origin forwarded but NOT in the
 * cache key — so all requests to the same URL share the same cache entry.
 *
 * Solution: Switch from legacy ForwardedValues to a managed cache policy that
 * includes Origin in the cache key (CachingOptimizedForUncompressedObjects or
 * custom), OR use "Managed-CORS-S3Origin" cache policy which is designed for this.
 */

const https = require('https');

function fetch(url, headers = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'User-Agent': 'VoteCapsule-Test/1.0', ...headers },
      timeout: 10000,
    }, (res) => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ s: res.statusCode, h: res.headers, b: b.slice(0, 100) }));
    });
    req.on('error', e => resolve({ s: 0, e: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ s: 0, e: 'TIMEOUT' }); });
    req.end();
  });
}

async function main() {
  const url = 'https://d1campaign.votecapsule.yna.co.ke/catalogue/BANNER_PULL_UP.jpg';
  const origin = 'https://party.votecapsule.yna.co.ke';

  console.log('=== CLOUDFRONT CACHE BEHAVIOR ANALYSIS ===\n');

  // Step 1: Warm the cache WITHOUT Origin
  console.log('[Step 1] Request WITHOUT Origin (warms cache without CORS):');
  const r1 = await fetch(url, {});
  console.log('  Status:', r1.s, '| x-cache:', r1.h['x-cache'], '| Vary:', r1.h['vary']);
  console.log('  ACAO:', r1.h['access-control-allow-origin'] ?? 'MISSING ← PROBLEM');

  // Step 2: Same URL WITH Origin — does cache serve old entry?
  console.log('\n[Step 2] Same URL WITH Origin (does CloudFront serve cached version?):');
  const r2 = await fetch(url, { Origin: origin });
  console.log('  Status:', r2.s, '| x-cache:', r2.h['x-cache'], '| Vary:', r2.h['vary']);
  console.log('  ACAO:', r2.h['access-control-allow-origin'] ?? 'MISSING');

  // Determine if this is a cache key issue
  const r1Cache = r1.h['x-cache'] ?? '';
  const r2Cache = r2.h['x-cache'] ?? '';
  const r1HasCors = !!r1.h['access-control-allow-origin'];
  const r2HasCors = !!r2.h['access-control-allow-origin'];

  console.log('\n=== ANALYSIS ===');
  console.log('Request 1 (no Origin) from cache:', r1Cache);
  console.log('Request 2 (with Origin) from cache:', r2Cache);
  console.log('Request 1 has ACAO:', r1HasCors);
  console.log('Request 2 has ACAO:', r2HasCors);
  console.log('Vary header:', r1.h['vary']);

  if (r1Cache.includes('Hit') && !r1HasCors) {
    console.log('\n⚠️  CONFIRMED: CloudFront is serving a CACHED response WITHOUT ACAO.');
    console.log('   The cache was warmed WITHOUT an Origin header → stored without CORS headers.');
    console.log('   Next browser request WITH Origin gets the cached CORS-free response.');
    console.log('\n   ROOT CAUSE: Legacy ForwardedValues does NOT include Origin in the cache key.');
    console.log('   CloudFront caches by URL only → CORS and non-CORS responses share same cache.');
  }

  if (!r1Cache.includes('Hit') || r1HasCors) {
    console.log('\n✅ Cache behavior looks correct for this specific URL right now.');
    console.log('   The issue may be intermittent or affect specific image paths.');
  }

  // Check if Vary: Origin is set correctly
  if (r1.h['vary']?.includes('Origin')) {
    console.log('\n✅ Vary: Origin IS set — CloudFront should differentiate CORS/non-CORS cache entries.');
    console.log('   But with legacy ForwardedValues, "Vary: Origin" from S3 may not be honored in CloudFront cache key.');
  } else {
    console.log('\n❌ Vary: Origin NOT set — guaranteed cache contamination issue.');
  }

  // Check the cache policy being used
  console.log('\n=== CACHE POLICY INFO ===');
  console.log('Current setup: Legacy ForwardedValues (not a managed cache policy)');
  console.log('Origin header: Forwarded to S3 origin: YES');
  console.log('Origin header: In CloudFront cache key: UNKNOWN (depends on legacy behavior)');
  console.log('Response headers policy: Managed-CORS-With-Preflight (5cc3b908)');
  console.log('  - OriginOverride: false → only adds ACAO if origin returns it');
  console.log('  - This means if CloudFront serves cached (CORS-free) response,');
  console.log('    the policy does NOT add ACAO header.');

  // Check all CF distributions for same issue
  console.log('\n=== CHECKING PUBLIC ASSETS CDN (E1YNDOIGJNPTWJ) ===');
  const r3 = await fetch('https://assets.votecapsule.yna.co.ke/parties/yna-party/logo.svg', { Origin: origin });
  console.log('  Status:', r3.s, '| ACAO:', r3.h['access-control-allow-origin'] ?? 'MISSING');
  const r4 = await fetch('https://assets.votecapsule.yna.co.ke/parties/yna-party/logo.svg', {});
  console.log('  No-origin status:', r4.s, '| ACAO:', r4.h['access-control-allow-origin'] ?? 'MISSING');
}

main().catch(e => console.error(e));
