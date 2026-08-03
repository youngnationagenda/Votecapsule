// ============================================================
// VoteCapsule™ — Babel Config
// apps/agent-mobile/babel.config.js
// ============================================================
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for TypeScript decorators (used by reflect-metadata).
      // Decorators must be declared BEFORE class-properties per Babel ordering rules.
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Replaces deprecated @babel/plugin-proposal-class-properties
      ['@babel/plugin-transform-class-properties', { loose: true }],
    ],
  };
};
