// ============================================================
// VoteCapsule — PlanService
// Manages pricing plans (read-only for tenants, admin for ops)
// ============================================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingPlan } from './entities';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(PricingPlan)
    private readonly planRepo: Repository<PricingPlan>,
  ) {}

  /** List all active plans (admin view) */
  async findAll(): Promise<PricingPlan[]> {
    return this.planRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** Find a plan by UUID */
  async findById(id: string): Promise<PricingPlan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    return plan;
  }

  /** Find a plan by its unique code */
  async findByCode(code: string): Promise<PricingPlan> {
    const plan = await this.planRepo.findOne({ where: { code } });
    if (!plan) throw new NotFoundException(`Plan with code '${code}' not found`);
    return plan;
  }

  /** Public plans visible on the pricing page */
  async getPublicPlans(): Promise<PricingPlan[]> {
    return this.planRepo.find({
      where: { isActive: true, isPublic: true },
      order: { sortOrder: 'ASC' },
    });
  }
}
