import {
  IsString, IsUUID, IsOptional, IsEnum, IsDateString,
  IsNumber, IsArray, IsIn, ValidateNested, IsObject,
} from 'class-validator';
import { CampaignStatus } from '../entities/campaign.entity';

// All valid IEBC election positions for 2027
export const VALID_POSITIONS = [
  'PRESIDENT',
  'GOVERNOR',
  'SENATOR',
  'WOMEN_REP',
  'COUNTY_WOMEN_REPRESENTATIVE',
  'MP',
  'MEMBER_OF_PARLIAMENT',
  'NATIONAL_ASSEMBLY',
  'MCA',
  'MEMBER_OF_COUNTY_ASSEMBLY',
  'WARD_REP',
  'PARTY',
  'PARTY_WIDE',
] as const;

export type ElectionPosition = typeof VALID_POSITIONS[number];

/**
 * Validation rules per position:
 *
 *  PRESIDENT          → no geography required (national scope)
 *  PARTY / PARTY_WIDE → no geography required (national scope)
 *  GOVERNOR           → countyCode required
 *  SENATOR            → countyCode required
 *  WOMEN_REP / COUNTY_WOMEN_REPRESENTATIVE → countyCode required
 *  MP / MEMBER_OF_PARLIAMENT → constituencyCode required
 *  MCA / WARD_REP     → wardCode required (countyCode + constituencyCode recommended)
 */
export class CreateCampaignDto {
  @IsOptional() @IsUUID()   tenantId?:    string;   // injected from header by controller
  @IsOptional() @IsUUID()   candidateId?: string;   // optional — party admin creates on behalf
  @IsUUID()                 electionId:   string;
  @IsOptional() @IsUUID()   partyId?:     string;

  @IsString()               name:         string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;

  @IsOptional() @IsDateString() campaignStartDate?: string;
  @IsOptional() @IsDateString() campaignEndDate?:   string;

  @IsOptional() @IsString()  headquarters?:    string;
  @IsOptional() @IsNumber()  headquartersLat?: number;
  @IsOptional() @IsNumber()  headquartersLng?: number;

  // ── Geography ────────────────────────────────────────────────
  // PRESIDENT / PARTY: leave all blank (national scope)
  // GOVERNOR / SENATOR / WOMEN_REP: set countyCode
  // MP: set constituencyCode (+ countyCode recommended)
  // MCA: set wardCode (+ constituencyCode + countyCode recommended)
  @IsOptional() @IsString()  countyCode?:       string;
  @IsOptional() @IsString()  constituencyCode?: string;
  @IsOptional() @IsString()  wardCode?:         string;
  @IsOptional() @IsArray()   targetWards?:      string[];

  // ── Goals / IEBC metadata ────────────────────────────────────
  // goals.targetPosition drives IEBC limit resolution.
  // Accepted values: PRESIDENT | GOVERNOR | SENATOR | WOMEN_REP | MP | MCA | PARTY
  //
  // The service will auto-turbulate the budget immediately after creation:
  //  • PRESIDENT → KES 6,112,543,133 (First Schedule, national scope)
  //  • PARTY     → KES 24,450,172,531 (Fifth Schedule, exact gazette amounts)
  //  • GOVERNOR / SENATOR / WOMEN_REP → per-county Second Schedule limit
  //  • MP        → per-constituency Third Schedule limit
  //  • MCA       → per-ward Fourth Schedule limit
  @IsOptional() goals?: Record<string, unknown>;
}
