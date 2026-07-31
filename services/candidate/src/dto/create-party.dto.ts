// ============================================================
// VoteCapsule™ — Create Political Party DTO
// candidate-service/src/dto/create-party.dto.ts
// ============================================================
import {
  IsString, IsNotEmpty, IsOptional, IsDateString, Matches, Length,
} from 'class-validator';

export class CreatePartyDto {
  /** IEBC-registered party code — e.g. "ODM", "UDA" */
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  partyCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  abbreviation: string;

  /** Hex colour code for display — e.g. "#FF6600" */
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'partyColor must be a valid hex colour e.g. #FF6600' })
  partyColor?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @IsDateString()
  @IsOptional()
  registrationDate?: string;

  @IsString()
  @IsOptional()
  chairpersonName?: string;

  @IsString()
  @IsOptional()
  headquarters?: string;

  @IsString()
  @IsOptional()
  gazetteReference?: string;

  /** ISO 3166-1 alpha-3 country code — defaults to KEN */
  @IsString()
  @IsOptional()
  @Length(3, 3)
  countryCode?: string;
}
