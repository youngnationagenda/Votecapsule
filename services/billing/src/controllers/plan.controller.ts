// ============================================================
// VoteCapsule — PlanController
// REST endpoints for pricing plans
// ============================================================
import { Controller, Get, Param } from '@nestjs/common';
import { PlanService } from '../plan.service';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'billing', timestamp: new Date().toISOString() };
  }

  /** GET /plans — all active plans */
  @Get()
  findAll() {
    return this.planService.getPublicPlans();
  }

  /** GET /plans/:id */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.planService.findById(id);
  }

  /** GET /plans/code/:code */
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.planService.findByCode(code);
  }
}
