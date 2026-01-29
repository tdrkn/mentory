import { IsInt, IsString, Min, Max, Matches } from 'class-validator';

export class CreateAvailabilityRuleDto {
  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number; // 1 = Monday, 7 = Sunday

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string; // HH:MM

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime: string; // HH:MM

  @IsString()
  timezone?: string;
}
