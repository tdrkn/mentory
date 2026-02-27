import { z } from 'zod/v3';

export const loginSchema = z.object({
  login: z
    .string()
    .min(3, 'Введите логин или email')
    .max(80, 'Слишком длинный логин'),
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
    username: z
      .string()
      .min(3, 'Логин должен быть не короче 3 символов')
      .max(40, 'Логин должен быть не длиннее 40 символов')
      .regex(/^[a-zA-Z]+$/, 'Используйте только латинские буквы'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Повторите пароль'),
    role: z.enum(['mentor', 'mentee']),
    termsAccepted: z.boolean().default(false).refine((value) => value, {
      message: 'Нужно принять пользовательское соглашение',
    }),
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
