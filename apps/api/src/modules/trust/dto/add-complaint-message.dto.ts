import { IsString, MaxLength } from 'class-validator';

export class AddComplaintMessageDto {
  @IsString()
  @MaxLength(2000)
  body: string;
}
