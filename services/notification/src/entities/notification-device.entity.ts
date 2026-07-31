// ============================================================
// VoteCapsule — Notification Device Entity
// FCM push token registry.
// Separate from Identity Service user_devices (device trust).
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';

export enum DevicePlatform {
  ANDROID = 'ANDROID',
  IOS     = 'IOS',
  WEB     = 'WEB',
}

@Entity('notification_devices')
@Unique(['userId', 'deviceToken'])
export class NotificationDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'device_token', type: 'varchar', length: 500 })
  deviceToken: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: DevicePlatform,
    default: DevicePlatform.ANDROID,
  })
  platform: DevicePlatform;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
