/**
 * VoteCapsule™ — SVG Image Generator + S3 Uploader
 * Uses aws s3 cp (CLI) to avoid SDK subprocess spawning issue.
 * Generates branded SVG placeholders for all 275 material types.
 */
const { Client } = require('pg');
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const BUCKET = 'votecapsule-campaign-assets';
const PREFIX = 'suppliers/me-advertising/images';
const REGION = 'us-east-1';
const TMP    = path.join(os.tmpdir(), 'vc-svgs');

const DB = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
};

const COLOURS = {
  PRINTED_MATERIALS:   '#1E40AF', BRANDED_CLOTHING:    '#7C3AED',
  OUTDOOR_ADVERTISING: '#B91C1C', DIGITAL_MEDIA:       '#0369A1',
  VEHICLE_BRANDING:    '#9A3412', EVENT_SUPPLIES:      '#166534',
  PROMOTIONAL_ITEMS:   '#B45309', AUDIO_EQUIPMENT:     '#374151',
  STAGE_EQUIPMENT:     '#1E3A5F', FOOD_BEVERAGES:      '#92400E',
  SECURITY_ITEMS:      '#1F2937', STATIONERY:          '#475569',
  SOCIAL_MEDIA:        '#4C1D95', COMMUNICATION_TOOLS: '#0F766E',
  TRANSPORT_MATERIALS: '#7F1D1D', MEDIA_PRODUCTION:    '#0C4A6E',
  MISCELLANEOUS:       '#374151',
};

function makeSvg(name, catCode, catName, price) {
  const colour = COLOURS[catCode] || '#374151';
  const priceStr = price ? `KES ${Number(price).toLocaleString()}` : 'Price on request';
  const shortName = name.length > 38 ? name.substring(0, 35) + '...' : name;
  const shortCat  = catName.length > 22 ? catName.substring(0, 20) + '...' : catName;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colour}"/>
      <stop offset="100%" stop-color="${colour}cc"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#bg)" rx="12"/>
  <rect x="16" y="16" width="368" height="268" fill="white" fill-opacity="0.07" rx="8" stroke="white" stroke-opacity="0.12" stroke-width="1"/>
  <text x="200" y="90" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="600" letter-spacing="2" fill="white" fill-opacity="0.6" text-anchor="middle" text-transform="uppercase">${shortCat.toUpperCase()}</text>
  <text x="200" y="138" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="700" fill="white" text-anchor="middle">${shortName}</text>
  <rect x="80" y="155" width="240" height="1" fill="white" fill-opacity="0.2"/>
  <text x="200" y="192" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="800" fill="white" text-anchor="middle">${priceStr}</text>
  <text x="200" y="214" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="white" fill-opacity="0.5" text-anchor="middle">per unit (excl. VAT)</text>
  <rect x="130" y="244" width="140" height="28" rx="14" fill="white" fill-opacity="0.15"/>
  <text x="200" y="263" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="600" fill="white" text-anchor="middle">Me Advertising</text>
</svg>`;
}

async function main() {
  console.log('========================================');
  console.log('VoteCapsule™ — SVG Generator + S3 Upload');
  console.log('========================================\n');

  // Create temp dir for SVGs
  fs.mkdirSync(TMP, { recursive: true });

  // Connect DB
  const db = new Client(DB);
  await db.connect();
  console.log('✅ DB connected');

  const { rows } = await db.query(`
    SELECT mt.id, mt.code, mt.name, mc.code AS cat_code, mc.name AS cat_name, sp.unit_price
    FROM campaign_material_types mt
    JOIN campaign_material_categories mc ON mc.id = mt.category_id
    LEFT JOIN campaign_supplier_products sp ON sp.material_type_id = mt.id
    WHERE mt.is_active = true
    ORDER BY mc.sort_order, mt.name
  `);
  await db.end();
  console.log(`📦 ${rows.length} material types to process\n`);

  // Generate all SVG files locally
  console.log('🎨 Generating SVG files...');
  for (const row of rows) {
    const svg  = makeSvg(row.name, row.cat_code, row.cat_name, row.unit_price);
    const file = path.join(TMP, `${row.code.toLowerCase()}.svg`);
    fs.writeFileSync(file, svg, 'utf-8');
  }
  console.log(`✅ ${rows.length} SVG files generated in ${TMP}\n`);

  // Sync entire tmp dir to S3 in one CLI command (much faster than per-file)
  console.log(`☁️  Uploading to s3://${BUCKET}/${PREFIX}/...`);
  try {
    const result = execSync(
      `aws s3 sync "${TMP}" "s3://${BUCKET}/${PREFIX}" ` +
      `--content-type "image/svg+xml" ` +
      `--cache-control "max-age=86400, public" ` +
      `--region ${REGION} ` +
      `--no-progress`,
      { encoding: 'utf8', timeout: 300000 }
    );
    console.log(result || '  (no output — all files already up to date)');
  } catch (e) {
    console.error('❌ S3 sync failed:', e.message);
    process.exit(1);
  }

  // Remove old kazisafi prefix if it exists
  console.log('\n🧹 Cleaning up old suppliers/kazisafi/ prefix in S3...');
  try {
    execSync(
      `aws s3 rm "s3://${BUCKET}/suppliers/kazisafi/" --recursive --region ${REGION}`,
      { encoding: 'utf8', timeout: 60000 }
    );
    console.log('✅ Old suppliers/kazisafi/ removed');
  } catch (e) {
    // May not exist — that's fine
    console.log('  (nothing to remove or already clean)');
  }

  // Verify
  console.log('\n🔍 Verifying S3 upload...');
  try {
    const list = execSync(
      `aws s3 ls "s3://${BUCKET}/${PREFIX}/" --region ${REGION} --summarize`,
      { encoding: 'utf8', timeout: 30000 }
    );
    const lines = list.trim().split('\n');
    const summaryLine = lines.find(l => l.includes('Total Objects'));
    console.log(`✅ ${summaryLine || `${lines.length - 2} objects`}`);
  } catch (e) {
    console.warn('  Verify failed:', e.message.substring(0, 60));
  }

  // Cleanup temp
  fs.rmSync(TMP, { recursive: true, force: true });

  console.log('\n========================================');
  console.log('✅ DONE — All SVG images live at:');
  console.log(`   https://s3.amazonaws.com/${BUCKET}/${PREFIX}/<CODE>.svg`);
  console.log('   Frontend catalogue images are now active.');
  console.log('   Replace with real photos when available.');
  console.log('========================================');
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
