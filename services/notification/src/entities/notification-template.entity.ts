// ============================================================
// VoteCapsule — Notification Template Entity
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum NotificationChannel {
  PUSH   = 'PUSH',
  EMAIL  = 'EMAIL',
  SMS    = 'SMS',
  IN_APP = 'IN_APP',
}

export enum NotificationType {
  ESCALATION_CREATED  = 'ESCALATION_CREATED',
  VALIDATION_REQUIRED = 'VALIDATION_REQUIRED',
  CAPSULE_APPROVED    = 'CAPSULE_APPROVED',
  CAPSULE_REJECTED    = 'CAPSULE_REJECTED',
  AI_REVIEW_COMPLETED = 'AI_REVIEW_COMPLETED',
  WORKFLOW_FAILED     = 'WORKFLOW_FAILED',
  RESULTS_PUBLISHED   = 'RESULTS_PUBLISHED',
  SECURITY_ALERT      = 'SECURITY_ALERT',
  ASSIGNMENT_RECEIVED = 'ASSIGNMENT_RECEIVED',
}

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ name: 'notification_type', type: 'varchar', length: 50 })
  notificationType: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({ name: 'subject_template', type: 'varchar', length: 500, nullable: true })
  subjectTemplate: string | null;

  @Column({ name: 'body_template', type: 'text' })
  bodyTemplate: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
