// ============================================================
// VoteCapsule — Form B Submit DTO
// services/evidence/src/reconciliation/dto/form-b-submit.dto.ts
//
// Data Transfer Object for Returning Officers submitting Form B
// collation results at Constituency Tallying Centres.
// ============================================================
import {
  IsString, IsNotEmpty, IsInt, Min, Max, IsEnum,
  IsOptional, IsUUID, IsArray, ValidateNested, Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FormBCandidateDto {
  /** Ballot order position (1-based) */
  @IsInt()
  @Min(1)
  ballotNumber: number;

  /** Full name as printed on ballot paper */
  @IsString()
  @IsNotEmpty()
  candidateName: string;

  /** Presidential running mate (34B only) */
  @IsOptional()
  @IsString()
  runningMateName?: string;

  /** Deputy Governor (37B only) */
  @IsOptional()
  @IsString()
  deputyName?: string;

  /** Party abbreviation — e.g. "UDA", "ODM", "IND" */
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  partyAbbreviation: string;

  /** Total collated votes for this candidate in the constituency */
  @IsInt()
  @Min(0)
  votes: number;
}

export enum PositionCodeEnum {
  PRESIDENT  = 'PRESIDENT',
  MP         = 'MP',
  MCA        = 'MCA',
  GOVERNOR   = 'GOVERNOR',
  SENATOR    = 'SENATOR',
  WOMEN_REP  = 'WOMEN_REP',
}

export enum FormTypeBEnum {
  FORM_34B = 'FORM_34B',   // Presidential — Constituency Tally
  FORM_35B = 'FORM_35B',   // MP — Constituency Declaration
  FORM_36B = 'FORM_36B',   // MCA — Ward/Constituency Tally
  FORM_37B = 'FORM_37B',   // Governor — Constituency Tally
  FORM_38B = 'FORM_38B',   // Senator — Constituency Tally
  FORM_39B = 'FORM_39B',   // Women Rep — Constituency Tally
}

export class FormBSubmitDto {
  /** Multi-tenant isolation — supplied from JWT claim */
  @IsUUID()
  tenantId: string;

  /** UUID of the election record */
  @IsUUID()
  electionId: string;

  /** Election year — e.g. 2027 */
  @IsInt()
  @Min(2017)
  @Max(2050)
  electionYear: number;

  /** IEBC position being tallied */
  @IsEnum(PositionCodeEnum)
  positionCode: PositionCodeEnum;

  /** IEBC Form type — must match position */
  @IsEnum(FormTypeBEnum)
  formType: FormTypeBEnum;

  /** 3-digit IEBC county code */
  @IsString()
  @Length(3, 3)
  countyCode: string;

  /** 3-digit IEBC constituency code (NULL for national-scope positions) */
  @IsOptional()
  @IsString()
  @Length(3, 3)
  constituencyCode?: string;

  /** 4-digit IEBC ward code (MCA only — Form 36B) */
  @IsOptional()
  @IsString()
  @Length(4, 4)
  wardCode?: string;

  /** Total polling stations within the collation scope */
  @IsInt()
  @Min(0)
  totalStations: number;

  /** Number of Form As received and verified so far */
  @IsInt()
  @Min(0)
  stationsReported: number;

  /** Registered voters in this constituency/ward */
  @IsInt()
  @Min(0)
  registeredVoters: number;

  /** Total ballots issued */
  @IsInt()
  @Min(0)
  ballotsIssued: number;

  /** Spoilt / defaced ballots */
  @IsInt()
  @Min(0)
  spoiltBallots: number;

  /** Rejected ballots (not properly marked) */
  @IsInt()
  @Min(0)
  rejectedBallots: number;

  /**
   * Valid votes counted.
   * MUST satisfy: ballotsIssued = validVotes + rejectedBallots + spoiltBallots
   * MUST satisfy: validVotes = sum(candidates[].votes)
   */
  @IsInt()
  @Min(0)
  validVotes: number;

  /** Per-candidate results (one entry per candidate on the ballot) */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormBCandidateDto)
  candidates: FormBCandidateDto[];

  /** Returning Officer who signed this Form B */
  @IsString()
  @IsNotEmpty()
  returningOfficerName: string;

  /** UUID of the Returning Officer in Identity Service (optional) */
  @IsOptional()
  @IsUUID()
  returningOfficerId?: string;
}
