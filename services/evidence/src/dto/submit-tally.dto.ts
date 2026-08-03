// ============================================================
// VoteCapsule — Submit Tally DTO
// services/evidence/src/dto/submit-tally.dto.ts
//
// Data Transfer Object for Form A tally data submission
// from mobile agent app (TallyEntryScreen.tsx).
// ============================================================
import {
  IsString, IsNotEmpty, IsInt, Min, IsEnum,
  IsOptional, IsISO8601, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CandidateTallyEntryDto {
  /** Ballot order position (1-based) */
  @IsInt()
  @Min(1)
  ballotNumber: number;

  /** Full name as printed on ballot paper */
  @IsString()
  @IsNotEmpty()
  candidateName: string;

  /** Presidential running mate (FORM_34A only) */
  @IsOptional()
  @IsString()
  runningMateName?: string;

  /** Deputy Governor (FORM_37A only) */
  @IsOptional()
  @IsString()
  deputyName?: string;

  /** Party abbreviation — e.g. "UDA", "ODM", "IND" */
  @IsString()
  @IsNotEmpty()
  partyAbbreviation: string;

  /** Votes recorded for this candidate at the polling station */
  @IsInt()
  @Min(0)
  votes: number;
}

export class SubmitTallyDto {
  /**
   * IEBC Form A type — maps to election position:
   *   FORM_34A → Presidential
   *   FORM_35A → MP (National Assembly)
   *   FORM_36A → MCA (County Assembly)
   *   FORM_37A → Governor
   *   FORM_38A → Senator
   *   FORM_39A → Women Rep
   */
  @IsEnum(['FORM_34A', 'FORM_35A', 'FORM_36A', 'FORM_37A', 'FORM_38A', 'FORM_39A'])
  formType: string;

  /** Registered voters as shown on the Form A */
  @IsInt()
  @Min(0)
  registeredVoters: number;

  /** Total ballots issued at this polling station */
  @IsInt()
  @Min(0)
  ballotsIssued: number;

  /** Spoilt / defaced ballots */
  @IsInt()
  @Min(0)
  spoiltBallots: number;

  /**
   * Rejected ballots (not properly marked).
   * MUST satisfy: ballotsIssued = validVotes + rejectedBallots + spoiltBallots
   */
  @IsInt()
  @Min(0)
  rejectedBallots: number;

  /**
   * Valid votes counted.
   * MUST satisfy: validVotes = sum(candidates[].votes)
   */
  @IsInt()
  @Min(0)
  validVotes: number;

  /** Per-candidate tally rows (one entry per candidate on the ballot) */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateTallyEntryDto)
  candidates: CandidateTallyEntryDto[];

  /** Presiding Officer who signed the Form A */
  @IsString()
  @IsNotEmpty()
  presidingOfficerName: string;

  /** ISO 8601 UTC timestamp when results were declared at the station */
  @IsOptional()
  @IsISO8601()
  declaredAt?: string;
}
