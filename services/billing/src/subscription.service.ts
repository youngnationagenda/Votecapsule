// ============================================================
// VoteCapsule — SubscriptionService
// Manages tenant subscriptions, upgrades, cancellations
// Auto-generates invoices on subscription creation
// ============================================================
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, Invoice, InvoiceItem } from './entities';
import { PlanService } from './plan.service';
import { CreateSubscriptionDto } from './dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepo: Repository<InvoiceItem>,
    private readonly planService: PlanService,
  ) {}

  /** Create a new subscription for a tenant with custom pricing */
  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    // Resolve plan — by planId or planCode
    let planId = dto.planId;
    if (!planId && dto.planCode) {
      const plan = await this.planService.findByCode(dto.planCode);
      planId = plan.id;
    }
    if (!planId) {
      throw new BadRequestException('Either planId or planCode is required');
    }

    const plan = await this.planService.findById(planId);

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, dto.billingCycle ?? 'one_time');

    // Calculate the agreed price
    const agreedPrice = dto.customPrice
      ?? dto.lumpSumAmount
      ?? (dto.pricePerStation && dto.stationCount ? dto.pricePerStation * dto.stationCount : 0)
      ?? plan.priceMonthly;

    const subscription = this.subRepo.create({
      tenantId: dto.tenantId,
      planId: plan.id,
      billingCycle: dto.billingCycle ?? 'one_time',
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      status: 'active',
      metadata: {
        pricingType: dto.pricingType ?? 'lump_sum',
        customPrice: agreedPrice,
        pricePerStation: dto.pricePerStation ?? null,
        stationCount: dto.stationCount ?? null,
        lumpSumAmount: dto.lumpSumAmount ?? null,
        notes: dto.notes ?? null,
        planCode: dto.planCode ?? plan.code,
        planName: plan.name,
      },
    });

    const savedSub = await this.subRepo.save(subscription);
    this.logger.log(`Created subscription ${savedSub.id} for tenant ${dto.tenantId} — plan: ${plan.code}, price: KES ${agreedPrice}`);

    // Auto-generate invoice if requested (default: true)
    if (dto.generateInvoice !== false && agreedPrice > 0) {
      await this.generateInvoice(savedSub, agreedPrice, dto);
    }

    return savedSub;
  }

  /** Generate invoice for a subscription */
  private async generateInvoice(
    subscription: Subscription,
    totalAmount: number,
    dto: CreateSubscriptionDto,
  ): Promise<Invoice> {
    const invoiceNumber = this.generateInvoiceNumber(subscription.tenantId);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days to pay

    const invoice = this.invoiceRepo.create({
      tenantId: subscription.tenantId,
      subscriptionId: subscription.id,
      invoiceNumber,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      dueDate,
      currency: 'KES',
      subtotal: totalAmount,
      taxAmount: 0, // VAT exemption for now
      taxRate: 0,
      discountAmount: 0,
      total: totalAmount,
      amountDue: totalAmount,
      amountPaid: 0,
      status: 'issued',
      issuedAt: new Date(),
      notes: dto.notes ?? null,
      metadata: {
        planCode: dto.planCode,
        pricingType: dto.pricingType,
        pricePerStation: dto.pricePerStation,
        stationCount: dto.stationCount,
      },
    });

    const savedInvoice = await this.invoiceRepo.save(invoice);

    // Create invoice line items
    if (dto.pricingType === 'per_station' && dto.pricePerStation && dto.stationCount) {
      const item = this.invoiceItemRepo.create({
        invoiceId: savedInvoice.id,
        description: `Evidence capture — ${dto.stationCount} polling station(s) @ KES ${dto.pricePerStation}/station`,
        itemType: 'per_station',
        quantity: dto.stationCount,
        unitPrice: dto.pricePerStation,
        amount: totalAmount,
      });
      await this.invoiceItemRepo.save(item);
    } else {
      const item = this.invoiceItemRepo.create({
        invoiceId: savedInvoice.id,
        description: `${dto.planCode ?? 'Platform'} Plan — Lump sum agreement`,
        itemType: 'lump_sum',
        quantity: 1,
        unitPrice: totalAmount,
        amount: totalAmount,
      });
      await this.invoiceItemRepo.save(item);
    }

    this.logger.log(`Generated invoice ${invoiceNumber} for KES ${totalAmount} — tenant ${subscription.tenantId}`);
    return savedInvoice;
  }

  /** Generate unique invoice number: VC-YYYYMMDD-XXXX */
  private generateInvoiceNumber(tenantId: string): string {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `VC-${dateStr}-${rand}`;
  }

  /** Find all subscriptions (admin view) */
  async findAll(): Promise<Subscription[]> {
    return this.subRepo.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
      relations: ['plan'],
    });
  }

  /** Find all subscriptions for a tenant */
  async findByTenantId(tenantId: string): Promise<Subscription[]> {
    return this.subRepo.find({
      where: { tenantId, isDeleted: false },
      order: { createdAt: 'DESC' },
      relations: ['plan'],
    });
  }

  /** Find a subscription by ID */
  async findById(id: string): Promise<Subscription> {
    const sub = await this.subRepo.findOne({ where: { id, isDeleted: false }, relations: ['plan'] });
    if (!sub) throw new NotFoundException(`Subscription ${id} not found`);
    return sub;
  }

  /** Upgrade or downgrade a subscription to a new plan */
  async upgrade(id: string, newPlanId: string): Promise<Subscription> {
    const sub = await this.findById(id);
    if (sub.status !== 'active') {
      throw new BadRequestException('Can only upgrade active subscriptions');
    }

    const newPlan = await this.planService.findById(newPlanId);
    sub.planId = newPlan.id;
    sub.version += 1;
    sub.metadata = {
      ...sub.metadata,
      lastUpgrade: { from: sub.planId, to: newPlanId, at: new Date().toISOString() },
    };

    return this.subRepo.save(sub);
  }

  /** Cancel a subscription */
  async cancel(id: string, reason: string, cancelAtPeriodEnd: boolean): Promise<Subscription> {
    const sub = await this.findById(id);
    if (sub.status === 'cancelled') {
      throw new BadRequestException('Subscription is already cancelled');
    }

    sub.cancelReason = reason;
    sub.cancelAtPeriodEnd = cancelAtPeriodEnd;

    if (!cancelAtPeriodEnd) {
      sub.status = 'cancelled';
      sub.cancelledAt = new Date();
    }

    sub.version += 1;
    return this.subRepo.save(sub);
  }

  /** Suspend a subscription for non-payment */
  async suspend(id: string): Promise<Subscription> {
    const sub = await this.findById(id);
    if (sub.status !== 'active' && sub.status !== 'past_due') {
      throw new BadRequestException('Can only suspend active or past_due subscriptions');
    }

    sub.status = 'suspended';
    sub.version += 1;
    return this.subRepo.save(sub);
  }

  /** Reactivate a suspended subscription */
  async reactivate(id: string): Promise<Subscription> {
    const sub = await this.findById(id);
    if (sub.status !== 'suspended') {
      throw new BadRequestException('Can only reactivate suspended subscriptions');
    }

    sub.status = 'active';
    sub.cancelAtPeriodEnd = false;
    sub.cancelReason = null;
    sub.version += 1;
    return this.subRepo.save(sub);
  }

  /** Get the current active subscription for a tenant */
  async getActiveSubscription(tenantId: string): Promise<Subscription | null> {
    return this.subRepo.findOne({
      where: { tenantId, status: 'active', isDeleted: false },
      order: { createdAt: 'DESC' },
      relations: ['plan'],
    });
  }

  // ----- Helpers -----

  private calculatePeriodEnd(start: Date, cycle: string): Date {
    const end = new Date(start);
    switch (cycle) {
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'one_time':
        // One-time: period covers the full election cycle (6 months)
        end.setMonth(end.getMonth() + 6);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}
