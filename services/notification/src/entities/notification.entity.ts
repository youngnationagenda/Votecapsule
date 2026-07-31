// ============================================================
// VoteCapsule — Notification Entity
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
  OneToMany,
} from 'typeorm';
import { NotificationTemplate, NotificationChannel } from './notification-template.entity';
import { NotificationDelivery } from './notification-delivery.entity';

export enum NotificationStatus {
  PENDING   = 'PENDING',
  SENT      = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED    = 'FAILED',
  READ      = 'READ',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'notification_type', type: 'varchar', length: 50 })
  notificationType: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, unknown>;

  @Column({
    type: 'varchar',
    length: 20,
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @ManyToOne(() => NotificationTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: NotificationTemplate | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ name: 'reference_type', type: 'varchar', length: 100, nullable: true })
  referenceType: string | null;

  @OneToMany(() => NotificationDelivery, (d) => d.notification)
  deliveries: NotificationDelivery[];

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
