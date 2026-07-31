import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleLevel } from '@vote-capsule/types';

export class CreateRoleDto {
  @ApiProperty({ example: 'COUNTY_COORDINATOR' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'County Coordinator' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: RoleLevel })
  @IsEnum(RoleLevel)
  level!: RoleLevel;
}
