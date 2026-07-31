import { IsString, IsEnum, IsOptional, MaxLength, IsEmail, IsHexColor, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantType } from '@vote-capsule/types';

export class CreateTenantDto {
  @ApiProperty({ example: 'Independent Electoral and Boundaries Commission' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'iebc', description: 'URL-friendly slug (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiProperty({ enum: TenantType })
  @IsEnum(TenantType)
  type!: TenantType;

  @ApiPropertyOptional({ example: 'KE', default: 'KE' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'contact@iebc.or.ke' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+254200000000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Organization accent color (hex) — used only within org portal', example: '#1E40AF' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Additional settings as key-value object' })
  @IsOptional()
  settings?: Record<string, unknown>;
}
