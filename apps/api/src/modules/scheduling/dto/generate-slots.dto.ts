import { IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class GenerateSlotsDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(180)
  slotDurationMin?: number;
}
