import { IsString, MinLength } from 'class-validator';

export class RedeemCreditDto {
  @IsString()
  @MinLength(5)
  code: string;
}
