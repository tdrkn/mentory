import { IsString, IsUUID } from 'class-validator';

export class DirectConversationDto {
  @IsString()
  @IsUUID()
  targetUserId: string;
}
