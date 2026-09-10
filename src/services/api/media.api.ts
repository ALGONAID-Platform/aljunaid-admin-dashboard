import { api } from '../../lib/api';
import { UploadMediaResponse } from '../../types/media.types';

export interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

export type UploadError =
  | { type: 'size'; message: string; maxMB: number }
  | { type: 'format'; message: string; allowed: string[] }
  | { type: 'network'; message: string }
  | { type: 'server'; message: string; status?: number; backendMessage?: string }
  | { type: 'unknown'; message: string; backendMessage?: string };

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS = ['JPG', 'PNG', 'WEBP'];
const MAX_IMAGE_MB = 10; // Updated to match VPS limits
const MAX_PDF_MB = 50;

/** Classify upload errors and preserve exact VPS backend messages (e.g. 422, 400, etc.) */
export function classifyUploadError(err: unknown): UploadError {
  if (!err || typeof err !== 'object') {
    return { type: 'unknown', message: 'حدث خطأ غير متوقع أثناء الرفع.' };
  }
  
  const e = err as any;
  if (e.uploadError) return e.uploadError;

  const backendMessage = e.message || e.response?.data?.message || 'لا توجد تفاصيل من الخادم';

  if (e.isNetworkError || e.message?.includes('Network Error') || e.message?.includes('network')) {
    return { type: 'network', message: 'انقطع الاتصال أثناء الرفع. تحقق من اتصالك وحاول مجدداً.' };
  }
  if (e.message?.includes('timeout') || e.message?.includes('ECONNABORTED')) {
    return { type: 'network', message: 'انتهت مهلة الرفع. الملف قد يكون كبيراً جداً أو الاتصال بطيء.' };
  }
  
  if (e.status === 413 || e.message?.includes('too large') || e.message?.includes('file size')) {
    return { type: 'size', message: 'حجم الملف يتجاوز الحد الأقصى المسموح به.', maxMB: MAX_PDF_MB };
  }
  if (e.status === 415 || e.message?.includes('unsupported') || e.message?.includes('mime')) {
    return { type: 'format', message: 'نوع الملف غير مدعوم.', allowed: ALLOWED_IMAGE_EXTS };
  }
  
  // الاحتفاظ بالرسالة الحقيقية في حالة الـ Validation errors القادمة من VPS (مثل 422 أو 400)
  if (e.status === 422) {
    return { 
      type: 'server', 
      message: `رفض الخادم الملف بسبب فشل التحقق (422). تفاصيل: ${backendMessage}`, 
      status: e.status, 
      backendMessage 
    };
  }
  
  if (e.status === 400 || e.message?.includes('validation')) {
    return { 
      type: 'server', 
      message: `رفض الخادم الملف. تفاصيل: ${backendMessage}`, 
      status: 400, 
      backendMessage 
    };
  }
  
  if (e.status && e.status >= 500) {
    return { type: 'server', message: `خطأ في الخادم أثناء معالجة الملف. تفاصيل: ${backendMessage}`, status: e.status, backendMessage };
  }
  
  return { type: 'unknown', message: backendMessage, backendMessage };
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



export const mediaApi = {
  /**
   * Upload an image to the VPS canonical endpoint
   */
  uploadImage: async (file: File, onProgress?: (evt: UploadProgress) => void): Promise<UploadMediaResponse> => {
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
      const response = await api.post<UploadMediaResponse>('/media/images', formData, {
        timeout: 0,
        headers: { Accept: 'application/json' },
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

      return response.data;
    } catch (err) {
      console.error('Upload Error:', err);
      const classified = classifyUploadError(err);
      throw Object.assign(new Error(classified.message), { uploadError: classified });
    }
  },



  validateUrl: (url: string): string => {
    if (url.startsWith('blob:')) {
      throw new Error('لا يمكن حفظ روابط blob. يجب أن يكون الرابط رابطاً كاملاً يبدأ بـ https://');
    }
    return url;
  },

  deleteMedia: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/media/${id}`);
    return response.data;
  }
};