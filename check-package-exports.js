/**
 * Vote Capsule™ — package.json exports/main/module field checker
 * Verifies every file referenced in package.json fields actually exists
 * with the correct extension on disk.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;

// Find all package.json files in the monorepo (not node_modules)
function findPackageJsons(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findPackageJsons(full, results);
    else if (e.name === 'package.json') results.push(full);
  }
  return results;
}

const pkgFiles = findPackageJsons(ROOT);
const issues   = [];
const oks      = [];

function checkRef(pkgPath, field, ref) {
  if (!ref || typeof ref !== 'string') return;
  if (!ref.startsWith('./') && !ref.startsWith('../')) return; // skip bare specifiers

  const pkgDir  = path.dirname(pkgPath);
  const target  = path.resolve(pkgDir, ref);
  const relPkg  = path.relative(ROOT, pkgPath).replace(/\\/g, '/');
  const relTarget = path.relative(ROOT, target).replace(/\\/g, '/');

  const exists  = fs.existsSync(target);

  if (!exists) {
    // Check if a same-stem file exists with different extension
    const stem = target.replace(/\.(js|cjs|mjs|ts)$/, '');
    const exts = ['.js', '.cjs', '.mjs', '.ts'];
    const alts = exts.map(e => stem + e).filter(f => fs.existsSync(f));
    const altRels = alts.map(f => path.relative(ROOT, f).replace(/\\/g, '/'));

    issues.push({
      pkg:     relPkg,
      field,
      ref,
      target:  relTarget,
      exists:  false,
      alts:    altRels,
    });
  } else {
    oks.push({ pkg: relPkg, field, ref });
  }
}

function walkExports(pkgPath, field, obj) {
  if (typeof obj === 'string') {
    checkRef(pkgPath, field, obj);
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      walkExports(pkgPath, `${field}.${k}`, v);
    }
  }
}

pkgFiles.forEach(pkgPath => {
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch { return; }

  const fields = ['main', 'module', 'browser', 'types', 'typings'];
  fields.forEach(f => { if (pkg[f]) checkRef(pkgPath, f, pkg[f]); });

  if (pkg.exports) walkExports(pkgPath, 'exports', pkg.exports);
  if (pkg.bin) {
    if (typeof pkg.bin === 'string') checkRef(pkgPath, 'bin', pkg.bin);
    else Object.entries(pkg.bin).forEach(([, v]) => checkRef(pkgPath, 'bin', v));
  }
});

// ── Print ──────────────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log('  Vote Capsule™ — package.json Export Field Check');
console.log('====================================================');
console.log(`  package.json files scanned : ${pkgFiles.length}`);
console.log(`  Valid references           : ${oks.length}`);
console.log(`  Broken/missing references  : ${issues.length}`);
console.log('====================================================\n');

if (issues.length === 0) {
  console.log('✅  All package.json main/module/exports fields point to real files.\n');
} else {
  console.log('❌  ISSUES FOUND:\n');
  issues.forEach((i, n) => {
    const altMsg = i.alts.length
      ? `\n       alternatives on disk: ${i.alts.join(', ')}`
      : '\n       (no alternative extension found either)';
    console.log(`  [${n+1}] ${i.pkg}`);
    console.log(`       field:  "${i.field}"`);
    console.log(`       ref:    "${i.ref}"`);
    console.log(`       target: ${i.target} — FILE NOT FOUND${altMsg}`);
    console.log();
  });
}

console.log('====================================================');
console.log(`  Total issues: ${issues.length}`);
console.log('====================================================\n');
