import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateComplaintDto {
  @IsOptional()
  @IsUUID()
  assignedAdminId?: string;

  @IsOptional()
  @IsIn(['new', 'in_progress', 'resolved', 'rejected'])
  status?: 'new' | 'in_progress' | 'resolved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionComment?: string;
}
