import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add as member' })
  @IsUUID('4')
  userId!: string;

  @ApiProperty({ description: 'Role ID to assign to the member' })
  @IsUUID('4')
  roleId!: string;
}
