// ============================================================
// VoteCapsule — Tenant Service Unit Tests
// ============================================================
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { TenantsService, Tenant } from './tenants.service';
import { DATABASE_POOL } from '../database/database.module';

// ── Mocks ────────────────────────────────────────────────────

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

const mockPool = {
  query: vi.fn(),
  connect: vi.fn().mockResolvedValue(mockClient),
};

const sampleTenant: Tenant = {
  id: 'tenant-1',
  name: 'Kenya Elections Board',
  slug: 'kenya-elections-board',
  type: 'ELECTION_AUTHORITY',
  status: 'active',
  countryCode: 'KE',
  logoUrl: null,
  primaryColor: '#006600',
  contactEmail: 'admin@keb.go.ke',
  contactPhone: '+254712345678',
  settings: {},
  createdBy: 'admin-1',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  deletedAt: null,
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: DATABASE_POOL, useValue: mockPool },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    vi.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  // ── findAll() ──────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated results', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [sampleTenant] });

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(3);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should respect custom page and limit', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [10, 20],
      );
    });

    it('should cap limit at 100', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '200' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.findAll({ page: 1, limit: 999 });

      expect(result.meta.limit).toBe(100);
    });
  });

  // ── findById() ─────────────────────────────────────────────

  describe('findById()', () => {
    it('should return tenant when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [sampleTenant] });

      const result = await service.findById('tenant-1');

      expect(result).toEqual(sampleTenant);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND deleted_at IS NULL'),
        ['tenant-1'],
      );
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ── findBySlug() ───────────────────────────────────────────

  describe('findBySlug()', () => {
    it('should return tenant by slug', async () => {
      mockPool.query.mockResolvedValue({ rows: [sampleTenant] });

      const result = await service.findBySlug('kenya-elections-board');

      expect(result).toEqual(sampleTenant);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE slug = $1'),
        ['kenya-elections-board'],
      );
    });

    it('should return null when slug not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.findBySlug('non-existent-slug');

      expect(result).toBeNull();
    });
  });

  // ── create() ───────────────────────────────────────────────

  describe('create()', () => {
    it('should generate slug from name and create tenant', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...sampleTenant, slug: 'nairobi-county-elections' }] });

      const result = await service.create(
        {
          name: 'Nairobi County Elections',
          type: 'ELECTION_AUTHORITY',
          countryCode: 'KE',
        },
        'admin-1',
      );

      expect(result.slug).toBe('nairobi-county-elections');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenants'),
        expect.arrayContaining(['Nairobi County Elections', 'nairobi-county-elections']),
      );
    });

    it('should use proposed slug when provided', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...sampleTenant, slug: 'custom-slug' }] });

      await service.create(
        {
          name: 'Any Name',
          slug: 'Custom Slug!',
          type: 'POLITICAL_PARTY',
        },
        'admin-1',
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM tenants WHERE slug'),
        ['custom-slug-'],
      );
    });

    it('should throw ConflictException on duplicate slug', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-id' }] });

      await expect(
        service.create({ name: 'Duplicate', type: 'NGO' }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── update() ───────────────────────────────────────────────

  describe('update()', () => {
    it('should update tenant fields', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [sampleTenant] })
        .mockResolvedValueOnce({ rows: [{ ...sampleTenant, name: 'Updated Name' }] });

      const result = await service.update('tenant-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tenants SET'),
        expect.arrayContaining(['tenant-1', 'Updated Name']),
      );
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        service.update('non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── softDelete() ───────────────────────────────────────────

  describe('softDelete()', () => {
    it('should set deleted_at timestamp', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [sampleTenant] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await service.softDelete('tenant-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET deleted_at = NOW()'),
        ['tenant-1'],
      );
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(service.softDelete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getSettings() ──────────────────────────────────────────

  describe('getSettings()', () => {
    it('should return key-value map of settings', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { key: 'max_agents', value: 50 },
          { key: 'enable_ai', value: true },
        ],
      });

      const result = await service.getSettings('tenant-1');

      expect(result).toEqual({ max_agents: 50, enable_ai: true });
    });

    it('should return empty object when no settings', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getSettings('tenant-1');

      expect(result).toEqual({});
    });
  });

  // ── updateSettings() ───────────────────────────────────────

  describe('updateSettings()', () => {
    it('should upsert each setting in a transaction', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      await service.updateSettings(
        'tenant-1',
        { max_agents: 100, enable_sms: false },
        'admin-1',
      );

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (tenant_id, key) DO UPDATE'),
        expect.arrayContaining(['tenant-1', 'max_agents']),
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.updateSettings('tenant-1', { bad_key: 'value' }, 'admin-1'),
      ).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // ── getTenantStats() ───────────────────────────────────────

  describe('getTenantStats()', () => {
    it('should return counts grouped by type', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { type: 'ELECTION_AUTHORITY', count: '2' },
          { type: 'POLITICAL_PARTY', count: '15' },
          { type: 'NGO', count: '3' },
        ],
      });

      const result = await service.getTenantStats();

      expect(result).toEqual({
        ELECTION_AUTHORITY: 2,
        POLITICAL_PARTY: 15,
        NGO: 3,
      });
    });

    it('should return empty object when no tenants', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getTenantStats();

      expect(result).toEqual({});
    });
  });

  // ── slug generation (via create) ──────────────────────────

  describe('slug generation', () => {
    it('should lowercase and replace spaces with hyphens', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...sampleTenant, slug: 'jubilee-party-kenya' }] });

      await service.create({ name: 'Jubilee Party Kenya', type: 'POLITICAL_PARTY' }, 'admin-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM tenants WHERE slug'),
        ['jubilee-party-kenya'],
      );
    });

    it('should strip special characters', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...sampleTenant, slug: 'test-orgs-name' }] });

      await service.create({ name: "Test Org's Name!", type: 'NGO' }, 'admin-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM tenants WHERE slug'),
        ['test-orgs-name'],
      );
    });
  });
});
