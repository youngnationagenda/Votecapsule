import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaVerifyDto {
  @ApiProperty({ example: 'admin@votecapsule.co.ke' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @Length(6, 6)
  mfaCode!: string;

  @ApiProperty({ description: 'Session token returned from login MFA challenge' })
  @IsString()
  session!: string;
}
