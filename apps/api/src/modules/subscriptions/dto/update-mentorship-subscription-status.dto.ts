import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MentorshipSubscriptionStatus } from '@prisma/client';

export class UpdateMentorshipSubscriptionStatusDto {
  @IsEnum(MentorshipSubscriptionStatus)
  status: MentorshipSubscriptionStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
