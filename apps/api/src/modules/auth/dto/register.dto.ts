import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username may contain latin letters, numbers and underscores',
  })
  username?: string;

  @IsString()
  @MinLength(8)
  @Matches(/[^\w\s]/, {
    message: 'Password must contain at least one special character',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsIn(['mentee', 'mentor'])
  role: 'mentee' | 'mentor';

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsBoolean()
  @Equals(true, {
    message: 'Необходимо принять пользовательское соглашение',
  })
  termsAccepted: boolean;
}
