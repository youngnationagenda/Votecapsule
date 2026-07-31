// ============================================================
// VoteCapsule™ — Export Request DTO
// reporting-service/src/dto/export-request.dto.ts
// ============================================================
import {
  IsEnum, IsInt, IsOptional, IsString, Min, Max,
} from 'class-validator';
import { ExportFormat } from '../entities/export-log.entity';
import { ScopeLevel }   from '../entities/result-snapshot.entity';

export class ExportRequestDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsInt()
  @Min(2000)
  @Max(2100)
  electionYear: number;

  @IsString()
  positionCode: string;

  @IsEnum(ScopeLevel)
  @IsOptional()
  scopeLevel?: ScopeLevel;

  @IsString()
  @IsOptional()
  countyCode?: string;

  @IsString()
  @IsOptional()
  constituencyCode?: string;

  @IsString()
  @IsOptional()
  wardCode?: string;

  /**
   * If true, only include PUBLISHED snapshots (for public exports).
   * If false, include DRAFT + VERIFIED + PUBLISHED (for internal use).
   * Default: false
   */
  @IsOptional()
  publishedOnly?: boolean;
}
