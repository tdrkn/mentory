import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class CreatePaymentIntentDto {
  @ValidateIf((dto: CreatePaymentIntentDto) => !dto.subscriptionId)
  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @ValidateIf((dto: CreatePaymentIntentDto) => !dto.sessionId)
  @IsUUID()
  @IsOptional()
  subscriptionId?: string;
}
