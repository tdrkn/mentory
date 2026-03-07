import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMentorshipTaskDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  assigneeId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
