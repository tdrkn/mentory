import { IsString, IsInt, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(15)
  @Max(180)
  durationMin: number;

  @IsNumber()
  @Min(0)
  priceAmount: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
