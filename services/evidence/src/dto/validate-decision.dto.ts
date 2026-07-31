// ============================================================
// VoteCapsule — Validate Decision DTO
// Posted by a Validator App agent when making a ruling on
// a submitted Evidence Capsule.
// ============================================================
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ValidationDecision {
  APPROVED  = 'APPROVED',
  REJECTED  = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

export class ValidateDecisionDto {
  @IsEnum(ValidationDecision)
  decision: ValidationDecision;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
