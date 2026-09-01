#!/usr/bin/env node
'use strict';
const http  = require('http');
const https = require('https');

const ALB = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const GW  = '483uyy43nc.execute-api.us-east-1.amazonaws.com';
const SUPPLIER_ID = 'a218b2f3-89d4-4a36-8417-89863a609b7e';

const HDRS = {
  'x-tenant-id': '00000000-0000-0000-0000-000000000000',
  'x-user-id':   '00000000-0000-0000-0000-000000000001',
  'x-user-role': 'PARTY_ADMIN',
};

function req(isHttps, hostname, path, headers, cb) {
  const mod  = isHttps ? https : http;
  const port = isHttps ? 443 : 80;
  const r = mod.request({ hostname, port, path, method: 'GET', headers: headers || {} }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => cb(null, res.statusCode, d));
  });
  r.on('error', e => cb(e.message));
  r.setTimeout(12000, () => { cb('TIMEOUT'); r.destroy(); });
  r.end();
}

function check(label, isHttps, host, path, hdrs, expected) {
  return new Promise(resolve => {
    req(isHttps, host, path, hdrs, (err, status, body) => {
      if (err) {
        console.log(`❌ [${label}] ${err}`);
        resolve({ label, ok: false, error: err });
        return;
      }
      let parsed, count = '?', preview = '';
      try {
        parsed = JSON.parse(body);
        count  = Array.isArray(parsed) ? parsed.length
               : Array.isArray(parsed?.data) ? parsed.data.length
               : '?';
        preview = body.substring(0, 80);
      } catch(e) { preview = body.substring(0, 80); }

      const ok = status >= 200 && status < 300;
      const countOk = expected == null || count === '?' || count >= expected;
      const icon = ok && countOk ? '✅' : ok ? '⚠️ ' : '❌';
      console.log(`${icon} [${status}] ${label} | count:${count}${expected != null ? ` (expect≥${expected})` : ''}`);
      if (!ok) console.log(`       ${preview}`);
      resolve({ label, status, count, ok, countOk });
    });
  });
}

async function run() {
  console.log('=== Catalogue Endpoint Audit ===\n');
  console.log('-- ALB Direct (no auth) --');
  await check('ALB  /materials/categories',        false, ALB, '/api/v1/campaign/materials/categories',                       HDRS, 17);
  await check('ALB  /materials/types',             false, ALB, '/api/v1/campaign/materials/types',                            HDRS, 275);
  await check('ALB  /materials/types?cat=BRANDED', false, ALB, '/api/v1/campaign/materials/types?category=BRANDED_CLOTHING',  HDRS, 1);
  await check('ALB  /suppliers',                   false, ALB, '/api/v1/campaign/suppliers',                                  HDRS, 1);
  await check('ALB  /suppliers/:id/products?limit=300', false, ALB,
    `/api/v1/campaign/suppliers/${SUPPLIER_ID}/products?limit=300`, HDRS, 275);

  console.log('\n-- API Gateway (public routes - no JWT) --');
  await check('GW   /materials/categories',   true,  GW,  '/api/v1/campaign/materials/categories', null, 17);
  await check('GW   /materials/types',        true,  GW,  '/api/v1/campaign/materials/types',       null, 275);
  await check('GW   /suppliers',              true,  GW,  '/api/v1/campaign/suppliers',             null, 1);
  await check('GW   /suppliers/:id/products', true,  GW,
    `/api/v1/campaign/suppliers/${SUPPLIER_ID}/products?limit=300`, null, 275);

  console.log('\n-- API Gateway (authenticated route - no JWT, expect 401) --');
  await check('GW   ANY/{proxy+} no JWT',     true,  GW,
    '/api/v1/campaign/campaigns/00000000-0000-0000-0000-000000000001/materials/orders', null, null);

  console.log('\n-- Data Quality --');
  await new Promise(resolve => {
    req(false, ALB, `/api/v1/campaign/suppliers/${SUPPLIER_ID}/products?limit=3`, HDRS, (err, status, body) => {
      if (err) { console.log('❌ Data quality check failed:', err); resolve(); return; }
      try {
        const j = JSON.parse(body);
        const items = Array.isArray(j) ? j : (j.data || []);
        if (items.length > 0) {
          const p = items[0];
          const imgOk = p.imageUrl && p.imageUrl.startsWith('https://d1campaign.votecapsule.yna.co.ke/');
          console.log(`${imgOk ? '✅' : '❌'} imageUrl uses CloudFront CDN: ${p.imageUrl ? p.imageUrl.substring(0,60)+'...' : 'NULL'}`);
          const catOk = p.categoryCode && p.categoryCode.length > 0;
          console.log(`${catOk ? '✅' : '❌'} categoryCode enriched: "${p.categoryCode}"`);
          const typeOk = p.materialTypeCode && p.materialTypeCode.length > 0;
          console.log(`${typeOk ? '✅' : '❌'} materialTypeCode enriched: "${p.materialTypeCode}"`);
          const nameOk = p.supplierProductName && p.supplierProductName.length > 0;
          console.log(`${nameOk ? '✅' : '❌'} supplierProductName: "${p.supplierProductName}"`);
          const priceOk = p.unitPrice != null;
          console.log(`${priceOk ? '✅' : '❌'} unitPrice: ${p.unitPrice} ${p.currency}`);
        }
      } catch(e) { console.log('❌ Parse error:', e.message); }
      resolve();
    });
  });

  console.log('\n-- Backend URL Normalisation (post migration-166) --');
  await new Promise(resolve => {
    req(false, ALB, '/api/v1/campaign/materials/types?limit=3', HDRS, (err, status, body) => {
      if (err) { console.log('❌ Type URL check failed:', err); resolve(); return; }
      try {
        const j = JSON.parse(body);
        const items = Array.isArray(j) ? j : (j.data || []);
        if (items.length > 0) {
          const t = items[0];
          const urlOk = !t.thumbnailUrl || t.thumbnailUrl.startsWith('https://d1campaign.votecapsule.yna.co.ke/');
          console.log(`${urlOk ? '✅' : '❌'} type thumbnailUrl uses CloudFront: ${(t.thumbnailUrl||'null').substring(0,60)}`);
        }
      } catch(e) { console.log('❌ Parse error:', e.message); }
      resolve();
    });
  });

  console.log('\nDone.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
