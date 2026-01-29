import { IsString, IsOptional } from 'class-validator';

export class UpdateSessionNotesDto {
  @IsOptional()
  @IsString()
  privateNotes?: string;

  @IsOptional()
  @IsString()
  sharedSummary?: string;
}
