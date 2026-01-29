import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateMenteeProfileDto {
  @IsOptional()
  @IsString()
  background?: string;

  @IsOptional()
  @IsString()
  goals?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
}
