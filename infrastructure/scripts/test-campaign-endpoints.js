#!/usr/bin/env node
'use strict';
const http  = require('http');
const https = require('https');

const ALB = 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const GW  = '483uyy43nc.execute-api.us-east-1.amazonaws.com';

// Common headers that the campaign service requires
const HDRS = {
  'x-tenant-id': '00000000-0000-0000-0000-000000000000',
  'x-user-id':   '00000000-0000-0000-0000-000000000001',
  'x-user-role': 'PARTY_ADMIN',
};

function req(useHttps, hostname, path, headers, cb) {
  const mod = useHttps ? https : http;
  const port = useHttps ? 443 : 80;
  const r = mod.request({ hostname, port, path, method: 'GET', headers: headers || {} }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => cb(null, res.statusCode, d));
  });
  r.on('error', e => cb(e.message));
  r.setTimeout(12000, () => { cb('TIMEOUT'); r.destroy(); });
  r.end();
}

const tests = [
  // Direct ALB — no auth needed
  { label: 'ALB /campaign/health',                path: '/api/v1/campaign/health',               alb: true,  hdrs: {} },
  { label: 'ALB /campaign/materials/categories', path: '/api/v1/campaign/materials/categories',  alb: true,  hdrs: HDRS },
  { label: 'ALB /campaign/materials/types',      path: '/api/v1/campaign/materials/types',       alb: true,  hdrs: HDRS },
  { label: 'ALB /campaign/suppliers',            path: '/api/v1/campaign/suppliers',             alb: true,  hdrs: HDRS },
  // API Gateway (no auth on these routes)
  { label: 'GW  /campaign/health',               path: '/api/v1/campaign/health',               alb: false, hdrs: {} },
  { label: 'GW  /campaign/materials/categories', path: '/api/v1/campaign/materials/categories', alb: false, hdrs: {} },
  { label: 'GW  /campaign/materials/types',      path: '/api/v1/campaign/materials/types',      alb: false, hdrs: {} },
  { label: 'GW  /campaign/suppliers',            path: '/api/v1/campaign/suppliers',            alb: false, hdrs: {} },
];

console.log('=== Campaign Endpoint Diagnostics ===\n');

let done = 0;
tests.forEach(t => {
  const host = t.alb ? ALB : GW;
  req(!t.alb, host, t.path, t.hdrs, (err, status, body) => {
    if (err) {
      console.log('❌', t.label, '->', err);
    } else {
      let preview = '';
      try {
        const j = JSON.parse(body);
        const cnt = Array.isArray(j) ? j.length
                  : Array.isArray(j && j.data) ? j.data.length
                  : null;
        preview = cnt !== null ? `count=${cnt}` : body.substring(0, 120);
      } catch(e) { preview = body.substring(0, 120); }
      const icon = status >= 200 && status < 300 ? '✅'
                 : status === 401 ? '🔒'
                 : status === 403 ? '🚫'
                 : status === 404 ? '🔍'
                 : '❌';
      console.log(icon, `[${status}]`, t.label, '|', preview);
    }
    if (++done === tests.length) process.exit(0);
  });
});
