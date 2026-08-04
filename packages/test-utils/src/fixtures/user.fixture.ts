/**
 * Vote Capsule™ — User Test Fixtures
 *
 * Factory functions for creating test users with various roles
 * matching the platform's RBAC model.
 */

export function createTestUser(role = 'CAPSULE_AGENT') {
  return {
    id: `user-${Date.now()}`,
    email: `test.${role.toLowerCase()}@votecapsule.co.ke`,
    role,
    tenantId: 'tenant-001',
    cognitoSub: `sub-${Date.now()}`,
    isActive: true,
    createdAt: new Date(),
  };
}

export function createTestAdmin() { return createTestUser('PLATFORM_SUPER_ADMIN'); }
export function createTestAgent() { return createTestUser('CAPSULE_AGENT'); }
export function createTestValidator() { return createTestUser('VALIDATOR'); }
