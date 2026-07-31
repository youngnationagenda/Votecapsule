import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({ description: 'New role ID' })
  @IsUUID('4')
  roleId!: string;
}
