import {
  IsString, IsUUID, IsOptional, IsObject, IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateComplianceReportDto {
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @MaxLength(50)
  reportType: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsObject()
  reportData: Record<string, unknown>;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
