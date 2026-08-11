// ============================================================
// VoteCapsule™ — Metro Bundler Config (validator-mobile)
// ============================================================
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Symlinks (pnpm uses JUNCTION points on Windows)
config.resolver.unstable_enableSymlinks = true;

// Monorepo watch scope
config.watchFolders = [monorepoRoot];

// Node module resolution order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules/.pnpm/node_modules'),
];

module.exports = config;
