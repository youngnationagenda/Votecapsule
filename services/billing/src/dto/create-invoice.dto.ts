import { IsUUID, IsDateString, IsArray, ValidateNested, IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsString()
  description: string;

  @IsIn(['subscription', 'setup', 'overage', 'add_on', 'credit'])
  itemType: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsUUID()
  @IsOptional()
  planId?: string;

  @IsUUID()
  @IsOptional()
  licenseId?: string;
}

export class CreateInvoiceDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  @IsOptional()
  subscriptionId?: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
