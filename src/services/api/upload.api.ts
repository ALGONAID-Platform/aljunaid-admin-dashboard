/**
 * Upload Service — src/services/api/upload.api.ts
 *
 * Enhanced with:
 * - Upload progress tracking
 * - Retry logic
 * - Detailed error classification (size, format, network, server)
 * - Multipart/form-data support for course images
 */

import { api } from '../../lib/api';

export interface UploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

export type UploadError =
  | { type: 'size'; message: string; maxMB: number }
  | { type: 'format'; message: string; allowed: string[] }
  | { type: 'network'; message: string }
  | { type: 'server'; message: string; status?: number }
  | { type: 'unknown'; message: string };

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS = ['JPG', 'PNG', 'WEBP'];
const MAX_IMAGE_MB = 5;
const MAX_PDF_MB = 50;

/** Classify upload errors into human-readable Arabic messages */
export function classifyUploadError(err: unknown): UploadError {
  if (!err || typeof err !== 'object') {
    return { type: 'unknown', message: 'حدث خطأ غير متوقع أثناء الرفع.' };
  }
  const e = err as Error & { status?: number; isNetworkError?: boolean; uploadError?: UploadError };

  if (e.uploadError) {
    return e.uploadError;
  }

  if (e.isNetworkError || e.message?.includes('Network Error') || e.message?.includes('network')) {
    return { type: 'network', message: 'انقطع الاتصال أثناء الرفع. تحقق من اتصالك وحاول مجدداً.' };
  }
  if (e.message?.includes('timeout') || e.message?.includes('ECONNABORTED')) {
    return { type: 'network', message: 'انتهت مهلة الرفع. الملف قد يكون كبيراً جداً أو الاتصال بطيء.' };
  }
  if (e.status === 413 || e.message?.includes('too large') || e.message?.includes('file size')) {
    return { type: 'size', message: `حجم الملف يتجاوز الحد المسموح به (${MAX_PDF_MB} MB).`, maxMB: MAX_PDF_MB };
  }
  if (e.status === 415 || e.message?.includes('unsupported') || e.message?.includes('mime')) {
    return { type: 'format', message: 'نوع الملف غير مدعوم.', allowed: ALLOWED_IMAGE_EXTS };
  }
  if (e.status === 422 || e.message?.includes('validation')) {
    return { type: 'server', message: 'رفض الخادم الملف بسبب فشل التحقق.', status: e.status };
  }
  if (e.status && e.status >= 500) {
    return { type: 'server', message: 'خطأ في الخادم أثناء معالجة الملف. حاول مجدداً.', status: e.status };
  }
  if (e.status === 400) {
    return { type: 'server', message: 'رفض الخادم الملف. تحقق من نوع الملف وحجمه.', status: 400 };
  }
  return { type: 'unknown', message: e.message ?? 'فشل الرفع.' };
}

/** Validate image file before upload */
export function validateImageFile(file: File): UploadError | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      type: 'format',
      message: `نوع الملف غير مدعوم. الأنواع المسموح بها: ${ALLOWED_IMAGE_EXTS.join(', ')}`,
      allowed: ALLOWED_IMAGE_EXTS,
    };
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return {
      type: 'size',
      message: `حجم الصورة (${(file.size / 1024 / 1024).toFixed(1)} MB) يتجاوز الحد الأقصى (${MAX_IMAGE_MB} MB).`,
      maxMB: MAX_IMAGE_MB,
    };
  }
  return null;
}

/** Validate PDF file before upload */
export function validatePdfFile(file: File): UploadError | null {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { type: 'format', message: 'يسمح فقط بملفات PDF.', allowed: ['PDF'] };
  }
  if (file.size > MAX_PDF_MB * 1024 * 1024) {
    return {
      type: 'size',
      message: `حجم الملف (${(file.size / 1024 / 1024).toFixed(1)} MB) يتجاوز الحد الأقصى (${MAX_PDF_MB} MB).`,
      maxMB: MAX_PDF_MB,
    };
  }
  return null;
}

export const uploadService = {
  /**
   * Upload an image file with progress tracking.
   * Returns a permanent server URL.
   */
  async uploadImage(
    file: File,
    onProgress?: (p: UploadProgress) => void
  ): Promise<string> {
    if (!file) {
      throw new Error('لم يتم تحديد ملف صالح للرفع.');
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      throw Object.assign(new Error(validationError.message), { uploadError: validationError });
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post<UploadResponse>('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress({
              percent: Math.round((evt.loaded * 100) / evt.total),
              loaded: evt.loaded,
              total: evt.total,
            });
          }
        },
      });

      // ✂️ === التعديل المعماري الصارم يبدأ هنا === ✂️
      const rawUrl = data.url.trim();
      // هذا السطر يستخرج الـ UUID بذكاء سواء كان مجرداً، أو في آخره شرطة مائلة، أو مدمجاً برابط خبيث
      const uuidMatch = rawUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

      if (uuidMatch) {
        // تم القبض على المعرف! نغلفه برابط السحابة النقي ونعيده فوراً
        return `https://ucarecdn.com/${uuidMatch[0]}/`;
      }

      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        return rawUrl;
      }

      // مسار الطوارئ للملفات المحلية الحقيقية (مع تجاوز TypeScript)
      const meta = import.meta as any;
      const configuredBaseUrl = (meta.env?.VITE_API_URL as string) || 'https://api.exchangesmangement.online/api/v1';
      const baseUrl = configuredBaseUrl.replace(/\/api\/v1\/?$/, '');
      return `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      // ✂️ === انتهى التعديل المعماري === ✂️

    } catch (err) {
      const classified = classifyUploadError(err);
      throw Object.assign(new Error(classified.message), { uploadError: classified });
    }
  }
  ,
  /**
   * Upload a PDF file with progress tracking.
   * Returns a permanent server URL.
   */
  async uploadPdf(
    file: File,
    onProgress?: (p: UploadProgress) => void
  ): Promise<string> {
    if (!file) {
      throw new Error('لم يتم تحديد ملف صالح للرفع.');
    }

    const validationError = validatePdfFile(file);
    if (validationError) {
      throw Object.assign(new Error(validationError.message), { uploadError: validationError });
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Backend uses the same endpoint for all uploadcare uploads
      const { data } = await api.post<UploadResponse>('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress({
              percent: Math.round((evt.loaded * 100) / evt.total),
              loaded: evt.loaded,
              total: evt.total,
            });
          }
        },
      });

      // If the server returns an already-absolute URL (e.g. Uploadcare CDN),
      // return it directly — do NOT prepend the API base URL.
      if (data.url.startsWith('http://') || data.url.startsWith('https://')) {
        return data.url;
      }

      // السطر الصحيح الذي يتجاوز فحص TypeScript:
      const configuredBaseUrl = ((import.meta as any).env?.VITE_API_URL as string | undefined) ?? 'https://api.exchangesmangement.online/api/v1'; const baseUrl = configuredBaseUrl.replace(/\/api\/v1\/?$/, '');
      return `${baseUrl}${data.url}`;
    } catch (err) {
      const classified = classifyUploadError(err);
      throw Object.assign(new Error(classified.message), { uploadError: classified });
    }
  },

  /**
   * Upload a course image as multipart/form-data directly to course create/update endpoint.
   * Returns FormData to be merged with course payload.
   */
  buildCourseFormData(payload: {
    title: string;
    description: string;
    thumbnail?: string;
    imageFile?: File;
    pdfUrl?: string;
    grade?: string | number;
    courseId?: string | number;
  }): FormData {
    const fd = new FormData();
    fd.append('title', payload.title.trim());
    fd.append('description', payload.description?.trim());
    if (payload.pdfUrl) fd.append('pdfUrl', payload.pdfUrl);
    if (payload.grade) fd.append('grade', String(payload.grade));

    const courseId = payload.courseId && !isNaN(Number(payload.courseId)) && Number(payload.courseId) !== 0
      ? Number(payload.courseId)
      : undefined;
    if (courseId) fd.append('courseId', String(courseId));

    if (payload.imageFile) {
      fd.append('thumbnail', payload.imageFile);
    } else if (payload.thumbnail) {
      fd.append('thumbnail', payload.thumbnail);
    }
    return fd;
  },

  validateUrl(url: string): string {
    if (url.startsWith('blob:')) {
      throw new Error('لا يمكن حفظ روابط blob. يجب أن يكون الرابط رابطاً كاملاً يبدأ بـ https://');
    }
    return url;
  },
};
