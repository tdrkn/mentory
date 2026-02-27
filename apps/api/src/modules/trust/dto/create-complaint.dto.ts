import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class ComplaintAttachmentDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(255)
  mimeType: string;

  @IsString()
  fileUrl: string;

  @IsInt()
  @Min(1)
  @Max(134217728)
  size: number;
}

const COMPLAINT_CATEGORIES = [
  'platform_issue',
  'user_behavior',
  'session_issue',
  'payment_issue',
  'content_violation',
  'other',
] as const;

export class CreateComplaintDto {
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsOptional()
  @IsUUID()
  targetSessionId?: string;

  @IsString()
  @IsIn(COMPLAINT_CATEGORIES)
  category: string;

  @IsString()
  @Matches(/^\d{2}\.\d{2}\.\d{4}$/)
  occurredOn: string;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ComplaintAttachmentDto)
  attachments?: ComplaintAttachmentDto[];
}
