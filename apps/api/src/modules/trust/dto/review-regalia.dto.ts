import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewRegaliaDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}
