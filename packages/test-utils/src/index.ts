/**
 * Vote Capsule™ Shared Test Utilities
 *
 * Re-exports all mocks and fixtures for use across services.
 */

// Mocks
export { createMockRepository, createMockQueryBuilder } from './mocks/repository.mock';
export { createMockRedis } from './mocks/redis.mock';
export { mockCognitoSuccess, mockCognitoMfaChallenge, mockCognitoError } from './mocks/cognito.mock';

// Fixtures
export {
  createValidCapsule,
  createValidTallyData,
  createInvalidTallyData,
} from './fixtures/capsule.fixture';
export {
  createTestUser,
  createTestAdmin,
  createTestAgent,
  createTestValidator,
} from './fixtures/user.fixture';
