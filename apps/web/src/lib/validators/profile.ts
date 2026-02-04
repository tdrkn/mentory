import { z } from 'zod/v3';

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Укажите полное имя'),
  timezone: z.string().min(1, 'Укажите часовой пояс'),
  headline: z.string().optional(),
  bio: z.string().optional(),
  languages: z.string().optional(),
  background: z.string().optional(),
  goals: z.string().optional(),
  interests: z.string().optional(),
});

export type ProfileForm = z.infer<typeof profileSchema>;
