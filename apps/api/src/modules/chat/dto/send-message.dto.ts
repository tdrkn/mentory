import { IsString, IsOptional, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  mimeType: string;

  @IsString()
  url: string;

  @IsInt()
  size: number;
}

export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  contentType?: string; // text, file, image

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
