import { IsInt, IsString, Min, Length } from 'class-validator';

export class CreatePlatformWithdrawalDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  @Length(3, 3)
  currency: string;

  @IsString()
  provider: string;
}
