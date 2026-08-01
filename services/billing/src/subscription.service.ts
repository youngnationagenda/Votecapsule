// ============================================================
// VoteCapsule — SubscriptionService
// Manages tenant subscriptions, upgrades, cancellations
// ============================================================
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities';
import { PlanService } from './plan.service';
import { CreateSubscriptionDto } from './dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly planService: PlanService,
  ) {}

  /** Create a new subscription for a tenant */
  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    const plan = await this.planService.findById(dto.planId);

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, dto.billingCycle ?? 'monthly');

    const subscription = this.subRepo.create({
      tenantId: dto.tenantId,
      planId: plan.id,
      billingCycle: dto.billingCycle ?? 'monthly',
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      status: 'active',
    });

    return this.subRepo.save(subscription);
  }

  /** Find all subscriptions for a tenant */
  async findByTenantId(tenantId: string): Promise<Subscription[]> {
    return this.subRepo.find({
      where: { tenantId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  /** Find a subscription by ID */
  async findById(id: string): Promise<Subscription> {
    const sub = await this.subRepo.findOne({ where: { id, isDeleted: false } });
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
    });
  }

  // ----- Helpers -----

  private calculatePeriodEnd(start: Date, cycle: string): Date {
    const end = new Date(start);
    if (cycle === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      // monthly or custom defaults to monthly
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}
