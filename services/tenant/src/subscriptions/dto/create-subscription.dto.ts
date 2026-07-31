import { IsEnum, IsOptional, IsDateString, IsInt, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '@vote-capsule/types';

export class CreateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @ApiPropertyOptional({ enum: ['monthly', 'annual', 'election'] })
  @IsOptional()
  billingCycle?: 'monthly' | 'annual' | 'election';

  @ApiProperty({ example: '2027-01-01T00:00:00Z' })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional({ example: '2027-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxElections?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;
}
