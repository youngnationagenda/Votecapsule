/**
 * Vote Capsule™ Tenant Service — Subscriptions Service
 *
 * Manages tenant subscriptions and licensing.
 */

import {
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../database/database.module';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

export interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  status: string;
  billingCycle: string | null;
  startsAt: Date;
  endsAt: Date | null;
  maxUsers: number | null;
  maxElections: number | null;
  features: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(@Inject(DATABASE_POOL) private readonly db: Pool) {}

  async findByTenant(tenantId: string): Promise<Subscription | null> {
    const result = await this.db.query<Subscription>(
      `SELECT id, tenant_id as "tenantId", plan, status, billing_cycle as "billingCycle",
              starts_at as "startsAt", ends_at as "endsAt",
              max_users as "maxUsers", max_elections as "maxElections",
              features, created_at as "createdAt", updated_at as "updatedAt"
       FROM subscriptions WHERE tenant_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    );
    return result.rows[0] ?? null;
  }

  async create(tenantId: string, dto: CreateSubscriptionDto): Promise<Subscription> {
    const id = uuidv4();
    const result = await this.db.query<Subscription>(
      `INSERT INTO subscriptions
         (id, tenant_id, plan, status, billing_cycle, starts_at, ends_at, max_users, max_elections, features)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9)
       RETURNING id, tenant_id as "tenantId", plan, status, billing_cycle as "billingCycle",
                 starts_at as "startsAt", ends_at as "endsAt",
                 max_users as "maxUsers", max_elections as "maxElections",
                 features, created_at as "createdAt", updated_at as "updatedAt"`,
      [
        id, tenantId, dto.plan, dto.billingCycle ?? null,
        dto.startsAt, dto.endsAt ?? null,
        dto.maxUsers ?? null, dto.maxElections ?? null,
        JSON.stringify(dto.features ?? {}),
      ],
    );
    this.logger.log(`Created subscription for tenant ${tenantId}: ${dto.plan}`);
    return result.rows[0]!;
  }

  async update(tenantId: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No active subscription found for this tenant');

    const result = await this.db.query<Subscription>(
      `UPDATE subscriptions SET
         plan = COALESCE($2, plan),
         status = COALESCE($3, status),
         billing_cycle = COALESCE($4, billing_cycle),
         ends_at = COALESCE($5, ends_at),
         max_users = COALESCE($6, max_users),
         max_elections = COALESCE($7, max_elections),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, tenant_id as "tenantId", plan, status, billing_cycle as "billingCycle",
                 starts_at as "startsAt", ends_at as "endsAt",
                 max_users as "maxUsers", max_elections as "maxElections",
                 features, created_at as "createdAt", updated_at as "updatedAt"`,
      [
        subscription.id,
        dto.plan ?? null, dto.status ?? null,
        dto.billingCycle ?? null, dto.endsAt ?? null,
        dto.maxUsers ?? null, dto.maxElections ?? null,
      ],
    );
    return result.rows[0]!;
  }
}
