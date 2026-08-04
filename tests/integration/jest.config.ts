// ============================================================
// VoteCapsule Integration Tests — Jest Configuration
// tests/integration/jest.config.ts
//
// Sequential execution (--runInBand) is enforced because tests
// create and mutate shared state (capsules, elections).
// ============================================================
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.json' }],
  },

  // 60s per test — evidence pipeline includes AI verification polling
  testTimeout: 60_000,

  // Global setup: authenticate once before all suites
  globalSetup: undefined,

  // Sequential execution — tests depend on prior state
  // (enforced via CLI --runInBand, but also set here as safeguard)
  maxWorkers: 1,

  // Reporter configuration
  reporters: ['default'],

  // Verbose output for CI debugging
  verbose: true,
};

export default config;
