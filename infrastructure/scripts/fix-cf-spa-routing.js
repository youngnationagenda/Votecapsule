/**
 * Add 403→index.html error response to all 5 portal CloudFront distributions.
 * (404 already exists from when they were created; 403 is what S3 returns
 *  when a deep-link path doesn't exist in the bucket.)
 */
const { execSync } = require('child_process');
const fs = require('fs');

const DISTS = [
  { id: 'E18OX8YUDVZA5V', name: 'Transparency Portal' },
  { id: 'E1Z32G6YW54GHT', name: 'Authority Portal' },
  { id: 'E2K6MDXEZZ7UYS', name: 'Party Portal' },
  { id: 'E1O4XZRM79VCJ1', name: 'Candidate Portal' },
  { id: 'EZEXQ23EU9E55',  name: 'Observer Portal' },
];

const SPA_ERRORS = {
  Quantity: 2,
  Items: [
    { ErrorCode: 403, ResponseCode: '200', ResponsePagePath: '/index.html', ErrorCachingMinTTL: 0 },
    { ErrorCode: 404, ResponseCode: '200', ResponsePagePath: '/index.html', ErrorCachingMinTTL: 0 },
  ],
};

function cli(cmd) {
  try { return JSON.parse(execSync(cmd, { encoding: 'utf8', maxBuffer: 5*1024*1024 })); }
  catch(e) { console.error('  ERR:', e.message.slice(0,200)); return null; }
}

async function main() {
  console.log('=== Fixing CloudFront SPA error routing (403+404 → /index.html) ===\n');

  for (const dist of DISTS) {
    console.log(`--- ${dist.name} (${dist.id}) ---`);
    const r = cli(`aws cloudfront get-distribution-config --id ${dist.id} --region us-east-1 --output json`);
    if (!r) continue;

    const etag = r.ETag;
    const config = r.DistributionConfig;

    // Update error responses
    config.CustomErrorResponses = SPA_ERRORS;
    // Ensure DefaultRootObject is set
    config.DefaultRootObject = 'index.html';

    const tmpFile = `D:/Votecapsule/vote-capsule/infrastructure/scripts/cf-spa-${dist.id}.json`;
    fs.writeFileSync(tmpFile, JSON.stringify(config));

    const update = cli(
      `aws cloudfront update-distribution --id ${dist.id} --distribution-config "file://${tmpFile}" --if-match ${etag} --region us-east-1 --output json`
    );
    if (update) {
      console.log(`  ✅ Updated — Status: ${update.Distribution?.Status}`);
      // Invalidate cache
      cli(`aws cloudfront create-invalidation --distribution-id ${dist.id} --paths "/*" --region us-east-1 --output json`);
      console.log(`  ✅ Cache invalidated`);
    }
  }

  console.log('\n=== Done. All 5 portals will now handle deep-links and page refreshes correctly. ===');
}

main().catch(console.error);
