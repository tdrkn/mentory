'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, User, ApiError } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMentor: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string, role: 'mentor' | 'mentee') => Promise<User>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка пользователя при старте
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch (err) {
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string): Promise<User> => {
    setError(null);
    try {
      const response = await api.post<{ accessToken: string; user: User }>('/auth/login', {
        email,
        password,
      });
      localStorage.setItem('accessToken', response.accessToken);
      setUser(response.user);
      return response.user;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.message || 'Неверный email или пароль');
      } else {
        setError('Ошибка подключения к серверу');
      }
      throw err;
    }
  };

  const register = async (email: string, password: string, fullName: string, role: 'mentor' | 'mentee'): Promise<User> => {
    setError(null);
    try {
      const response = await api.post<{ accessToken: string; user: User }>('/auth/register', {
        email,
        password,
        fullName,
        role,
      });
      localStorage.setItem('accessToken', response.accessToken);
      setUser(response.user);
      return response.user;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.message || 'Ошибка регистрации');
      } else {
        setError('Ошибка подключения к серверу');
      }
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isMentor: user?.role === 'mentor',
        login,
        register,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
