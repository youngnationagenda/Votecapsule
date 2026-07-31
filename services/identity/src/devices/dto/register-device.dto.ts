import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '@vote-capsule/types';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Unique device fingerprint (SHA-256 of device identifiers)' })
  @IsString()
  @MaxLength(255)
  deviceFingerprint!: string;

  @ApiPropertyOptional({ example: 'John\'s iPhone 14' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;

  @ApiPropertyOptional({ enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({ example: 'Android 14' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  osVersion?: string;

  @ApiPropertyOptional({ example: '2.1.0' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;
}
