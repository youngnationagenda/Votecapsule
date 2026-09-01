#!/usr/bin/env node
'use strict';
const http = require('http');
const ALB  = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

let done = 0;
const total = 5;
function finish() { if (++done === total) process.exit(0); }

function get(path, label, cb) {
  const req = http.request({ hostname: ALB, port: 80, path, method: 'GET',
    headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000000', 'x-user-id': '00000000-0000-0000-0000-000000000001', 'x-user-role': 'PARTY_ADMIN' }
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { cb(res.statusCode, JSON.parse(d)); } catch(e) { cb(res.statusCode, d); } });
  });
  req.on('error', e => { console.log('ERR', label, e.message); finish(); });
  req.setTimeout(10000, () => { console.log('TIMEOUT', label); req.destroy(); finish(); });
  req.end();
}

// 1) Suppliers list
get('/api/v1/campaign/suppliers', 'suppliers', (status, data) => {
  const suppliers = Array.isArray(data) ? data : (data.data || []);
  console.log('[1] GET /suppliers ->', status, '| count:', suppliers.length);
  if (suppliers.length > 0) {
    const s = suppliers[0];
    console.log('    supplier fields:', Object.keys(s).sort().join(', '));
    console.log('    id:', s.id, '| name:', s.companyName);

    // 2) Products for first supplier
    get('/api/v1/campaign/suppliers/' + s.id + '/products?limit=3', 'products', (st, pd) => {
      console.log('[2] GET /suppliers/:id/products ->', st);
      const items = Array.isArray(pd) ? pd : (pd.data || []);
      const total_ = pd.total;
      console.log('    response shape: isArray=' + Array.isArray(pd) + ' hasData=' + !!pd.data + ' total=' + total_);
      console.log('    items count (sample):', items.length);
      if (items.length > 0) {
        const p = items[0];
        console.log('    product fields:', Object.keys(p).sort().join(', '));
        console.log('    imageUrl:', p.imageUrl, '| thumbnailUrl:', p.thumbnailUrl);
        console.log('    materialTypeId:', p.materialTypeId);
        console.log('    unitPrice:', p.unitPrice, '| currency:', p.currency);
        console.log('    isAvailable:', p.isAvailable);
      }
      finish();
    });
  } else { finish(); }
  finish();
});

// 3) Categories
get('/api/v1/campaign/materials/categories', 'categories', (status, data) => {
  const items = Array.isArray(data) ? data : (data.data || []);
  console.log('[3] GET /categories ->', status, '| count:', items.length);
  if (items.length > 0) console.log('    fields:', Object.keys(items[0]).sort().join(', '));
  finish();
});

// 4) Types (first 3)
get('/api/v1/campaign/materials/types?limit=3', 'types', (status, data) => {
  const items = Array.isArray(data) ? data : (data.data || []);
  console.log('[4] GET /materials/types ->', status, '| count:', items.length);
  if (items.length > 0) {
    const t = items[0];
    console.log('    type fields:', Object.keys(t).sort().join(', '));
    console.log('    thumbnailUrl:', t.thumbnailUrl);
    console.log('    category:', t.category ? JSON.stringify(t.category).substring(0,100) : 'NULL');
    console.log('    typicalCostMin:', t.typicalCostMin, '| unit:', t.unit);
  }
  finish();
});

// 5) Types with category filter
get('/api/v1/campaign/materials/types?category=BRANDED_CLOTHING', 'types-filter', (status, data) => {
  const items = Array.isArray(data) ? data : (data.data || []);
  console.log('[5] GET /types?category=BRANDED_CLOTHING ->', status, '| count:', items.length);
  finish();
});
