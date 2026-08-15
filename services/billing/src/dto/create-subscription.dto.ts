import { IsUUID, IsIn, IsOptional, IsNumber, IsString, IsBoolean, Min } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  tenantId: string;

  /** Either planId (UUID reference) or planCode (e.g., 'candidate', 'party') */
  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsString()
  planCode?: string;

  @IsIn(['one_time', 'monthly', 'yearly', 'custom'])
  @IsOptional()
  billingCycle?: string = 'one_time';

  /** Pricing model: per_station or lump_sum */
  @IsOptional()
  @IsIn(['per_station', 'lump_sum'])
  pricingType?: string;

  /** Custom total price set by Super Admin */
  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number;

  /** Price per polling station (when pricingType = per_station) */
  @IsOptional()
  @IsNumber()
  @Min(500)
  pricePerStation?: number;

  /** Number of polling stations covered */
  @IsOptional()
  @IsNumber()
  @Min(1)
  stationCount?: number;

  /** Lump sum amount (when pricingType = lump_sum) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  lumpSumAmount?: number;

  /** Admin notes about the agreement */
  @IsOptional()
  @IsString()
  notes?: string;

  /** Auto-generate an invoice immediately */
  @IsOptional()
  @IsBoolean()
  generateInvoice?: boolean = true;
}
