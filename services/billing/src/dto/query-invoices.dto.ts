import { IsUUID, IsString, IsDateString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class QueryInvoicesDto {
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsIn(['draft', 'issued', 'paid', 'partial', 'overdue', 'void', 'refunded'])
  @IsOptional()
  status?: string;

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
