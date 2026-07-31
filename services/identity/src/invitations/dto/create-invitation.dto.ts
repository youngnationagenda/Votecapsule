import { IsEmail, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ example: 'newuser@organization.ke' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Tenant to invite user into' })
  @IsOptional()
  @IsUUID('4')
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Role to assign upon acceptance' })
  @IsOptional()
  @IsUUID('4')
  roleId?: string;
}
