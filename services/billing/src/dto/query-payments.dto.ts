import { IsUUID, IsString, IsDateString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class QueryPaymentsDto {
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsIn(['pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'])
  @IsOptional()
  status?: string;

  @IsIn(['mpesa', 'card', 'bank_transfer', 'manual'])
  @IsOptional()
  paymentMethod?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}
