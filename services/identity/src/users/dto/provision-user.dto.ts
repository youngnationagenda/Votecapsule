import {
  IsEmail, IsString, IsOptional, MaxLength,
  IsArray, IsUUID, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProvisionUserDto {
  @ApiProperty({ example: 'agent@iebc.or.ke' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  /** Temporary password — must satisfy Cognito password policy */
  @ApiProperty({ example: 'AgentPass2027!' })
  @IsString()
  @MinLength(8)
  password!: string;

  /** e.g. ["CAPSULE_AGENT"] — stored as custom:roles in Cognito */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  /** IEBC tenant UUID */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
