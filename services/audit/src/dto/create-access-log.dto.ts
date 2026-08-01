import {
  IsString, IsUUID, IsOptional, IsInt, IsIP,
  MaxLength, Min,
} from 'class-validator';

export class CreateAccessLogDto {
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @MaxLength(50)
  serviceName: string;

  @IsString()
  @MaxLength(255)
  endpoint: string;

  @IsString()
  @MaxLength(10)
  method: string;

  @IsInt()
  @Min(100)
  statusCode: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  responseTimeMs?: number;

  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @IsUUID()
  @IsOptional()
  deviceId?: string;
}
