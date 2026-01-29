/**
 * API Client - централизованный wrapper для всех API запросов
 * Особенности:
 * - Автоматическое добавление токена
 * - Обработка ошибок
 * - Типизация
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  tags?: string[];
};

// Получение токена из cookie (server-side) или localStorage (client-side)
function getToken(): string | null {
  if (typeof window === 'undefined') {
    // Server-side: читаем из cookies через next/headers
    return null; // Будет передан через headers
  }
  return localStorage.getItem('accessToken');
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, cache, tags } = options;

  const token = getToken();

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    ...(body && { body: JSON.stringify(body) }),
    ...(cache && { cache }),
    ...(tags && { next: { tags } }),
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}/api${endpoint}`;
  
  const response = await fetch(url, config);

  // Handle no content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Handle 401 - redirect to login
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    throw new ApiError(response.status, response.statusText, data);
  }

  return data as T;
}

// Convenience methods
export const api = {
  get: <T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'GET' }),
    
  post: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'POST', body }),
    
  put: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'PUT', body }),
    
  patch: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'PATCH', body }),
    
  delete: <T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'DELETE' }),
};

// ============================================
// API Types
// ============================================

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'mentor' | 'mentee' | 'admin';
}

export interface MentorProfile {
  id: string;
  userId: string;
  user: User;
  title: string;
  bio: string;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  sessionCount: number;
  topics: { id: string; name: string }[];
  isVerified: boolean;
}

export interface Slot {
  id: string;
  mentorId: string;
  startAt: string;
  endAt: string;
  status: 'available' | 'held' | 'booked';
}

export interface Session {
  id: string;
  mentorId: string;
  menteeId: string;
  slotId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled';
  startAt: string;
  endAt: string;
  mentor: User;
  mentee: User;
}

export interface Conversation {
  id: string;
  mentor: User;
  mentee: User;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: User;
}
