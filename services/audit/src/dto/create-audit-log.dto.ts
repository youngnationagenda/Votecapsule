import {
  IsString, IsUUID, IsOptional, IsEnum, IsObject, IsInt, IsIP,
  MaxLength, Min,
} from 'class-validator';
import { AuditLogStatus } from '../entities/audit-log.entity';

export class CreateAuditLogDto {
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @MaxLength(100)
  action: string;

  @IsString()
  @MaxLength(80)
  resourceType: string;

  @IsUUID()
  @IsOptional()
  resourceId?: string;

  @IsString()
  @MaxLength(50)
  serviceName: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  method?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  endpoint?: string;

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
  previousState?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  newState?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsEnum(AuditLogStatus)
  @IsOptional()
  status?: AuditLogStatus;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  errorCode?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  durationMs?: number;
}
