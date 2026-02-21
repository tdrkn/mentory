import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  @Matches(/[^\w\s]/, {
    message: 'Password must contain at least one special character',
  })
  newPassword: string;
}
