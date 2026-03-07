import { PartialType } from '@nestjs/mapped-types';
import { CreateMentorshipBookmarkDto } from './create-mentorship-bookmark.dto';

export class UpdateMentorshipBookmarkDto extends PartialType(CreateMentorshipBookmarkDto) {}
