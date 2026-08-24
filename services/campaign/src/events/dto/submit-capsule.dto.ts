import { IsNumber, IsOptional, IsInt, IsString } from 'class-validator';

export class SubmitCapsuleDto {
  @IsOptional() @IsNumber() submissionLat?: number;
  @IsOptional() @IsNumber() submissionLng?: number;
  @IsOptional() @IsInt() attendanceCount?: number;
  @IsOptional() @IsString() attendanceNotes?: string;
  @IsOptional() expenditureBreakdown?: Record<string, number>;
  @IsOptional() @IsNumber() totalExpenditure?: number;
  @IsOptional() materialsUsed?: unknown[];
  @IsOptional() photoMediaIds?: string[];
  @IsOptional() videoMediaIds?: string[];
  @IsOptional() @IsString() notes?: string;
}
