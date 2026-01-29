export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  role: 'mentee' | 'mentor';
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}
