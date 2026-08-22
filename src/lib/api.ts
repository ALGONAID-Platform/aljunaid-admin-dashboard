/**
 * Centralized Axios Instance — src/lib/api.ts
 *
 * Features:
 * - Base URL from VITE_API_URL environment variable
 * - JWT Bearer token injection via request interceptor
 * - No aggressive full-page reloads on 401 errors (Hard Redirect prevented)
 * - Custom Event emission for soft logout handling
 * - 15-second request timeout
 * - Normalized error messages
 */

import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { toast } from "react-hot-toast";
// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL as string | undefined
  ?? 'https://api.exchangesmangement.online/api/v1';

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
    // Let browser & Axios set multipart/form-data with boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ─── Response Interceptor — Error Handling & 401 Logout ───────────────────────

let isSessionExpiredToastShown = false; // لمنع تكرار رسالة الخطأ عدة مرات

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // فقط إذا لم نكن في صفحة تسجيل الدخول بالفعل
      if (!window.location.pathname.includes('/login')) {

        // مسح بيانات التوكن المنتهية
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        // إظهار رسالة تنبيه للمستخدم مرة واحدة فقط
        if (!isSessionExpiredToastShown) {
          toast.error('انتهت صلاحية الجلسة. يرجى إعادة تسجيل الدخول.');
          isSessionExpiredToastShown = true;

          // إعادة ضبط المتغير بعد فترة قصيرة
          setTimeout(() => {
            isSessionExpiredToastShown = false;
          }, 5000);
        }

        // --- التعديل السحري لمنع الـ Full Page Reload ---
        // بدلاً من window.location.href الذي يدمر التطبيق، نطلق حدثاً مخصصاً (Custom Event)
        // يمكن لالـ AuthProvider أو نظام الـ Router في الـ React التقاطه وعمل توجيه ناعم (Soft Navigate).
        const logoutEvent = new CustomEvent('auth:session-expired');
        window.dispatchEvent(logoutEvent);

        // كخيار احتياطي، يمكنك إزالة الـ setTimeout أدناه إذا قمت بمعالجة الحدث أعلاه في الـ App.tsx
        // أما إذا أردت إبقاء التوجيه القسري ولكن "بعد" السماح للمستخدم برؤية الرسالة وعدم المقاطعة الفورية:
        // setTimeout(() => {
        //   window.location.href = '/login'; 
        // }, 2000);
      }
    }
    return Promise.reject(normalizeAxiosError(error));
  }
);

// ─── Error Normalizer ─────────────────────────────────────────────────────────

export function normalizeAxiosError(error: AxiosError): Error {
  if (error.response) {
    const data = error.response.data as { message?: string | string[]; error?: string };
    const rawMessage = data?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage[0]
      : (rawMessage ?? data?.error ?? `HTTP ${error.response.status}`);
    const err = new Error(message);
    (err as Error & { status: number; code?: string }).status = error.response.status;
    (err as Error & { status?: number; code?: string }).code = error.code;
    return err;
  }
  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    const err = new Error('انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.');
    (err as Error & { isNetworkError: boolean; code?: string }).isNetworkError = true;
    (err as Error & { isNetworkError?: boolean; code?: string }).code = error.code;
    return err;
  }
  if (error.request) {
    const err = new Error('لا يمكن الوصول إلى الخادم. تحقق من اتصالك بالإنترنت.');
    (err as Error & { isNetworkError: boolean; code?: string }).isNetworkError = true;
    (err as Error & { isNetworkError?: boolean; code?: string }).code = error.code;
    return err;
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