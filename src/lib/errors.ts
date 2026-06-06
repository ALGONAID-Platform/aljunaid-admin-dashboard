/**
 * Unified Error Handler — src/lib/errors.ts
 *
 * Single source of truth for:
 * - HTTP status code → Arabic user message mapping
 * - Error classification
 * - Security: never expose stack traces or internal error details to UI
 */

// ─── HTTP Status → User Message Map ──────────────────────────────────────────

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'البيانات المرسلة غير صحيحة. يرجى مراجعة المدخلات.',
  401: 'انتهت صلاحية جلستك. يرجى تسجيل الدخول مجدداً.',
  403: 'ليس لديك صلاحية للقيام بهذا الإجراء.',
  404: 'العنصر المطلوب غير موجود.',
  409: 'البيانات موجودة مسبقاً أو هناك تعارض.',
  422: 'بيانات غير قابلة للمعالجة. يرجى مراجعة القيم المدخلة.',
  429: 'تم تجاوز الحد المسموح به من الطلبات. يرجى الانتظار.',
  500: 'حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.',
  502: 'الخادم غير متاح مؤقتاً. يرجى المحاولة لاحقاً.',
  503: 'الخدمة متوقفة مؤقتاً للصيانة.',
};

// ─── Auth-Specific Error Messages ─────────────────────────────────────────────

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Credentials are not valid': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'Invalid credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'User not found': 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.',
  'Account is banned': 'هذا الحساب موقوف. يرجى التواصل مع الدعم الفني.',
  'Email already exists': 'البريد الإلكتروني مسجل مسبقاً.',
  'Unauthorized': 'غير مصرح لك بالوصول.',
};

// ─── Error Type Guard ──────────────────────────────────────────────────────────

export interface AppError extends Error {
  status?: number;
  isNetworkError?: boolean;
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof Error;
}

// ─── Main Error Resolver ──────────────────────────────────────────────────────

/**
 * Resolves any thrown error into a safe, Arabic user-facing message.
 * Never exposes internal error details, stack traces, or backend implementation.
 */
export function resolveErrorMessage(err: unknown): string {
  if (!isAppError(err)) {
    return 'حدث خطأ غير متوقع.';
  }

  const appError = err as AppError;

  // Network connectivity error (no response received)
  if (appError.isNetworkError || appError.message.includes('Network Error')) {
    return 'لا يمكن الوصول إلى الخادم. تحقق من اتصالك بالإنترنت.';
  }

  // Timeout
  if (appError.message.includes('timeout') || appError.message.includes('ECONNABORTED')) {
    return 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.';
  }

  // Auth-specific messages from backend
  if (appError.message) {
    const authMsg = AUTH_ERROR_MESSAGES[appError.message];
    if (authMsg) return authMsg;
  }

  // HTTP status code based
  if (appError.status && HTTP_ERROR_MESSAGES[appError.status]) {
    return HTTP_ERROR_MESSAGES[appError.status];
  }

  // Safe generic fallback — never return raw error.message to UI
  return 'فشلت العملية. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.';
}

// ─── Auth Error Classifier ─────────────────────────────────────────────────────

/**
 * Classifies a login error into a known error code for the ErrorMap in LoginPage.
 */
export function classifyAuthError(err: unknown): string {
  if (!isAppError(err)) return 'server';

  const msg = (err as AppError).message?.toLowerCase() ?? '';
  const status = (err as AppError).status;

  if (status === 404 || msg.includes('not found') || msg.includes('غير موجود')) return 'not_found';
  if (status === 403 || msg.includes('banned') || msg.includes('موقوف')) return 'banned';
  if (status === 401 || msg.includes('invalid') || msg.includes('credentials') || msg.includes('غير صحيح')) return 'invalid';
  if (!status || status >= 500 || msg.includes('network') || msg.includes('timeout')) return 'server';

  return 'invalid';
}
