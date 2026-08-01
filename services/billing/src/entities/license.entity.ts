// ============================================================
// VoteCapsule — License Entity
// maps to: licenses
// ============================================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @ManyToOne(() => Subscription, (sub) => sub.licenses)
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @Column({ name: 'license_key', type: 'varchar', length: 64, unique: true })
  licenseKey: string;

  @Column({ name: 'license_type', type: 'varchar', length: 50 })
  licenseType: string;

  // Scope
  @Column({ name: 'election_id', type: 'uuid', nullable: true })
  electionId: string | null;

  @Column({ name: 'feature_code', type: 'varchar', length: 50, nullable: true })
  featureCode: string | null;

  // Validity
  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom: Date;

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Limits
  @Column({ name: 'max_usage', type: 'int', nullable: true })
  maxUsage: number | null;

  @Column({ name: 'current_usage', type: 'int', default: 0 })
  currentUsage: number;

  // Metadata
  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
