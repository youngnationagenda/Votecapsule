import {
  IsString, IsUUID, IsOptional, IsEnum, IsObject, IsInt, IsIP,
  MaxLength, Min,
} from 'class-validator';
import { SecuritySeverity, SecurityCategory } from '../entities/security-event.entity';

export class CreateSecurityEventDto {
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @MaxLength(80)
  eventType: string;

  @IsEnum(SecuritySeverity)
  @IsOptional()
  severity?: SecuritySeverity;

  @IsEnum(SecurityCategory)
  category: SecurityCategory;

  @IsString()
  description: string;

  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsUUID()
  @IsOptional()
  deviceId?: string;

  @IsObject()
  @IsOptional()
  geoLocation?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  authMethod?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  loginAttemptCount?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
