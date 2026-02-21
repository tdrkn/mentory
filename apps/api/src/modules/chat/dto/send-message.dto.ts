import { IsString, IsOptional, IsArray, ValidateNested, IsInt, MaxLength, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  mimeType: string;

  @IsString()
  url: string;

  @IsInt()
  @Min(1)
  @Max(134217728) // 128 MB
  size: number;
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @IsOptional()
  @IsString()
  @IsIn(['text', 'file', 'image', 'emoji'])
  contentType?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
