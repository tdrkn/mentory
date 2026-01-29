import { IsString, IsOptional } from 'class-validator';

export class CreatePayoutAccountDto {
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  refreshUrl?: string;
}
