#!/usr/bin/env node
'use strict';
const http = require('http');

const ALB = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const SUPPLIER_ID = 'a218b2f3-89d4-4a36-8417-89863a609b7e';
const HDRS = {
  'x-tenant-id': '00000000-0000-0000-0000-000000000000',
  'x-user-id':   '00000000-0000-0000-0000-000000000001',
  'x-user-role': 'PARTY_ADMIN',
};

function get(path, cb) {
  const r = http.request({ hostname: ALB, port: 80, path, method: 'GET', headers: HDRS }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { cb(null, JSON.parse(d)); } catch(e) { cb(e.message, d); } });
  });
  r.on('error', e => cb(e.message));
  r.setTimeout(12000, () => { cb('TIMEOUT'); r.destroy(); });
  r.end();
}

async function p(fn) { return new Promise((res, rej) => fn((e, d) => e ? rej(e) : res(d))); }

async function run() {
  console.log('=== Deep Data Quality Audit ===\n');

  // 1. Raw product from /suppliers/:id/products
  const prodResp = await p(cb => get(`/api/v1/campaign/suppliers/${SUPPLIER_ID}/products?limit=3`, cb));
  const prods = Array.isArray(prodResp) ? prodResp : (prodResp.data || []);
  const p0 = prods[0];
  console.log('1. Raw product fields from /suppliers/:id/products:');
  console.log('   materialTypeId:', p0?.materialTypeId);
  console.log('   imageUrl:', p0?.imageUrl?.substring(0,60));
  // Check if materialTypeCode or categoryCode come directly from the product
  console.log('   materialTypeCode (direct):', p0?.materialTypeCode);
  console.log('   categoryCode (direct):', p0?.categoryCode);
  console.log('   categoryName (direct):', p0?.categoryName);
  console.log('   supplierProductName:', p0?.supplierProductName);
  console.log('   All fields:', Object.keys(p0 || {}).sort().join(', '));

  // 2. Material type lookup
  const typeResp = await p(cb => get('/api/v1/campaign/materials/types', cb));
  const types = Array.isArray(typeResp) ? typeResp : (typeResp.data || []);
  const matchingType = types.find(t => t.id === p0?.materialTypeId);
  console.log('\n2. Matching material type for materialTypeId:', p0?.materialTypeId);
  if (matchingType) {
    console.log('   FOUND type:', matchingType.name, '| code:', matchingType.code);
    console.log('   category object:', JSON.stringify(matchingType.category).substring(0,120));
    console.log('   category.code:', matchingType.category?.code);
    console.log('   category.name:', matchingType.category?.name);
    console.log('   thumbnailUrl:', matchingType.thumbnailUrl?.substring(0,60));
  } else {
    console.log('   ❌ NOT FOUND in types list!');
    console.log('   First type ID:', types[0]?.id);
    console.log('   Total types:', types.length);
  }

  // 3. Simulate what listAllProducts() does in campaignApi.ts
  console.log('\n3. Simulating campaignApi.suppliers.listAllProducts() enrichment:');
  const typeMap = new Map(types.map(t => [t.id, t]));
  const enriched = prods.map(p => {
    const type = typeMap.get(p.materialTypeId);
    const resolvedImageUrl = p.imageUrl ?? type?.thumbnailUrl ?? null;
    return {
      ...p,
      materialTypeName:  type?.name              ?? p.supplierProductName,
      materialTypeCode:  type?.code              ?? '',
      categoryCode:      type?.category?.code    ?? '',
      categoryName:      type?.category?.name    ?? '',
      imageUrl:          resolvedImageUrl,
      thumbnailUrl:      resolvedImageUrl,
    };
  });
  const e0 = enriched[0];
  console.log('   After enrichment:');
  console.log('   materialTypeCode:', e0?.materialTypeCode, e0?.materialTypeCode ? '✅' : '❌ EMPTY');
  console.log('   categoryCode:', e0?.categoryCode, e0?.categoryCode ? '✅' : '❌ EMPTY');
  console.log('   categoryName:', e0?.categoryName, e0?.categoryName ? '✅' : '❌ EMPTY');
  console.log('   imageUrl:', e0?.imageUrl?.substring(0,60), e0?.imageUrl ? '✅' : '❌ NULL');

  // 4. Check if the typeMap lookup is the problem
  console.log('\n4. TypeMap size:', typeMap.size, '| Product materialTypeId:', p0?.materialTypeId);
  console.log('   typeMap.has(materialTypeId):', typeMap.has(p0?.materialTypeId));
  if (typeMap.has(p0?.materialTypeId)) {
    const t = typeMap.get(p0.materialTypeId);
    console.log('   type.code:', t.code, '| type.category:', t.category ? t.category.code : 'NULL');
  }

  // 5. Check a few more products to see pattern
  console.log('\n5. Enrichment check across first 10 products:');
  let okCode = 0, missingCode = 0;
  for (const prod of prods.slice(0,10)) {
    const t = typeMap.get(prod.materialTypeId);
    if (t?.code) okCode++; else missingCode++;
    if (!t) console.log('   NO TYPE MATCH for materialTypeId:', prod.materialTypeId, '| product:', prod.supplierProductName?.substring(0,30));
  }
  console.log(`   ${okCode}/${prods.slice(0,10).length} have materialTypeCode, ${missingCode} missing`);

  console.log('\nDone.');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
