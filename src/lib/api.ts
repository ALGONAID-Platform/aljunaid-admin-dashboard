/**
 * Centralized Axios Instance — src/lib/api.ts
 *
 * Features:
 * - Base URL from VITE_API_URL environment variable
 * - JWT Bearer token injection via request interceptor
 * - Automatic 401 logout handling via response interceptor
 * - 15-second request timeout
 * - Normalized error messages
 */

import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL as string | undefined
  ?? 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const REQUEST_TIMEOUT_MS = 15_000;

// ─── Axios Instance ───────────────────────────────────────────────────────────

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor — Inject JWT ─────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ─── Response Interceptor — Error Handling & 401 Logout ───────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear session and redirect to login
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Redirect without React Router (safe from outside component tree)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(normalizeAxiosError(error));
  }
);

// ─── Error Normalizer ─────────────────────────────────────────────────────────

export function normalizeAxiosError(error: AxiosError): Error {
  if (error.response) {
    const data = error.response.data as { message?: string | string[] };
    const rawMessage = data?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage[0]
      : (rawMessage ?? `HTTP ${error.response.status}`);
    const err = new Error(message);
    (err as Error & { status: number }).status = error.response.status;
    return err;
  }
  if (error.request) {
    return new Error('لا يمكن الوصول إلى الخادم. تحقق من اتصالك بالإنترنت.');
  }
  return new Error(error.message ?? 'حدث خطأ غير متوقع');
}

// ─── Token Utilities ──────────────────────────────────────────────────────────

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};

export const userStorage = {
  get: <T>(): T | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  set: (user: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  remove: () => localStorage.removeItem(USER_KEY),
};
