import { IsString, IsUUID, IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator';
import { CampaignStatus } from '../entities/campaign.entity';

export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() campaignStartDate?: string;
  @IsOptional() campaignEndDate?: string;
  @IsOptional() @IsString() headquarters?: string;
  @IsOptional() @IsNumber() headquartersLat?: number;
  @IsOptional() @IsNumber() headquartersLng?: number;
  @IsOptional() @IsString() countyCode?: string;
  @IsOptional() @IsString() constituencyCode?: string;
  @IsOptional() @IsString() wardCode?: string;
  @IsOptional() @IsArray() targetWards?: string[];
  @IsOptional() goals?: Record<string, unknown>;
}
