export interface MentorProfile {
  userId: string;
  age?: number | null;
  education?: string | null;
  workplace?: string | null;
  goals: string[];
  hobbies: string[];
  certificates: string[];
  skills: string[];
  headline: string;
  bio: string;
  languages: string[];
  timezone: string;
  isActive: boolean;
  ratingAvg: number;
  ratingCount: number;
}

export interface MentorService {
  id: string;
  mentorId: string;
  title: string;
  durationMin: number;
  priceAmount: number;
  currency: string;
  isActive: boolean;
}

export interface Topic {
  id: string;
  name: string;
}
