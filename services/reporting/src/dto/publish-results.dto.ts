// ============================================================
// VoteCapsule™ — Publish Results DTO
// reporting-service/src/dto/publish-results.dto.ts
//
// AI ASSISTS, HUMANS DECIDE.
// Only a human Election Authority official may publish results.
// ============================================================
import {
  IsUUID, IsString, IsOptional, IsBoolean,
} from 'class-validator';

export class PublishResultsDto {
  @IsUUID()
  snapshotId: string;

  /** Optional gazette notice number for legal reference */
  @IsString()
  @IsOptional()
  gazetteReference?: string;

  /** Official notes for publication record */
  @IsString()
  @IsOptional()
  notes?: string;

  /**
   * TRUE = visible to unauthenticated public portal.
   * FALSE = visible only to authenticated Election Authority users.
   * Default: FALSE — must be explicitly set to TRUE for public release.
   */
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
