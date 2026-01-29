import { IsUUID } from 'class-validator';

export class HoldSlotDto {
  @IsUUID()
  slotId: string;

  @IsUUID()
  serviceId: string;
}
