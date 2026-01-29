import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CreateExceptionDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
