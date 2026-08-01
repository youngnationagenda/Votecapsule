// ============================================================
// VoteCapsule — PricingPlan Entity
// maps to: pricing_plans
// ============================================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pricing_plans')
export class PricingPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Pricing
  @Column({ type: 'varchar', length: 3, default: 'KES' })
  currency: string;

  @Column({ name: 'price_monthly', type: 'numeric', precision: 12, scale: 2, default: 0 })
  priceMonthly: number;

  @Column({ name: 'price_yearly', type: 'numeric', precision: 12, scale: 2, default: 0 })
  priceYearly: number;

  @Column({ name: 'setup_fee', type: 'numeric', precision: 12, scale: 2, default: 0 })
  setupFee: number;

  // Limits
  @Column({ name: 'max_elections', type: 'int', nullable: true })
  maxElections: number | null;

  @Column({ name: 'max_agents', type: 'int', nullable: true })
  maxAgents: number | null;

  @Column({ name: 'max_polling_stations', type: 'int', nullable: true })
  maxPollingStations: number | null;

  @Column({ name: 'max_capsules_per_election', type: 'int', nullable: true })
  maxCapsulesPerElection: number | null;

  @Column({ name: 'max_users', type: 'int', nullable: true })
  maxUsers: number | null;

  @Column({ name: 'max_storage_gb', type: 'int', nullable: true })
  maxStorageGb: number | null;

  // Features
  @Column({ type: 'jsonb', default: '[]' })
  features: string[];

  // Status
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_public', type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
