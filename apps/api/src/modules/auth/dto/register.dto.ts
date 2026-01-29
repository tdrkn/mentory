import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsIn(['mentee', 'mentor'])
  role: 'mentee' | 'mentor';

  @IsOptional()
  @IsString()
  timezone?: string;
}
