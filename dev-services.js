#!/usr/bin/env node
/**
 * Vote Capsule™ — All-Services Local Dev Launcher
 *
 * Starts all 13 NestJS microservices in parallel with:
 *   • Colour-coded, labelled log output per service
 *   • .env.local overrides loaded on top of .env (localhost URLs)
 *   • Auto-build (nest build) for any service missing dist/main.js
 *   • Graceful Ctrl+C shutdown of all children
 *   • Start-order: infrastructure-first (audit → geography → identity →
 *     trust → evidence → ai → candidate → election → notification →
 *     tenant → billing → reporting → workflow)
 *
 * Usage:
 *   node dev-services.js                        ← all 13 services
 *   node dev-services.js identity               ← single service by name
 *   node dev-services.js identity geography trust
 *
 * Stop:  Ctrl+C
 */

'use strict';

const { spawn, spawnSync } = require('child_process');
const path                 = require('path');
const fs                   = require('fs');

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  reset        : '\x1b[0m',
  bold         : '\x1b[1m',
  dim          : '\x1b[2m',
  red          : '\x1b[31m',
  green        : '\x1b[32m',
  yellow       : '\x1b[33m',
  blue         : '\x1b[34m',
  magenta      : '\x1b[35m',
  cyan         : '\x1b[36m',
  white        : '\x1b[37m',
  gray         : '\x1b[90m',
  brightRed    : '\x1b[91m',
  brightGreen  : '\x1b[92m',
  brightYellow : '\x1b[93m',
  brightBlue   : '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan   : '\x1b[96m',
};

// ── Service registry — ports match each service's .env ────────────────────────
// Canonical port map (source of truth: services/<name>/.env PORT= value):
//   identity     3001   tenant       3002   trust        3003
//   geography    3004   evidence     3005   ai           3006
//   workflow     3007   notification 3008   candidate    3009
//   reporting    3010   election     3011   audit        3012
//   billing      3013
//
// Start order: audit first (no deps), then geography → identity, then the rest
const SERVICES = [
  { name: 'audit',        label: 'AUDIT       ', port: 3012, color: C.gray,          stagger: 0    },
  { name: 'geography',    label: 'GEOGRAPHY   ', port: 3004, color: C.brightBlue,    stagger: 500  },
  { name: 'identity',     label: 'IDENTITY    ', port: 3001, color: C.brightCyan,    stagger: 1000 },
  { name: 'trust',        label: 'TRUST       ', port: 3003, color: C.brightMagenta, stagger: 1500 },
  { name: 'evidence',     label: 'EVIDENCE    ', port: 3005, color: C.brightYellow,  stagger: 2000 },
  { name: 'ai',           label: 'AI          ', port: 3006, color: C.magenta,       stagger: 2500 },
  { name: 'candidate',    label: 'CANDIDATE   ', port: 3009, color: C.cyan,          stagger: 3000 },
  { name: 'election',     label: 'ELECTION    ', port: 3011, color: C.brightGreen,   stagger: 3500 },
  { name: 'notification', label: 'NOTIFICATION', port: 3008, color: C.blue,          stagger: 4000 },
  { name: 'tenant',       label: 'TENANT      ', port: 3002, color: C.yellow,        stagger: 4500 },
  { name: 'billing',      label: 'BILLING     ', port: 3013, color: C.green,         stagger: 5000 },
  { name: 'reporting',    label: 'REPORTING   ', port: 3010, color: C.white,         stagger: 5500 },
  { name: 'workflow',     label: 'WORKFLOW    ', port: 3007, color: C.brightRed,     stagger: 6000 },
  { name: 'campaign',     label: 'CAMPAIGN    ', port: 3016, color: C.brightYellow,  stagger: 6500 },
];

// ── Filter by CLI args ────────────────────────────────────────────────────────
const requested = process.argv.slice(2).map(a => a.toLowerCase().trim()).filter(Boolean);
const services  = requested.length
  ? SERVICES.filter(s => requested.includes(s.name))
  : SERVICES;

if (!services.length) {
  console.error(`${C.red}No matching services for: ${requested.join(', ')}${C.reset}`);
  console.error(`Available: ${SERVICES.map(s => s.name).join(', ')}`);
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const servicesDir = path.join(__dirname, 'services');
const children    = [];
const ready       = new Set();

/** Load .env then .env.local into one object (.env.local wins on collision) */
function loadEnv(serviceDir) {
  const merged = {};
  for (const file of ['.env', '.env.local']) {
    const p = path.join(serviceDir, file);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, 'utf8')
      .split('\n')
      .forEach(line => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return;
        const idx = t.indexOf('=');
        if (idx === -1) return;
        const key = t.slice(0, idx).trim();
        const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        merged[key] = val;
      });
  }
  return merged;
}

/** Resolve a local binary (.CMD on Windows, plain otherwise) */
function localBin(serviceDir, name) {
  const isWin = process.platform === 'win32';
  const ext   = isWin ? '.CMD' : '';
  const candidates = [
    path.join(serviceDir, 'node_modules', '.bin', name + ext),
    path.join(serviceDir, 'node_modules', '.bin', name),
    path.join(__dirname,  'node_modules', '.bin', name + ext),
    path.join(__dirname,  'node_modules', '.bin', name),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return name; // fallback: hope it's in PATH
}

/**
 * Pre-build: compile with tsc when dist/main.js is missing.
 * Removes stale .tsbuildinfo first so tsc does a full emit (not incremental no-op).
 * Returns true on success, false on failure.
 */
function preBuild(svc, serviceDir, envVars, prefix) {
  const distMain   = path.join(serviceDir, 'dist', 'main.js');
  if (fs.existsSync(distMain)) return true; // already built — skip

  process.stdout.write(
    `${prefix}${C.yellow}dist/main.js not found — compiling with tsc…${C.reset}\n`
  );

  // Remove stale tsbuildinfo to force a full emit (incremental otherwise skips everything).
  // tsc uses either .tsbuildinfo or tsconfig.tsbuildinfo depending on whether
  // tsconfig.json sets tsBuildInfoFile explicitly.
  for (const infoFile of ['.tsbuildinfo', 'tsconfig.tsbuildinfo']) {
    const p = path.join(serviceDir, infoFile);
    if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch (_) {} }
  }

  const tsc    = localBin(serviceDir, 'tsc');
  const isWin  = process.platform === 'win32';
  const result = spawnSync(tsc, ['-p', 'tsconfig.json'], {
    cwd  : serviceDir,
    env  : { ...process.env, ...envVars },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin,
  });

  const out = (result.stdout?.toString() ?? '') + (result.stderr?.toString() ?? '');
  if (out.trim()) {
    out.trim().split('\n').forEach(l => {
      process.stdout.write(`${prefix}${C.dim}${l.replace(/\r/g,'')}${C.reset}\n`);
    });
  }

  if (result.status !== 0) {
    process.stdout.write(
      `${prefix}${C.red}${C.bold}tsc failed (exit ${result.status}) — skipping ${svc.name}${C.reset}\n`
    );
    return false;
  }

  if (!fs.existsSync(distMain)) {
    process.stdout.write(
      `${prefix}${C.red}tsc succeeded but dist/main.js still missing — skipping ${svc.name}${C.reset}\n`
    );
    return false;
  }

  process.stdout.write(`${prefix}${C.brightGreen}✔ build complete${C.reset}\n`);
  return true;
}

// ── Banner ────────────────────────────────────────────────────────────────────
console.log(`\n${C.bold}Vote Capsule™ — ${services.length} Service${services.length > 1 ? 's' : ''} (local dev)${C.reset}`);
console.log(`${C.dim}DB  → Aurora us-east-1 (live)  |  .env.local overrides loaded${C.reset}`);
console.log(`${C.dim}${'─'.repeat(62)}${C.reset}`);
console.log(`  ${C.dim}Service         Port   Status${C.reset}`);
console.log(`  ${C.dim}${'─'.repeat(42)}${C.reset}`);
services.forEach(s =>
  console.log(`  ${s.color}${C.bold}${s.label}${C.reset}  :${s.port}  starting…`)
);
console.log(`\n${C.bold}Ctrl+C to stop all${C.reset}\n`);
console.log(`${C.dim}${'─'.repeat(62)}${C.reset}\n`);

// ── Shutdown handler ──────────────────────────────────────────────────────────
const shutdown = (sig) => {
  process.stdout.write(`\n${C.bold}[launcher] ${sig} — stopping all services…${C.reset}\n`);
  children.forEach(c => { try { c.kill('SIGTERM'); } catch (_) {} });
  setTimeout(() => process.exit(0), 1200);
};
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Launch each service with its stagger delay ────────────────────────────────
services.forEach(svc => {
  setTimeout(() => {
    const serviceDir = path.join(servicesDir, svc.name);
    const envVars    = loadEnv(serviceDir);
    const nest       = localBin(serviceDir, 'nest');
    const prefix     = `${svc.color}${C.bold}[${svc.label.trim()}]${C.reset} `;
    const errPfx     = `${svc.color}${C.bold}[${svc.label.trim()}]${C.reset}${C.red} `;

    // Pre-build if dist/main.js is missing (prevents "Cannot find module" crash on first watch start)
    const ok = preBuild(svc, serviceDir, envVars, prefix);
    if (ok === false) return; // build failed — skip this service

    // On Windows, .CMD scripts must be spawned via shell.
    // We use shell:true only on win32; on Linux/macOS the nest shebang runs directly.
    const isWin   = process.platform === 'win32';
    const child   = spawn(
      nest,
      ['start', '--watch', '--preserveWatchOutput'],
      {
        cwd  : serviceDir,
        env  : { ...process.env, ...envVars },
        shell: isWin,
      }
    );

    children.push(child);

    child.stdout.on('data', buf => {
      buf.toString().split('\n').forEach(line => {
        const l = line.replace(/\r/g, '');
        if (!l.trim()) return;

        if (/running on port|successfully started|Application is running/i.test(l)) {
          ready.add(svc.name);
          process.stdout.write(`${prefix}${C.brightGreen}${C.bold}${l}${C.reset}\n`);
          if (ready.size === services.length) {
            process.stdout.write(
              `\n${C.brightGreen}${C.bold}✅ All ${services.length} services up!${C.reset}\n`
            );
            printServiceTable();
          }
          return;
        }

        if (/\b(error|exception|failed|fatal)\b/i.test(l)) {
          process.stdout.write(`${errPfx}${l}${C.reset}\n`);
        } else if (/\bwarn(ing)?\b/i.test(l)) {
          process.stdout.write(`${prefix}${C.yellow}${l}${C.reset}\n`);
        } else {
          process.stdout.write(`${prefix}${l}\n`);
        }
      });
    });

    child.stderr.on('data', buf => {
      buf.toString().split('\n').forEach(line => {
        const l = line.replace(/\r/g, '');
        // Suppress the Node.js DEP0190 shell warning — not actionable from user code
        if (l.includes('DEP0190') || l.includes('shell option true')) return;
        if (l.trim()) process.stdout.write(`${errPfx}${l}${C.reset}\n`);
      });
    });

    child.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        process.stdout.write(
          `${errPfx}exited (code ${code}${signal ? `, ${signal}` : ''})${C.reset}\n`
        );
      }
    });

    child.on('error', err => {
      process.stdout.write(`${errPfx}spawn error: ${err.message}${C.reset}\n`);
      if (err.code === 'ENOENT') {
        process.stdout.write(
          `${errPfx}Hint: nest not found — run ${C.bold}pnpm install${C.reset}${C.red} in services/${svc.name}${C.reset}\n`
        );
      }
    });

  }, svc.stagger);
});

// ── Final table printed once all services report ready ────────────────────────
function printServiceTable() {
  const rows = [
    '',
    `${C.bold}${'─'.repeat(66)}${C.reset}`,
    `${C.bold}  Service          Port   Swagger / Health${C.reset}`,
    `  ${'─'.repeat(62)}`,
  ];
  services.forEach(s => {
    const swagger = `http://localhost:${s.port}/api/docs`;
    const health  = `http://localhost:${s.port}/health`;
    rows.push(
      `  ${s.color}${C.bold}${s.label}${C.reset}  :${s.port}  ` +
      `${C.dim}${swagger}${C.reset}  ${C.gray}${health}${C.reset}`
    );
  });
  rows.push(`${C.bold}${'─'.repeat(66)}${C.reset}\n`);
  process.stdout.write(rows.join('\n') + '\n');
}

// Keep process alive
setInterval(() => {}, 1 << 30);
