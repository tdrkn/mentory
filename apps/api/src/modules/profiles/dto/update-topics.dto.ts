import { IsArray, IsUUID } from 'class-validator';

export class UpdateTopicsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  topicIds: string[];
}
