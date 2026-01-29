import { IsUUID, IsString, IsOptional } from 'class-validator';

export class ConfirmSessionDto {
  @IsUUID()
  sessionId: string;

  @IsOptional()
  @IsString()
  paymentIntentId?: string;
}
