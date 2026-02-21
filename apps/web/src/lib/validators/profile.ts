import { z } from 'zod/v3';

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Укажите полное имя'),
  timezone: z.string().min(1, 'Укажите часовой пояс'),
  age: z
    .number({ invalid_type_error: 'Возраст должен быть числом' })
    .int('Возраст должен быть целым числом')
    .min(18, 'Возраст должен быть не меньше 18 лет')
    .max(120, 'Возраст должен быть не больше 120 лет')
    .nullable(),
  education: z.string().optional(),
  workplace: z.string().optional(),
  goals: z.array(z.string()).default([]),
  hobbies: z.array(z.string()).default([]),
  certificates: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  headline: z.string().optional(),
  bio: z.string().optional(),
  languages: z.string().optional(),
  background: z.string().optional(),
  interests: z.string().optional(),
});

export type ProfileForm = z.infer<typeof profileSchema>;
