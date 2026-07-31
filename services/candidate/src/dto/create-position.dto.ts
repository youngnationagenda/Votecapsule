// ============================================================
// VoteCapsule™ — Create Election Position DTO
// candidate-service/src/dto/create-position.dto.ts
// ============================================================
import {
  IsString, IsNotEmpty, IsEnum, IsOptional,
  IsBoolean, IsInt, Min, Matches,
} from 'class-validator';
import { GeographicLevel } from '../entities/election-position.entity';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  positionCode: string;

  @IsString()
  @IsNotEmpty()
  positionName: string;

  @IsEnum(GeographicLevel)
  geographicLevel: GeographicLevel;

  /** NEC iebc_code — 3-char county code */
  @IsString()
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'countyCode must be a 3-digit NEC iebc_code' })
  countyCode?: string;

  /** NEC iebc_code — 3-char constituency code */
  @IsString()
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'constituencyCode must be a 3-digit NEC iebc_code' })
  constituencyCode?: string;

  /** NEC iebc_code — 4-char ward code */
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'wardCode must be a 4-digit NEC iebc_code' })
  wardCode?: string;

  @IsString()
  @IsOptional()
  iebcFormNumber?: string;

  @IsInt()
  @IsOptional()
  maxCandidates?: number;

  @IsBoolean()
  @IsOptional()
  isRunningMateRequired?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  seatsAvailable?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
