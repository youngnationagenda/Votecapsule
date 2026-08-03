/**
 * Vote Capsule™ — Import/Require Cross-Reference Checker
 * Scans all tracked .js/.cjs/.mjs files and checks:
 *   1. Relative imports with explicit extensions -> does the file exist?
 *   2. Relative imports with NO extension -> could resolve to wrong ext? (.cjs vs .js vs .mjs)
 *   3. require('*.cjs') but file is .js, or vice versa
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = __dirname;                          // D:\Votecapsule\vote-capsule
const FILELIST  = path.join(ROOT, '..', 'filelist.txt');

// Build the set of all tracked files (posix paths relative to ROOT)
const allTracked = fs.readFileSync(FILELIST, 'utf8')
  .trim().split('\n').map(l => l.trim()).filter(Boolean);

const jsTracked  = new Set(allTracked.filter(f =>
  f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.mjs')
));

// Also build a "stem -> [files]" map so we can detect extension mismatches
// stem = path without extension, e.g. "apps/admin-web/tailwind.config"
const stemMap = {};
jsTracked.forEach(f => {
  const stem = f.replace(/\.(js|cjs|mjs)$/, '');
  if (!stemMap[stem]) stemMap[stem] = [];
  stemMap[stem].push(f);
});

const issues  = [];
const notices = [];
let   checked = 0;

// Regex: capture relative path from require('...') or import ... from '...'
// Handles both single and double quotes
const IMPORT_RE = /(?:require|from)\s*\(\s*['"]([^'"]+)['"]\s*\)|(?:^|[^a-zA-Z])import\s*['"]([^'"]+)['"]/gm;

jsTracked.forEach(rel => {
  const fullPath = path.join(ROOT, rel);
  let src = '';
  try { src = fs.readFileSync(fullPath, 'utf8'); } catch (e) { return; }
  checked++;

  const dir = path.posix.dirname(rel);

  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const ref = m[1] || m[2];
    if (!ref || !ref.startsWith('.')) continue; // skip bare specifiers

    const ext = path.posix.extname(ref);        // e.g. ".cjs" or "" or ".js"

    if (ext) {
      // ── Case 1: Explicit extension ─────────────────────────────────────────
      const resolved = path.posix.normalize(dir + '/' + ref);

      if (!jsTracked.has(resolved)) {
        // File with that exact name doesn't exist in repo
        // Check if it exists with a different extension
        const stem = resolved.replace(/\.(js|cjs|mjs)$/, '');
        const alternatives = stemMap[stem] || [];

        if (alternatives.length > 0) {
          issues.push({
            severity: 'ERROR',
            file: rel,
            ref,
            resolved,
            problem: `Wrong extension — file is "${alternatives[0]}" but referenced as "${resolved}"`,
          });
        } else {
          // Could be a non-JS file (.json, .ts compiled to .js, etc.) — only flag .cjs/.mjs/.js
          if (['.js','.cjs','.mjs'].includes(ext)) {
            issues.push({
              severity: 'WARN',
              file: rel,
              ref,
              resolved,
              problem: `Referenced file not found in repo (may be generated/external)`,
            });
          }
        }
      } else {
        // File exists — but is the extension semantically correct?
        // e.g. requiring a .cjs file from an ESM context or vice versa
        if (ext === '.cjs') {
          notices.push({
            severity: 'INFO',
            file: rel,
            ref,
            resolved,
            problem: `Requires a .cjs file — ensure caller is CommonJS or uses createRequire()`,
          });
        }
      }

    } else {
      // ── Case 2: No extension (bare relative import like './foo') ───────────
      const resolved = path.posix.normalize(dir + '/' + ref);

      // Check all possible extensions this could resolve to
      const candidates = [
        resolved + '.js',
        resolved + '.cjs',
        resolved + '.mjs',
        resolved + '/index.js',
        resolved + '/index.cjs',
      ];

      const found = candidates.filter(c => jsTracked.has(c));

      if (found.length > 1) {
        // Multiple matches — Node will pick one, could be ambiguous
        notices.push({
          severity: 'INFO',
          file: rel,
          ref,
          resolved,
          problem: `Ambiguous import — resolves to: ${found.join(', ')}`,
        });
      }
      // If 0 matches: probably resolves to .ts/.tsx file (compiled), skip
    }
  }
});

// ── Print Results ──────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log('  Vote Capsule™ — Import Extension Check');
console.log('====================================================');
console.log(`  Files scanned : ${checked}`);
console.log(`  ERRORs/WARNs  : ${issues.length}`);
console.log(`  INFO notices  : ${notices.length}`);
console.log('====================================================\n');

if (issues.length === 0) {
  console.log('✅  No extension mismatches found!\n');
} else {
  console.log('❌  ISSUES:\n');
  issues.forEach((i, n) => {
    console.log(`  [${n+1}] ${i.severity} — ${i.file}`);
    console.log(`       import/require: "${i.ref}"`);
    console.log(`       resolved:       ${i.resolved}`);
    console.log(`       problem:        ${i.problem}`);
    console.log();
  });
}

if (notices.length > 0) {
  console.log('ℹ️   NOTICES:\n');
  notices.forEach((i, n) => {
    console.log(`  [${n+1}] ${i.severity} — ${i.file}`);
    console.log(`       import/require: "${i.ref}"`);
    console.log(`       ${i.problem}`);
    console.log();
  });
}

// ── Summary by category ────────────────────────────────────────────────────────
const errors = issues.filter(i => i.severity === 'ERROR');
const warns  = issues.filter(i => i.severity === 'WARN');

console.log('====================================================');
console.log(`  Errors (wrong ext):  ${errors.length}`);
console.log(`  Warnings (missing):  ${warns.length}`);
console.log(`  Info (cjs calls):    ${notices.length}`);
console.log('====================================================\n');
