import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateModerationActionDto {
  @IsString()
  @MaxLength(64)
  targetType: string;

  @IsUUID()
  targetId: string;

  @IsString()
  @MaxLength(64)
  action: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
