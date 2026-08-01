import { IsUUID, IsNumber, IsIn, IsString, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @IsNumber()
  amount: number;

  @IsIn(['mpesa', 'card', 'bank_transfer', 'manual'])
  paymentMethod: string;

  @IsString()
  @IsOptional()
  providerTransactionId?: string;

  @IsString()
  @IsOptional()
  paymentProvider?: string;
}
