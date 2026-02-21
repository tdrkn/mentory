import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestPayoutDto {
  @IsIn(['card', 'korona_pay', 'cbr'])
  method: 'card' | 'korona_pay' | 'cbr';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  destinationToken?: string;
}
