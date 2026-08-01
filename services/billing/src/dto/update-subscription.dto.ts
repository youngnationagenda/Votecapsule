import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsUUID()
  @IsOptional()
  planId?: string;

  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean;
}
