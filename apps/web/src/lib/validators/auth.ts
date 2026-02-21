import { z } from 'zod/v3';

export const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export type LoginForm = z.infer<typeof loginSchema>;

const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .regex(/[^\w\s]/, 'Добавьте хотя бы один специальный символ');

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Укажите имя и фамилию'),
    email: z.string().email('Введите корректный email'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Повторите пароль'),
    role: z.enum(['mentor', 'mentee']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  });

export type RegisterForm = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Отсутствует токен восстановления'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Повторите пароль'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  });

export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
