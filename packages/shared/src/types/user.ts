export type UserRole = 'mentee' | 'mentor' | 'both' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  timezone: string;
  role: UserRole;
  createdAt: Date;
}

export interface MenteeProfile {
  userId: string;
  background: string;
  goals: string;
  interests: string[];
}
