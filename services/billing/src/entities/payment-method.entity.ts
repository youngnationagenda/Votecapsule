// ============================================================
// VoteCapsule — PaymentMethod Entity
// maps to: payment_methods
// ============================================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'method_type', type: 'varchar', length: 30 })
  methodType: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Details
  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string | null;

  @Column({ name: 'last_four', type: 'varchar', length: 4, nullable: true })
  lastFour: string | null;

  @Column({ name: 'provider_token', type: 'varchar', length: 500, nullable: true })
  providerToken: string | null;

  // M-Pesa specific
  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  // Card specific
  @Column({ name: 'card_brand', type: 'varchar', length: 20, nullable: true })
  cardBrand: string | null;

  @Column({ name: 'card_exp_month', type: 'int', nullable: true })
  cardExpMonth: number | null;

  @Column({ name: 'card_exp_year', type: 'int', nullable: true })
  cardExpYear: number | null;

  // Bank specific
  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName: string | null;

  @Column({ name: 'account_number_masked', type: 'varchar', length: 50, nullable: true })
  accountNumberMasked: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
