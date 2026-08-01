import {
  IsString, IsUUID, IsOptional, IsInt, IsDateString,
  MaxLength, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAuditLogsDto {
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  action?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  resourceType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  serviceName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
