import { IsUUID } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsUUID()
  sessionId: string;
}
