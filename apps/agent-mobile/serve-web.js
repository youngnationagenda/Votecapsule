// VoteCapsule™ — Static web server for dist/
// Usage: node serve-web.js
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 8090;
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

const server = http.createServer((req, res) => {
  // Strip query strings
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);

  // SPA fallback — if file not found serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', mime);
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache busting — no cache for HTML, long cache for hashed JS assets
  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache');
  } else if (filePath.includes('_expo/static')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    res.writeHead(404);
    res.end('Not found');
  });
  stream.pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VoteCapsule web server running at http://localhost:${PORT}`);
});
