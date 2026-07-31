// ============================================================
// VoteCapsule — Notification Delivery Entity
// Tracks per-channel delivery attempt for each notification.
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationChannel } from './notification-template.entity';

export enum DeliveryStatus {
  PENDING   = 'PENDING',
  SENT      = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED    = 'FAILED',
}

@Entity('notification_deliveries')
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @ManyToOne(() => Notification, (n) => n.deliveries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @Column({
    type: 'varchar',
    length: 20,
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 500, nullable: true })
  providerMessageId: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
