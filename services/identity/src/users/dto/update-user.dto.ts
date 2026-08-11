import { IsOptional, IsEnum, IsArray, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@vote-capsule/types';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  /** Replace all roles for this user */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  /** Move user to a different tenant */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
