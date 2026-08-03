// ============================================================
// VoteCapsule™ — Metro Bundler Config
// apps/agent-mobile/metro.config.js
//
// Required for pnpm monorepo on Windows:
//   - enableSymlinks lets Metro follow JUNCTION points
//   - watchFolders exposes the pnpm store to Metro
//   - nodeModulesPaths ensures resolution walks up correctly
//
// Web-specific fixes:
//   - extraNodeModules aliases 'crypto' to a browser-safe shim,
//     bypassing the broken crypto@1.0.1 npm stub that pnpm
//     hoists from services/identity into the shared store.
//   - resolveRequest intercepts the 'crypto' module for web
//     and points Metro at our local shim so the build succeeds.
// ============================================================
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ── Symlinks (pnpm uses JUNCTION points on Windows) ──────────
config.resolver.unstable_enableSymlinks = true;

// ── Monorepo watch scope ──────────────────────────────────────
config.watchFolders = [monorepoRoot];

// ── Node module resolution order ─────────────────────────────
// Walk: app-local → monorepo root → pnpm flat store
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules/.pnpm/node_modules'),
];

// ── Web: alias broken Node built-in stubs ────────────────────
// The deprecated `crypto@1.0.1` npm package (hoisted from
// services/identity) declares `"main": "index.js"` but ships
// no actual file, causing Metro to crash on web.
// Point 'crypto' at our browser-safe shim for the web platform.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: path.resolve(projectRoot, 'src/shims/crypto.web.js'),
};

// ── resolveRequest: platform-aware crypto override ───────────
// Only redirect 'crypto' on web — let native use expo-crypto
// and the real Node crypto as normal.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'crypto' && platform === 'web') {
    return {
      filePath: path.resolve(projectRoot, 'src/shims/crypto.web.js'),
      type: 'sourceFile',
    };
  }
  // Fall through to default resolver for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
