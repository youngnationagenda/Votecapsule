#!/usr/bin/env node
/**
 * Vote Capsule™ — Local Portal Launcher
 * Starts all 6 web portals. Vite auto-selects the next free port if the
 * preferred one is busy (no --strictPort). Actual URLs are printed once each
 * portal reports "ready".
 *
 * Usage:  node dev-portals.js
 * Stop:   Ctrl+C
 */

const { spawn } = require('child_process');
const path      = require('path');

const PORTALS = [
  { name: 'admin-web',     label: 'ADMIN    ', port: 3000, color: '\x1b[36m' },
  { name: 'authority-web', label: 'AUTHORITY', port: 3100, color: '\x1b[35m' },
  { name: 'party-web',     label: 'PARTY    ', port: 3101, color: '\x1b[33m' },
  { name: 'candidate-web', label: 'CANDIDATE', port: 3102, color: '\x1b[32m' },
  { name: 'observer-web',  label: 'OBSERVER ', port: 3103, color: '\x1b[34m' },
  { name: 'public-web',    label: 'PUBLIC   ', port: 3104, color: '\x1b[37m' },
];

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const RED   = '\x1b[31m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const YEL   = '\x1b[33m';
const CYAN  = '\x1b[36m';

const appsDir  = path.join(__dirname, 'apps');
const children = [];

const shutdown = () => {
  process.stdout.write(`\n${BOLD}Stopping all portals...${RESET}\n`);
  children.forEach(c => { try { c.kill('SIGTERM'); } catch (_) {} });
  setTimeout(() => process.exit(0), 800);
};
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

console.log(`\n${BOLD}Vote Capsule™ — All 6 Portals${RESET}`);
console.log(`${DIM}Launching with Vite auto-port (preferred ports shown below)${RESET}\n`);
console.log(`  ${DIM}Portal       Preferred   Status${RESET}`);
console.log(`  ${DIM}${'─'.repeat(48)}${RESET}`);
PORTALS.forEach(p =>
  console.log(`  ${p.color}${BOLD}${p.label}${RESET}  :${p.port}       starting...`)
);
console.log(`\n  ${DIM}API  → https://483uyy43nc.execute-api.us-east-1.amazonaws.com${RESET}`);
console.log(`  ${DIM}Auth → Cognito us-east-1_i3N2tg34A${RESET}`);
console.log(`\n${BOLD}Ctrl+C to stop all portals${RESET}\n`);
console.log(`${'─'.repeat(60)}\n`);

PORTALS.forEach(portal => {
  const cwd    = path.join(appsDir, portal.name);
  const viteJs = path.join(cwd, 'node_modules', 'vite', 'bin', 'vite.js');
  const prefix = `${portal.color}${BOLD}[${portal.label}]${RESET} `;

  // No --strictPort: Vite will auto-increment if the port is busy
  const child = spawn(
    process.execPath,
    [viteJs, '--port', String(portal.port)],
    { cwd, env: { ...process.env } }
  );

  children.push(child);

  child.stdout.on('data', buf => {
    const text = buf.toString();
    text.split('\n').forEach(line => {
      if (!line.trim()) return;
      // Highlight the "ready" line that shows the actual URL
      if (line.includes('Local:') || line.includes('ready in')) {
        process.stdout.write(`${prefix}${GREEN}${BOLD}${line.replace(/\r/g,'')}${RESET}\n`);
      } else {
        process.stdout.write(`${prefix}${line.replace(/\r/g,'')}\n`);
      }
    });
  });

  child.stderr.on('data', buf => {
    buf.toString().split('\n').forEach(line => {
      if (line.trim())
        process.stdout.write(`${prefix}${RED}${line.replace(/\r/g,'')}${RESET}\n`);
    });
  });

  child.on('exit', code => {
    if (code !== 0 && code !== null)
      process.stdout.write(`${prefix}${RED}Exited (code ${code})${RESET}\n`);
  });
});

// Keep process alive
setInterval(() => {}, 1 << 30);
