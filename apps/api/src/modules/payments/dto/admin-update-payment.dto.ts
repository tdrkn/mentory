import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdatePaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
