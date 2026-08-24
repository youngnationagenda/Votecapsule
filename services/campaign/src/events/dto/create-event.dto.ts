import { IsString, IsUUID, IsOptional, IsEnum, IsDateString, IsNumber, IsBoolean, IsInt } from 'class-validator';
import { EventType } from '../entities/campaign-event.entity';

export class CreateEventDto {
  @IsString() eventName: string;
  @IsEnum(EventType) eventType: EventType;
  @IsOptional() @IsString() eventCategory?: string;
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
  @IsOptional() @IsString() venueName?: string;
  @IsOptional() @IsString() venueAddress?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsString() countyCode?: string;
  @IsOptional() @IsString() constituencyCode?: string;
  @IsOptional() @IsString() wardCode?: string;
  @IsOptional() @IsInt() expectedAttendance?: number;
  @IsOptional() @IsUUID() coordinatorId?: string;
  @IsOptional() @IsBoolean() requiresSecurity?: boolean;
  @IsOptional() @IsBoolean() requiresTransport?: boolean;
  @IsOptional() @IsBoolean() requiresPaSystem?: boolean;
  @IsOptional() @IsBoolean() requiresStage?: boolean;
  @IsOptional() @IsBoolean() requiresTents?: boolean;
  @IsOptional() @IsBoolean() requiresChairs?: boolean;
  @IsOptional() @IsBoolean() permitRequired?: boolean;
  @IsOptional() @IsString() permitNumber?: string;
  @IsOptional() @IsNumber() budgetEstimate?: number;
  @IsOptional() @IsString() notes?: string;
}
