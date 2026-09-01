/**
 * diagnose-images.js
 * Deep-dive on image URL issues across all campaign image sources:
 * 1. Material type thumbnail URLs
 * 2. Supplier product image URLs
 * 3. S3 bucket actual objects
 * 4. CloudFront URL reachability
 * 5. OAC / public access block status
 */
const { Client } = require('pg');
const https = require('https');

const DB = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000,
};

function fetchUrl(url) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, { timeout: 8000 }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'] ?? '',
          cors: res.headers['access-control-allow-origin'] ?? 'MISSING',
          size: res.headers['content-length'] ?? body.length,
          body: body.slice(0, 200),
        }));
      });
      req.on('error', e => resolve({ status: 0, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'TIMEOUT' }); });
    } catch (e) {
      resolve({ status: 0, error: e.message });
    }
  });
}

async function main() {
  const c = new Client(DB);
  await c.connect();
  console.log('Connected to DB\n');

  // ── 1. Sample material type thumbnail URLs ──────────────────
  const types = await c.query(`
    SELECT id, name, code, thumbnail_url
    FROM campaign_material_types
    WHERE thumbnail_url IS NOT NULL
    LIMIT 10
  `);
  console.log('=== MATERIAL TYPE THUMBNAIL URLs ===');
  const uniqueTypeDomains = new Set();
  types.rows.forEach(r => {
    const url = r.thumbnail_url ?? '';
    const domain = url ? (url.match(/https?:\/\/([^/]+)/)?.[1] ?? 'unknown') : 'NULL';
    uniqueTypeDomains.add(domain);
    console.log(`  ${r.code.padEnd(30)} | ${url.slice(0, 80)}`);
  });
  console.log('  Unique domains:', [...uniqueTypeDomains].join(', '));

  // ── 2. Sample supplier product image URLs ──────────────────
  const products = await c.query(`
    SELECT sp.id, sp.supplier_product_name, sp.image_url
    FROM campaign_supplier_products sp
    WHERE sp.image_url IS NOT NULL
    LIMIT 10
  `);
  console.log('\n=== SUPPLIER PRODUCT IMAGE URLs ===');
  const uniqueProdDomains = new Set();
  products.rows.forEach(r => {
    const url = r.image_url ?? '';
    const domain = url ? (url.match(/https?:\/\/([^/]+)/)?.[1] ?? 'unknown') : 'NULL';
    uniqueProdDomains.add(domain);
    console.log(`  ${r.supplier_product_name.slice(0,35).padEnd(36)} | ${url.slice(0, 80)}`);
  });
  console.log('  Unique domains:', [...uniqueProdDomains].join(', '));

  // ── 3. Check all distinct URL prefixes ──────────────────────
  const prefixes = await c.query(`
    SELECT 
      regexp_replace(thumbnail_url, '(https?://[^/]+).*', '\\1') AS domain,
      COUNT(*) AS count
    FROM campaign_material_types
    WHERE thumbnail_url IS NOT NULL
    GROUP BY 1
    ORDER BY count DESC
  `);
  console.log('\n=== ALL THUMBNAIL URL DOMAINS ===');
  prefixes.rows.forEach(r => console.log(`  ${r.domain.padEnd(60)} count: ${r.count}`));

  const prodPrefixes = await c.query(`
    SELECT 
      regexp_replace(image_url, '(https?://[^/]+).*', '\\1') AS domain,
      COUNT(*) AS count
    FROM campaign_supplier_products
    WHERE image_url IS NOT NULL
    GROUP BY 1
    ORDER BY count DESC
  `);
  console.log('\n=== ALL PRODUCT IMAGE URL DOMAINS ===');
  prodPrefixes.rows.forEach(r => console.log(`  ${r.domain.padEnd(60)} count: ${r.count}`));

  // ── 4. Test actual reachability of sample URLs ──────────────
  const testUrls = [
    ...(types.rows.slice(0, 3).map(r => r.thumbnail_url).filter(Boolean)),
    ...(products.rows.slice(0, 3).map(r => r.image_url).filter(Boolean)),
  ];

  console.log('\n=== URL REACHABILITY TEST ===');
  for (const url of testUrls) {
    const result = await fetchUrl(url);
    const ok = result.status >= 200 && result.status < 300;
    console.log(`  ${ok ? '✅' : '❌'} HTTP ${result.status} | CORS: ${result.cors} | CT: ${result.contentType?.slice(0,30)} | ${url.slice(0, 70)}`);
    if (!ok && result.body) console.log(`     Body: ${result.body.slice(0, 100)}`);
    if (result.error) console.log(`     Error: ${result.error}`);
  }

  // ── 5. Check campaign_media table ──────────────────────────
  const media = await c.query(`
    SELECT id, campaign_id, storage_key, mime_type, approval_status, processing_status, public_key
    FROM campaign_media
    LIMIT 5
  `).catch(() => ({ rows: [] }));
  console.log('\n=== CAMPAIGN MEDIA RECORDS ===');
  if (media.rows.length === 0) {
    console.log('  No campaign_media records');
  } else {
    media.rows.forEach(r => console.log(`  ${r.id} | key: ${r.storage_key?.slice(0,50)} | status: ${r.approval_status}/${r.processing_status}`));
  }

  // ── 6. S3 bucket object count + sample keys ─────────────────
  console.log('\n=== CHECKING S3 BUCKET ===');
  console.log('  (Run: aws s3 ls s3://votecapsule-campaign-assets/suppliers/ --recursive | head)');
  console.log('  Bucket: votecapsule-campaign-assets');

  // ── 7. Check if OAC is set on CloudFront ───────────────────
  console.log('\n=== CloudFront E149XY0JAVY7G (d1campaign) ===');
  console.log('  Domain: d1campaign.votecapsule.yna.co.ke');
  console.log('  Origin: votecapsule-campaign-assets.s3.us-east-1.amazonaws.com');

  // Test the CDN domain directly
  const cdnTest = await fetchUrl('https://d1campaign.votecapsule.yna.co.ke/suppliers/me-advert/social-media/content-calendar-thumbnail.jpg');
  console.log(`  CDN test (jpg path): HTTP ${cdnTest.status} | CT: ${cdnTest.contentType}`);
  if (cdnTest.body) console.log(`  Body: ${cdnTest.body.slice(0, 150)}`);

  // Test the actual URL from DB
  if (types.rows[0]?.thumbnail_url) {
    const dbUrlTest = await fetchUrl(types.rows[0].thumbnail_url);
    console.log(`  DB URL test: HTTP ${dbUrlTest.status} | CT: ${dbUrlTest.contentType} | URL: ${types.rows[0].thumbnail_url}`);
    if (dbUrlTest.status !== 200) console.log(`  Body: ${dbUrlTest.body?.slice(0, 200)}`);
  }

  await c.end();
  console.log('\nDiagnosis complete.');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
