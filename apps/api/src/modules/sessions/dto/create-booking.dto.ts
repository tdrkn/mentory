import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  slotId: string;

  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  requestGoal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requestMotivation?: string;
}
