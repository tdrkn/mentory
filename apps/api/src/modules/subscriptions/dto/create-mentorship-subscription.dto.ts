import { IsOptional, IsString } from 'class-validator';

export class CreateMentorshipSubscriptionDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
