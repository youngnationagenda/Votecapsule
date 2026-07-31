// ============================================================
// VoteCapsule™ — Compute Snapshot DTO
// reporting-service/src/dto/compute-snapshot.dto.ts
// ============================================================
import {
  IsEnum, IsInt, IsOptional, IsString, Min, Max,
} from 'class-validator';
import { ScopeLevel } from '../entities/result-snapshot.entity';

export class ComputeSnapshotDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  electionYear: number;

  /** PRESIDENT | GOVERNOR | SENATOR | WOMEN_REP | MP | MCA — or ALL for all positions */
  @IsString()
  positionCode: string;

  /** Geographic scope to compute. Omit for NATIONAL (computes all levels). */
  @IsEnum(ScopeLevel)
  @IsOptional()
  scopeLevel?: ScopeLevel;

  /** NEC county iebc_code — required if scopeLevel is COUNTY or below */
  @IsString()
  @IsOptional()
  countyCode?: string;

  /** NEC constituency iebc_code — required if scopeLevel is CONSTITUENCY or below */
  @IsString()
  @IsOptional()
  constituencyCode?: string;

  /** NEC ward iebc_code — required if scopeLevel is WARD or STATION */
  @IsString()
  @IsOptional()
  wardCode?: string;
}
