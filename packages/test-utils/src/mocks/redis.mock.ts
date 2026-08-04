/**
 * Vote Capsule™ — Mock Redis (ioredis)
 *
 * Provides a pre-configured mock Redis client with pipeline support
 * for testing session/cache services without a live Redis instance.
 */

export function createMockRedis() {
  const pipeline = {
    set: jest.fn().mockReturnThis(),
    sadd: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    sadd: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    srem: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    pipeline: jest.fn(() => pipeline),
    quit: jest.fn().mockResolvedValue('OK'),
  };
}
