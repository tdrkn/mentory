import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class EmailSettingsDto {
  @IsOptional()
  @IsBoolean()
  sessionReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  sessionBooked?: boolean;

  @IsOptional()
  @IsBoolean()
  sessionCanceled?: boolean;

  @IsOptional()
  @IsBoolean()
  newMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  newReview?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentReceived?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;
}

class PushSettingsDto {
  @IsOptional()
  @IsBoolean()
  sessionReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  sessionBooked?: boolean;

  @IsOptional()
  @IsBoolean()
  sessionCanceled?: boolean;

  @IsOptional()
  @IsBoolean()
  newMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  newReview?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentReceived?: boolean;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailSettingsDto)
  email?: EmailSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PushSettingsDto)
  push?: PushSettingsDto;
}
