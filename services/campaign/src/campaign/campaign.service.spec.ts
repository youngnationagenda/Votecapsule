// ============================================================
// VoteCapsule™ — Campaign Service Unit Tests
// services/campaign/src/campaign/campaign.service.spec.ts
// 22 tests: CRUD, status transitions, tenant isolation, dashboard
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignService } from './campaign.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

// ── Mock campaign ────────────────────────────────────────────

const mockCampaign = {
  id: 'camp-001',
  tenantId: 'tenant-001',
  candidateId: 'cand-001',
  electionId: 'elec-001',
  partyId: 'party-001',
  name: 'UDA Kasarani 2027 Campaign',
  status: 'created',
  campaignStartDate: '2027-01-01',
  countyCode: '047',
  constituencyCode: '270',
  targetWards: ['047270001', '047270002'],
  goals: {},
  createdBy: 'user-001',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeMockRepo(data: any = mockCampaign) {
  return {
    findOne:  vi.fn().mockResolvedValue(data),
    find:     vi.fn().mockResolvedValue([data]),
    create:   vi.fn((d: any) => ({ ...d, id: 'camp-001' })),
    save:     vi.fn().mockImplementation(async (e: any) => ({ ...data, ...e })),
    update:   vi.fn().mockResolvedValue({ affected: 1 }),
    delete:   vi.fn().mockResolvedValue({ affected: 1 }),
    count:    vi.fn().mockResolvedValue(1),
  };
}

// DataSource mock — getDashboard() uses dataSource.query() for real COUNT queries
const mockDataSource = {
  query: vi.fn().mockResolvedValue([{ count: 0 }]),
};

let service: CampaignService;
let mockRepo: ReturnType<typeof makeMockRepo>;

beforeEach(() => {
  mockRepo = makeMockRepo();
  mockDataSource.query.mockResolvedValue([{ count: 0 }]);
  service = new CampaignService(mockRepo as any, mockDataSource as unknown as DataSource);
});

// ─────────────────────────────────────────────────────────────

describe('CampaignService', () => {

  // ── create ──────────────────────────────────────────────────
  describe('create()', () => {
    it('creates campaign with status "created"', async () => {
      const dto = { tenantId: 'tenant-001', candidateId: 'cand-001', electionId: 'elec-001', name: 'Test' };
      await service.create(dto as any, 'user-001');
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'created',
        createdBy: 'user-001',
      }));
    });

    it('defaults targetWards to []', async () => {
      await service.create({ tenantId: 'x', candidateId: 'y', electionId: 'z', name: 'n' } as any, 'u');
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ targetWards: [] }));
    });

    it('saves and returns campaign', async () => {
      const result = await service.create({ tenantId: 't', candidateId: 'c', electionId: 'e', name: 'n' } as any, 'u');
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('camp-001');
    });
  });

  // ── findAll ──────────────────────────────────────────────────
  describe('findAll()', () => {
    it('queries by tenantId', async () => {
      await service.findAll('tenant-001');
      expect(mockRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-001' }),
      }));
    });

    it('filters by status', async () => {
      await service.findAll('tenant-001', 'active');
      expect(mockRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: 'active' }),
      }));
    });

    it('returns empty array for unknown tenant', async () => {
      mockRepo.find.mockResolvedValueOnce([]);
      const result = await service.findAll('unknown');
      expect(result).toHaveLength(0);
    });
  });

  // ── findOne ──────────────────────────────────────────────────
  describe('findOne()', () => {
    it('returns campaign by id and tenantId', async () => {
      const result = await service.findOne('camp-001', 'tenant-001');
      expect(result.id).toBe('camp-001');
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne('missing', 'tenant-001')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ───────────────────────────────────────────────────
  describe('update()', () => {
    it('updates mutable fields', async () => {
      const result = await service.update('camp-001', 'tenant-001', { name: 'New Name' } as any);
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws on closed campaign', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockCampaign, status: 'closed' });
      await expect(
        service.update('camp-001', 'tenant-001', { name: 'x' } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('throws on archived campaign', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockCampaign, status: 'archived' });
      await expect(
        service.update('camp-001', 'tenant-001', { name: 'x' } as any)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── updateStatus ─────────────────────────────────────────────
  describe('updateStatus()', () => {
    it('transitions created → planning', async () => {
      const result = await service.updateStatus('camp-001', 'tenant-001', 'planning' as any);
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'planning' }));
    });

    it('transitions active → suspended', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockCampaign, status: 'active' });
      await service.updateStatus('camp-001', 'tenant-001', 'suspended' as any);
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended' }));
    });

    it('transitions active → closed', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockCampaign, status: 'active' });
      await service.updateStatus('camp-001', 'tenant-001', 'closed' as any);
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed' }));
    });

    it('rejects invalid: active → created', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockCampaign, status: 'active' });
      await expect(
        service.updateStatus('camp-001', 'tenant-001', 'created' as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid: closed → planning', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockCampaign, status: 'closed' });
      await expect(
        service.updateStatus('camp-001', 'tenant-001', 'planning' as any)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── remove ───────────────────────────────────────────────────
  describe('remove()', () => {
    it('deletes campaign in "created" status', async () => {
      await service.remove('camp-001', 'tenant-001');
      expect(mockRepo.delete).toHaveBeenCalledWith({ id: 'camp-001', tenantId: 'tenant-001' });
    });

    it('throws when deleting active campaign', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockCampaign, status: 'active' });
      await expect(service.remove('camp-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });

    it('throws when deleting closed campaign', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockCampaign, status: 'closed' });
      await expect(service.remove('camp-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });

  // ── getDashboard ─────────────────────────────────────────────
  describe('getDashboard()', () => {
    it('returns dashboard with expected fields', async () => {
      const result = await service.getDashboard('camp-001', 'tenant-001');
      expect(result).toHaveProperty('eventsCount');
      expect(result).toHaveProperty('teamCount');
      expect(result).toHaveProperty('tasksActive');
      expect(result).toHaveProperty('volunteersCount');
      expect(result).toHaveProperty('smsSent');
      expect(result).toHaveProperty('campaign');
    });

    it('throws if campaign not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getDashboard('missing', 'tenant-001')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getStats ─────────────────────────────────────────────────
  describe('getStats()', () => {
    it('returns total, active, created, closed counts', async () => {
      const result = await service.getStats('tenant-001');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('closed');
      expect(mockRepo.count).toHaveBeenCalledTimes(4);
    });
  });

});
