import {
  IsString, IsUUID, IsOptional, IsInt, IsDateString, IsBoolean,
  MaxLength, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySecurityEventsDto {
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  eventType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  severity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  resolved?: boolean;

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
