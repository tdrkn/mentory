import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class UploadRegaliaDto {
  @IsString()
  fileUrl: string;

  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(255)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(134217728)
  size: number;
}
