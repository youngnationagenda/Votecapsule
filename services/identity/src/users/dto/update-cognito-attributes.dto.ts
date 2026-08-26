/**
 * Vote Capsule™ Identity Service
 * DTO for PATCH /users/:id/attributes — syncs campaign role claims to Cognito.
 * Called by the Campaign Service after assignRole() so the JWT authorizer
 * immediately forwards the correct x-user-role / x-ward-code headers.
 */

import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCognitoAttributesDto {
  @ApiPropertyOptional({
    description: 'Campaign role to set in custom:roles (e.g. CAMPAIGN_MANAGER, WARD_REP, FINANCE_OFFICER)',
    example: 'CAMPAIGN_MANAGER',
  })
  @IsString()
  @IsOptional()
  'custom:roles'?: string;

  @ApiPropertyOptional({
    description: 'Ward code for geo-scoped roles (WARD_COORDINATOR, WARD_REP)',
    example: '0101',
  })
  @IsString()
  @IsOptional()
  'custom:wardCode'?: string;

  @ApiPropertyOptional({
    description: 'Constituency code for constituency-scoped roles',
    example: '001',
  })
  @IsString()
  @IsOptional()
  'custom:constituencyCode'?: string;

  @ApiPropertyOptional({
    description: 'Candidate ID this team member is working for',
    example: 'uuid-of-candidate',
  })
  @IsString()
  @IsOptional()
  'custom:candidateId'?: string;

  @ApiPropertyOptional({
    description: 'Tenant ID override',
    example: 'uuid-of-tenant',
  })
  @IsString()
  @IsOptional()
  'custom:tenantId'?: string;
}
