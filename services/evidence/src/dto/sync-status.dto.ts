// ============================================================
// VoteCapsule — Sync Status DTO
// Posted by mobile app to update sync state of a capsule
// as it progresses through the offline→online pipeline.
// ============================================================
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SyncStatus } from '../entities/evidence-capsule.entity';

export class SyncStatusDto {
  @IsEnum(SyncStatus)
  syncStatus: SyncStatus;

  @IsOptional()
  @IsString()
  error?: string;
}
