// ============================================================
// VoteCapsule — Send Notification DTO
// ============================================================
import {
  IsEnum, IsUUID, IsString, IsOptional,
  IsObject, IsNotEmpty, MaxLength,
} from 'class-validator';
import { NotificationChannel, NotificationType } from '../entities/notification-template.entity';

export class SendNotificationDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  /** If not provided, the service resolves it from notification_templates */
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  /** Variables to substitute into the template, e.g. { stationCode: '001001000100101' } */
  @IsObject()
  @IsOptional()
  templateVars?: Record<string, string>;

  /** Extra data payload passed to FCM (must be string values) */
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  referenceType?: string;
}

export class BulkNotificationDto {
  /** List of userIds to notify */
  @IsUUID(undefined, { each: true })
  userIds: string[];

  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsObject()
  @IsOptional()
  templateVars?: Record<string, string>;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  referenceType?: string;
}
