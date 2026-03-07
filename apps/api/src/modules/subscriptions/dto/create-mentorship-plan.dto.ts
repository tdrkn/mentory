import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { MentorshipPlanKind } from '@prisma/client';

export class CreateMentorshipPlanDto {
  @IsOptional()
  @IsString()
  mentorId?: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MentorshipPlanKind)
  kind?: MentorshipPlanKind;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceAmount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  billingIntervalMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  callsPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(180)
  sessionDurationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  responseTimeHours?: number;

  @IsOptional()
  @IsBoolean()
  includesUnlimitedChat?: boolean;
}
