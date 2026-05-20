import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateSessionVideoLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  videoLink?: string | null;
}
