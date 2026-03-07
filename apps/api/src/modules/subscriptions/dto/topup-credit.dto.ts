import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TopupCreditDto {
  @IsInt()
  @Min(100)
  @Max(500000)
  amountCents: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  expiresInDays?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
