/**
 * Post-build shim generator for @vote-capsule/types
 *
 * Creates root-level dist/index.js and dist/common.js that re-export from
 * dist/cjs/ — this ensures Node.js in Docker always finds valid CJS modules
 * even when pnpm deploy copies stale workspace symlinks.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

// Root-level shims that forward to the CJS build
fs.writeFileSync(
  path.join(distDir, 'index.js'),
  "'use strict';\nmodule.exports = require('./cjs/index.js');\n"
);

fs.writeFileSync(
  path.join(distDir, 'common.js'),
  "'use strict';\nmodule.exports = require('./cjs/common.js');\n"
);

// Root-level type declarations — point to esm which has the .d.ts files
fs.writeFileSync(
  path.join(distDir, 'index.d.ts'),
  "export * from './esm/index';\n"
);

fs.writeFileSync(
  path.join(distDir, 'common.d.ts'),
  "export * from './esm/common';\n"
);

console.log('✅ @vote-capsule/types: root-level CJS shims generated');
