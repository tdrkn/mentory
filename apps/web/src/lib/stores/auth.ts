import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { api, ApiError } from '$lib/api';
import type { User } from '@mentory/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
};

const authStore = writable<AuthState>(initialState);

export const user = derived(authStore, ($state) => $state.user);
export const isLoading = derived(authStore, ($state) => $state.isLoading);
export const error = derived(authStore, ($state) => $state.error);
export const isAuthenticated = derived(authStore, ($state) => !!$state.user);
export const isMentor = derived(authStore, ($state) => $state.user?.role === 'mentor' || $state.user?.role === 'both');
export const isAdmin = derived(authStore, ($state) => $state.user?.role === 'admin');

function setState(patch: Partial<AuthState>) {
  authStore.update((state) => ({ ...state, ...patch }));
}

export async function initAuth() {
  if (!browser) return;
  const token = localStorage.getItem('accessToken');
  if (!token) {
    setState({ isLoading: false, user: null });
    return;
  }

  try {
    const me = await api.get<User>('/auth/me');
    setState({ user: me, isLoading: false, error: null });
  } catch {
    localStorage.removeItem('accessToken');
    setState({ user: null, isLoading: false });
  }
}

export async function login(login: string, password: string) {
  setState({ error: null, isLoading: true });
  try {
    const response = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      login,
      password,
    });
    localStorage.setItem('accessToken', response.accessToken);
    setState({ user: response.user, isLoading: false, error: null });
    return response.user;
  } catch (err) {
    if (err instanceof ApiError) {
      setState({ error: err.data?.message || 'Неверный логин или пароль', isLoading: false });
    } else {
      setState({ error: 'Ошибка подключения к серверу', isLoading: false });
    }
    throw err;
  }
}

export async function register(
  email: string,
  username: string,
  password: string,
  fullName: string,
  role: 'mentor' | 'mentee',
  termsAccepted: boolean,
) {
  setState({ error: null, isLoading: true });
  try {
    const response = await api.post<{ accessToken?: string; user: User; requiresEmailVerification?: boolean }>(
      '/auth/register',
      {
        email,
        username,
        password,
        fullName,
        role,
        termsAccepted,
      },
    );

    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken);
      setState({ user: response.user, isLoading: false, error: null });
      return { user: response.user, requiresEmailVerification: false };
    }

    if (browser) {
      localStorage.removeItem('accessToken');
    }
    setState({ user: null, isLoading: false, error: null });
    return { user: response.user, requiresEmailVerification: !!response.requiresEmailVerification };
  } catch (err) {
    if (err instanceof ApiError) {
      setState({ error: err.data?.message || 'Ошибка регистрации', isLoading: false });
    } else {
      setState({ error: 'Ошибка подключения к серверу', isLoading: false });
    }
    throw err;
  }
}

export async function forgotPassword(email: string) {
  try {
    await api.post('/auth/forgot-password', { email });
    return true;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.data?.message || 'Не удалось отправить письмо для восстановления');
    }
    throw new Error('Ошибка подключения к серверу');
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    await api.post('/auth/reset-password', { token, newPassword });
    return true;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.data?.message || 'Не удалось обновить пароль');
    }
    throw new Error('Ошибка подключения к серверу');
  }
}

export async function verifyEmail(token: string) {
  try {
    const response = await api.post<{ success: boolean; alreadyVerified?: boolean }>('/auth/verify-email', { token });
    return response;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.data?.message || 'Не удалось подтвердить email');
    }
    throw new Error('Ошибка подключения к серверу');
  }
}

export async function resendVerificationEmail(email: string) {
  try {
    await api.post('/auth/resend-verification', { email });
    return true;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.data?.message || 'Не удалось отправить письмо повторно');
    }
    throw new Error('Ошибка подключения к серверу');
  }
}

export function clearAuthError() {
  setState({ error: null });
}

export function logout(redirect = true) {
  if (browser) {
    localStorage.removeItem('accessToken');
  }
  setState({ user: null, isLoading: false });
  if (redirect) {
    goto('/login');
  }
}

export function requireAuth(next: string = '/login') {
  if (!browser) return;
  const token = localStorage.getItem('accessToken');
  if (!token) {
    goto(next);
  }
}
