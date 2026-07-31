/**
 * Vote Capsule™ Identity Service — Users Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { DATABASE_POOL } from '../database/database.module';

const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    mockPool.query.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DATABASE_POOL, useValue: mockPool },
      ],
    }).compile();

    service = moduleRef.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      const mockUser = {
        id: 'test-uuid',
        email: 'test@test.com',
        emailVerified: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });

      const result = await service.findById('test-uuid');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.findById('nonexistent-uuid');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should throw ConflictException if user email exists', async () => {
      const existingUser = { id: 'existing-id', email: 'test@test.com' };
      mockPool.query.mockResolvedValueOnce({ rows: [existingUser], rowCount: 1 });

      await expect(
        service.create({ email: 'test@test.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user successfully', async () => {
      const newUser = {
        id: 'new-uuid',
        email: 'newuser@test.com',
        emailVerified: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // findByEmail returns null (user doesn't exist)
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // INSERT user
      mockPool.query.mockResolvedValueOnce({ rows: [newUser], rowCount: 1 });
      // INSERT profile
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await service.create({ email: 'newuser@test.com' });
      expect(result.email).toBe('newuser@test.com');
    });
  });

  describe('softDelete', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(service.softDelete('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
