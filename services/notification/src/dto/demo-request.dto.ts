// ============================================================
// VoteCapsule — Demo Request DTO
// Used by the public landing page Request Centre form.
// POST /api/v1/notification/demo-request  (no auth required)
// ============================================================
import {
  IsString, IsEmail, IsOptional, IsBoolean,
  IsIn, MaxLength, MinLength, IsNotEmpty,
} from 'class-validator';

export class DemoRequestDto {
  // Step 1
  @IsIn(['demo', 'quote', 'trial', 'production'])
  requestType: 'demo' | 'quote' | 'trial' | 'production';

  @IsIn(['transparency', 'authority', 'both'])
  product: 'transparency' | 'authority' | 'both';

  // Step 2
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  organization?: string;

  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @IsIn(['email', 'phone'])
  preferredContact: 'email' | 'phone';

  @IsIn(['standard', 'urgent'])
  timing: 'standard' | 'urgent';

  // Step 3
  @IsIn(['candidate', 'party', 'commission', 'observer', 'media', 'other'])
  role: 'candidate' | 'party' | 'commission' | 'observer' | 'media' | 'other';

  @IsString()
  @IsOptional()
  @MaxLength(200)
  position?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  county?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  coverageNotes?: string;

  // Step 4
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  message?: string;

  @IsBoolean()
  privacyConsent: boolean;

  @IsBoolean()
  @IsOptional()
  contactConsent?: boolean;
}
