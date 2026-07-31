// ============================================================
// VoteCapsule — Review Anomaly DTO
// services/ai/src/dto/review-anomaly.dto.ts
// ============================================================
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewOutcome } from '../entities/ai-anomaly-event.entity';

export class ReviewAnomalyDto {
  @IsEnum(ReviewOutcome)
  outcome!: ReviewOutcome;

  @IsOptional()
  @IsString()
  notes?: string;
}
