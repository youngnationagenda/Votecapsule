import { IsUUID, IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class RecordUsageDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  @IsOptional()
  subscriptionId?: string;

  @IsString()
  metric: string;

  @IsNumber()
  quantity: number;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsUUID()
  @IsOptional()
  electionId?: string;
}
