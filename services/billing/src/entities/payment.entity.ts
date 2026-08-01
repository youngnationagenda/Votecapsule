// ============================================================
// VoteCapsule — Payment Entity
// maps to: payments
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
import { Invoice } from './invoice.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId: string | null;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  // Amount
  @Column({ type: 'varchar', length: 3, default: 'KES' })
  currency: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  // Payment method
  @Column({ name: 'payment_method', type: 'varchar', length: 30 })
  paymentMethod: string;

  @Column({ name: 'payment_provider', type: 'varchar', length: 50, nullable: true })
  paymentProvider: string | null;

  // Provider reference
  @Column({ name: 'provider_transaction_id', type: 'varchar', length: 255, nullable: true })
  providerTransactionId: string | null;

  @Column({ name: 'provider_response', type: 'jsonb', nullable: true })
  providerResponse: Record<string, unknown> | null;

  // Status
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  // Dates
  @Column({ name: 'initiated_at', type: 'timestamptz' })
  initiatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  // Refund tracking
  @Column({ name: 'refunded_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt: Date | null;

  @Column({ name: 'refund_reason', type: 'text', nullable: true })
  refundReason: string | null;

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
