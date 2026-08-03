// ============================================================
// VoteCapsule™ — Form C Submit DTO
// ============================================================
import { IsString, IsUUID, IsOptional, IsEnum, IsInt,
         IsNumber, IsArray, ValidateNested, IsNotEmpty,
         Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class FormCCandidateDto {
  @IsInt() @Min(1)
  ballotNumber: number;

  @IsString() @IsNotEmpty()
  candidateName: string;

  @IsString() @IsOptional()
  runningMateName?: string;   // Presidential 34C

  @IsString() @IsOptional()
  deputyName?: string;        // Governor 37C

  @IsString() @IsNotEmpty()
  partyAbbreviation: string;

  @IsInt() @Min(0)
  votes: number;
}

export class FormCSubmitDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  electionId: string;

  @IsInt() @Min(2020) @Max(2050)
  electionYear: number;

  @IsEnum(['PRESIDENT','GOVERNOR','SENATOR','WOMEN_REP','MP','MCA'])
  positionCode: string;

  @IsEnum(['FORM_34C','FORM_37C','FORM_38C','FORM_39C'])
  formType: string;

  @IsString() @Length(3,3) @IsOptional()
  countyCode?: string;  // NULL for presidential 34C (national)

  @IsInt() @IsOptional() @Min(0)
  totalFormBs?: number;

  @IsInt() @Min(0)
  registeredVoters: number;

  @IsInt() @Min(0)
  ballotsIssued: number;

  @IsInt() @Min(0)
  validVotes: number;

  @IsInt() @Min(0)
  rejectedBallots: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormCCandidateDto)
  candidates: FormCCandidateDto[];

  @IsString() @IsNotEmpty()
  declaringOfficerName: string;

  @IsUUID() @IsOptional()
  declaringOfficerId?: string;

  @IsString() @IsOptional()
  gazetteReference?: string;
}
