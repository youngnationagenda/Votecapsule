// ============================================================
// VoteCapsule — Subscription Entity
// maps to: subscriptions
// ============================================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { PricingPlan } from './pricing-plan.entity';
import { License } from './license.entity';
import { Invoice } from './invoice.entity';
import { UsageRecord } from './usage-record.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => PricingPlan, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: PricingPlan;

  // Billing cycle
  @Column({ name: 'billing_cycle', type: 'varchar', length: 20, default: 'monthly' })
  billingCycle: string;

  @Column({ name: 'billing_anchor_day', type: 'int', default: 1 })
  billingAnchorDay: number;

  // Period
  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'current_period_start', type: 'timestamptz' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end', type: 'timestamptz' })
  currentPeriodEnd: Date;

  @Column({ name: 'trial_ends_at', type: 'timestamptz', nullable: true })
  trialEndsAt: Date | null;

  // Status
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  // Cancellation
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean;

  // Usage overrides
  @Column({ name: 'max_elections_override', type: 'int', nullable: true })
  maxElectionsOverride: number | null;

  @Column({ name: 'max_agents_override', type: 'int', nullable: true })
  maxAgentsOverride: number | null;

  // Metadata
  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  // Relations
  @OneToMany(() => License, (license) => license.subscription)
  licenses: License[];

  @OneToMany(() => Invoice, (invoice) => invoice.subscription)
  invoices: Invoice[];

  @OneToMany(() => UsageRecord, (usage) => usage.subscription)
  usageRecords: UsageRecord[];
}
