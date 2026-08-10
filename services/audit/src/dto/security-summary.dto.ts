import { IsDateString, IsOptional } from 'class-validator';

export class SecuritySummaryQueryDto {
  /** ISO timestamp — how far back to look. Defaults to 24 hours ago. */
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
