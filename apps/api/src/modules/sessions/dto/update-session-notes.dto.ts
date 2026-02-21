import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateSessionNotesDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  privateNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  sharedSummary?: string;
}
