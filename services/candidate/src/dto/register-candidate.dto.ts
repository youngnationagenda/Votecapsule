// ============================================================
// VoteCapsule™ — Register Candidate DTO
// candidate-service/src/dto/register-candidate.dto.ts
//
// Used for POST /candidates/register
// All geography fields are NEC iebc_codes — never free text.
// ============================================================
import {
  IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID,
  IsDateString, IsEnum, IsInt, Min, Matches, Length,
} from 'class-validator';

export enum Gender {
  MALE   = 'MALE',
  FEMALE = 'FEMALE',
  OTHER  = 'OTHER',
}

export class RegisterCandidateDto {
  @IsUUID()
  electionId: string;

  @IsUUID()
  positionId: string;

  /** NULL if independent */
  @IsUUID()
  @IsOptional()
  partyId?: string;

  // ── Identity ────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsOptional()
  shortName?: string;

  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  // ── Classification ────────────────────────────────────────
  @IsBoolean()
  @IsOptional()
  isIndependent?: boolean;

  // ── Demographics (IEBC compliance) ────────────────────────
  /** Youth classification: age ≤35 — for IEBC youth-quota reporting */
  @IsBoolean()
  @IsOptional()
  isYouth?: boolean;

  /** Person Living With Disability — IEBC PLWD compliance reporting */
  @IsBoolean()
  @IsOptional()
  isPLWD?: boolean;

  // ── Running mate ──────────────────────────────────────────
  @IsString()
  @IsOptional()
  runningMateName?: string;

  @IsString()
  @IsOptional()
  runningMateNationalId?: string;

  // ── Geography — NEC iebc_codes only ─────────────────────
  /** 3-digit NEC iebc_code for county */
  @IsString()
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'countyCode must be a 3-digit NEC iebc_code' })
  countyCode?: string;

  /** 3-digit NEC iebc_code for constituency */
  @IsString()
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'constituencyCode must be a 3-digit NEC iebc_code' })
  constituencyCode?: string;

  /** 4-digit NEC iebc_code for ward (MCA only) */
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'wardCode must be a 4-digit NEC iebc_code' })
  wardCode?: string;

  // ── Documents ─────────────────────────────────────────────
  @IsString()
  @IsOptional()
  photographUrl?: string;

  @IsString()
  @IsOptional()
  symbolUrl?: string;

  @IsString()
  @IsOptional()
  nominationCertUrl?: string;

  @IsString()
  @IsOptional()
  nominationCertNumber?: string;

  @IsDateString()
  @IsOptional()
  nominationDate?: string;

  @IsString()
  @IsOptional()
  gazetteReference?: string;
}
