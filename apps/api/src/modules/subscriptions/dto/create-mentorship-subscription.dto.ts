import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMentorshipSubscriptionDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  requestGoal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requestMotivation?: string;
}
