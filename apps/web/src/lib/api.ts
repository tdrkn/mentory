import { browser } from '$app/environment';
import { getApiUrl } from './env';

export class ApiError extends Error {
  status: number;
  statusText: string;
  data?: any;

  constructor(status: number, statusText: string, data?: any) {
    super(`API Error: ${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
};

function getToken(): string | null {
  if (!browser) return null;
  return localStorage.getItem('accessToken');
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  const token = getToken();

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${getApiUrl()}/api${endpoint}`;
  const response = await fetch(url, config);

  if (response.status === 204) {
    return {} as T;
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && browser) {
      localStorage.removeItem('accessToken');
    }
    throw new ApiError(response.status, response.statusText, data);
  }

  return data as T;
}

export const api = {
  get: <T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'GET' }),

  post: <T>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'POST', body }),

  put: <T>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'PUT', body }),

  patch: <T>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'PATCH', body }),

  delete: <T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { ...options, method: 'DELETE' }),
};
