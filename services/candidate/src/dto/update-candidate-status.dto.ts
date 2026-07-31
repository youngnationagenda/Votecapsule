// ============================================================
// VoteCapsule™ — Update Candidate Status DTO
// candidate-service/src/dto/update-candidate-status.dto.ts
// ============================================================
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { CandidateStatus } from '../entities/candidate.entity';

export class UpdateCandidateStatusDto {
  @IsEnum(CandidateStatus)
  status: CandidateStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsDateString()
  @IsOptional()
  withdrawalDate?: string;

  @IsString()
  @IsOptional()
  gazetteReference?: string;
}
