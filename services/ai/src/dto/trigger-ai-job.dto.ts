// ============================================================
// VoteCapsule — Trigger AI Job DTO
// services/ai/src/dto/trigger-ai-job.dto.ts
// ============================================================
import {
  IsUUID, IsString, IsInt, Min, Max, IsNotEmpty, Matches,
} from 'class-validator';

export class TriggerAiJobDto {
  @IsUUID()
  capsuleId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{15}$/, { message: 'iebcStationCode must be exactly 15 digits' })
  iebcStationCode!: string;

  @IsString()
  @IsNotEmpty()
  positionCode!: string;

  @IsInt()
  @Min(2017)
  @Max(2050)
  electionYear!: number;

  @IsString()
  @Matches(/^\d{3}$/, { message: 'countyCode must be exactly 3 digits' })
  countyCode!: string;

  @IsString()
  @IsNotEmpty()
  s3Bucket!: string;

  @IsString()
  @IsNotEmpty()
  s3Key!: string;
}
