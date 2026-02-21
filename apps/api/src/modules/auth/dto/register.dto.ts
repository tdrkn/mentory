import { IsEmail, IsString, MinLength, IsIn, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/[^\w\s]/, {
    message: 'Password must contain at least one special character',
  })
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
