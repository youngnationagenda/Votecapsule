import { IsArray, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({ description: 'Array of permission UUIDs to assign', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];

  @ApiPropertyOptional({
    description: 'If true, replaces all existing permissions. If false (default), appends.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}
