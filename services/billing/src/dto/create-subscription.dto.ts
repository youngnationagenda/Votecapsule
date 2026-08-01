import { IsUUID, IsIn, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  planId: string;

  @IsIn(['monthly', 'yearly', 'custom'])
  @IsOptional()
  billingCycle?: string = 'monthly';
}
