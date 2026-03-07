import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MentorshipTaskStatus } from '@prisma/client';

export class UpdateMentorshipTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(MentorshipTaskStatus)
  status?: MentorshipTaskStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
