// ============================================================
// VoteCapsule — Register Device DTO (FCM token registration)
// ============================================================
import { IsEnum, IsUUID, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { DevicePlatform } from '../entities/notification-device.entity';

export class RegisterDeviceDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  deviceToken: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}

export class MarkReadDto {
  /** List of notification IDs to mark as read */
  @IsUUID(undefined, { each: true })
  notificationIds: string[];
}
