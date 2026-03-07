import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateMentorshipBookmarkDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUrl({ require_protocol: true })
  url: string;
}
