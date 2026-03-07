import { PartialType } from '@nestjs/mapped-types';
import { CreateMentorshipPlanDto } from './create-mentorship-plan.dto';

export class UpdateMentorshipPlanDto extends PartialType(CreateMentorshipPlanDto) {}
