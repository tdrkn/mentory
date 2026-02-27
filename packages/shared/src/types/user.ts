export type UserRole = 'mentee' | 'mentor' | 'both' | 'admin';

export interface User {
  id: string;
  email: string;
  username?: string | null;
  fullName: string;
  timezone: string;
  role: UserRole;
  isBlocked?: boolean;
  isEmailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  createdAt: Date;
}

export interface MenteeProfile {
  userId: string;
  age?: number | null;
  education?: string | null;
  workplace?: string | null;
  background: string;
  goals: string[];
  hobbies: string[];
  certificates: string[];
  skills: string[];
  interests: string[];
}
