import { IsUUID, IsString, IsIn, IsDateString, IsOptional } from 'class-validator';

export class CreateLicenseDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  @IsOptional()
  subscriptionId?: string;

  @IsIn(['election', 'feature', 'add_on'])
  licenseType: string;

  @IsUUID()
  @IsOptional()
  electionId?: string;

  @IsString()
  @IsOptional()
  featureCode?: string;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;
}
