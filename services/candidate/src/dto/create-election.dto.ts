// ============================================================
// VoteCapsule™ — Create Election DTO
// candidate-service/src/dto/create-election.dto.ts
// ============================================================
import {
  IsString, IsNotEmpty, IsEnum, IsInt, IsOptional,
  IsDateString, IsBoolean, Min, Max,
} from 'class-validator';
import { ElectionType } from '../entities/election.entity';

export class CreateElectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ElectionType)
  @IsOptional()
  electionType?: ElectionType = ElectionType.GENERAL;

  @IsInt()
  @Min(2000)
  @Max(2100)
  electionYear: number;

  @IsDateString()
  @IsOptional()
  electionDate?: string;

  @IsDateString()
  @IsOptional()
  nominationDeadline?: string;

  @IsDateString()
  @IsOptional()
  campaignStartDate?: string;

  @IsDateString()
  @IsOptional()
  campaignEndDate?: string;

  @IsString()
  @IsOptional()
  gazetteReference?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  necElectionYear?: number;
}
