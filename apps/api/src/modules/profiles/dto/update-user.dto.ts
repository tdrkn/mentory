import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatarFileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatarMimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20971520)
  avatarSize?: number;
}
