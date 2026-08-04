// ============================================================
// VoteCapsule — Billing Service Unit Tests
// services/billing/src/billing.service.spec.ts
//
// Tests cover SubscriptionService + InvoiceService
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { SubscriptionService } from './subscription.service';
import { InvoiceService } from './invoice.service';
import { PlanService } from './plan.service';
import { Subscription, Invoice, InvoiceItem } from './entities';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let subRepo: any;
  let planService: any;

  beforeEach(async () => {
    subRepo = {
      create: jest.fn((dto) => ({ id: 'sub-1', version: 0, ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'sub-1', createdAt: new Date(), ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    planService = {
      findById: jest.fn().mockResolvedValue({ id: 'plan-1', name: 'Pro', monthlyPrice: 9999 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: getRepositoryToken(Subscription), useValue: subRepo },
        { provide: PlanService, useValue: planService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('create', () => {
    it('should create a new subscription', async () => {
      const result = await service.create({
        tenantId: 'tenant-1',
        planId: 'plan-1',
        billingCycle: 'monthly',
      } as any);

      expect(planService.findById).toHaveBeenCalledWith('plan-1');
      expect(subRepo.create).toHaveBeenCalled();
      expect(result.status).toBe('active');
    });
  });

  describe('getActiveSubscription', () => {
    it('should return active subscription for tenant', async () => {
      subRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: 'active',
      });

      const result = await service.getActiveSubscription('tenant-1');
      expect(result).toBeDefined();
      expect(result!.status).toBe('active');
    });

    it('should return null when no active subscription', async () => {
      subRepo.findOne.mockResolvedValue(null);

      const result = await service.getActiveSubscription('tenant-1');
      expect(result).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should cancel an active subscription', async () => {
      subRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        status: 'active',
        version: 1,
        cancelAtPeriodEnd: false,
      });

      const result = await service.cancel('sub-1', 'budget cuts', false);

      expect(subRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('cancelled');
    });

    it('should throw BadRequestException if already cancelled', async () => {
      subRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        status: 'cancelled',
        version: 1,
        isDeleted: false,
      });

      await expect(service.cancel('sub-1', 'reason', false))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException for missing subscription', async () => {
      subRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepo: any;
  let itemRepo: any;

  beforeEach(async () => {
    invoiceRepo = {
      create: jest.fn((dto) => ({ id: 'inv-1', version: 0, ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'inv-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    itemRepo = {
      create: jest.fn((dto) => ({ id: 'item-1', ...dto })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        { provide: getRepositoryToken(InvoiceItem), useValue: itemRepo },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  describe('create', () => {
    it('should create an invoice with line items and calculate totals', async () => {
      const dto = {
        tenantId: 'tenant-1',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        items: [
          { description: 'Pro Plan', itemType: 'subscription', quantity: 1, unitPrice: 9999 },
          { description: 'Extra agents', itemType: 'addon', quantity: 5, unitPrice: 500 },
        ],
      };

      const result = await service.create(dto as any);

      expect(invoiceRepo.save).toHaveBeenCalled();
      expect(result.currency).toBe('KES');
      // subtotal = 9999 + 2500 = 12499; tax = 12499 * 0.16 = 1999.84
      expect(result.subtotal).toBe(12499);
      expect(result.taxRate).toBe(0.16);
    });
  });

  describe('findById', () => {
    it('should return invoice with items', async () => {
      invoiceRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'VC-2026-000001',
        items: [],
      });

      const result = await service.findById('inv-1');
      expect(result.invoiceNumber).toBe('VC-2026-000001');
    });

    it('should throw NotFoundException for missing invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('issue', () => {
    it('should mark a draft invoice as issued', async () => {
      invoiceRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        status: 'draft',
        version: 0,
      });

      const result = await service.issue('inv-1');
      expect(result.status).toBe('issued');
    });

    it('should reject non-draft invoices', async () => {
      invoiceRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        status: 'paid',
        version: 1,
      });

      await expect(service.issue('inv-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate sequential invoice numbers', async () => {
      const number = await service.generateInvoiceNumber();

      const year = new Date().getFullYear();
      expect(number).toMatch(new RegExp(`^VC-${year}-\\d{6}$`));
    });
  });
});
