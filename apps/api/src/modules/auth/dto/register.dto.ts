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

  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z]+$/, {
    message: 'Username must contain only latin letters',
  })
  username: string;

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

  @IsBoolean()
  @Equals(true, {
    message: 'Необходимо принять пользовательское соглашение',
  })
  termsAccepted: boolean;
}
