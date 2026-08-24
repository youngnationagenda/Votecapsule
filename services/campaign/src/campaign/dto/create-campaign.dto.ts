import { IsString, IsUUID, IsOptional, IsEnum, IsDateString, IsNumber, IsArray } from 'class-validator';
import { CampaignStatus } from '../entities/campaign.entity';

export class CreateCampaignDto {
  @IsUUID() candidateId: string;
  @IsUUID() electionId: string;
  @IsOptional() @IsUUID() partyId?: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;
  @IsOptional() @IsDateString() campaignStartDate?: string;
  @IsOptional() @IsDateString() campaignEndDate?: string;
  @IsOptional() @IsString() headquarters?: string;
  @IsOptional() @IsNumber() headquartersLat?: number;
  @IsOptional() @IsNumber() headquartersLng?: number;
  @IsOptional() @IsString() countyCode?: string;
  @IsOptional() @IsString() constituencyCode?: string;
  @IsOptional() @IsString() wardCode?: string;
  @IsOptional() @IsArray() targetWards?: string[];
  @IsOptional() goals?: Record<string, unknown>;
}
