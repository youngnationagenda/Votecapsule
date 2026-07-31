import { IsEmail, IsString, MinLength, MaxLength, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Reset code received via email', example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ description: 'New password', minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}
