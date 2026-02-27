export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  fullName: string;
  role: 'mentee' | 'mentor';
  termsAccepted: boolean;
}

export interface LoginDto {
  login: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username?: string | null;
    fullName: string;
    role: string;
  };
}
