import { z } from 'zod/v3';

export const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Укажите имя и фамилию'),
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  role: z.enum(['mentor', 'mentee']),
});

export type RegisterForm = z.infer<typeof registerSchema>;
