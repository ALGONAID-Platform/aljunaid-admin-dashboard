import { create } from 'zustand';
import { mediaApi, type UploadProgress } from '../services/api/media.api';
import {
  startBackgroundUploadKeepalive,
  stopBackgroundUploadKeepalive,
  sendBackgroundUploadNotification,
} from '../services/upload/backgroundKeepalive';
import { toast } from 'react-hot-toast';

export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error';

interface VideoUploadState {
  isUploading: boolean;
  status: UploadStatus;
  progress: UploadProgress | null;
  fileInfo: { name: string; size: number } | null;
  activeFile: File | null;
  courseId: string | number | null;
  videoUrl: string | null;
  error: string | null;
  uploadSpeed: string | null;
  timeRemaining: string | null;
  canRetry: boolean;

  startUpload: (file: File, courseId: string | number) => Promise<string>;
  retryUpload: () => Promise<string>;
  cancelUpload: () => void;
  dismiss: () => void;
  reset: () => void;
}

let activeAbortController: AbortController | null = null;
let lastBytesLoaded = 0;
let lastProgressTimestamp = 0;
let smoothedSpeed = 0;

/**
 * Checks whether an upload failure was due to transient network drops,
 * mobile app backgrounding, server timeouts, or temporary gateway errors.
 */
function isTransientUploadError(error: any): boolean {
  if (!error) return true;

  // Explicit user abort should never be retried
  if (
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CANCELED' ||
    error?.message === 'تم إلغاء الرفع.' ||
    error?.isAborted
  ) {
    return false;
  }

  // Non-retryable client errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 413 Too Large, 422 Invalid)
  const status = Number(error?.status || error?.response?.status || 0);
  if (status >= 400 && status < 500 && status !== 408 && status !== 429 && status !== 499) {
    return false;
  }

  const message = String(error?.message ?? '').toLowerCase();

  // Network drops, socket interruptions, or gateway/timeout responses are transient
  if (
    error?.isNetworkError ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ERR_NETWORK' ||
    status === 0 ||
    status >= 500 ||
    status === 408 ||
    status === 429 ||
    status === 499 ||
    /network|connection|timeout|offline|failed to fetch|load failed|econnreset|econnrefused|socket|اتصال|خادم|الخادم|الوصول|انقطع|تعذر|فشل/.test(message)
  ) {
    return true;
  }

  // Request issued but no HTTP response received from server
  if (error?.request && !error?.response) {
    return true;
  }

  return false;
}

/**
 * Suspends retry until the web page returns to foreground and an active internet connection is present.
 */
function waitForUploadResume(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new Error('تم إلغاء الرفع.'));
  if (document.visibilityState === 'visible' && navigator.onLine) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let finished = false;
    let interval: any = null;

    const cleanup = () => {
      finished = true;
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', checkReady);
      window.removeEventListener('online', checkReady);
      signal.removeEventListener('abort', onAbort);
    };

    const checkReady = () => {
      if (finished) return;
      if (document.visibilityState === 'visible' && navigator.onLine) {
        cleanup();
        resolve();
      }
    };

    const onAbort = () => {
      if (finished) return;
      cleanup();
      reject(new Error('تم إلغاء الرفع.'));
    };

    document.addEventListener('visibilitychange', checkReady);
    window.addEventListener('online', checkReady);
    signal.addEventListener('abort', onAbort, { once: true });

    // Periodic safety check in case visibilitychange / online events are delayed on mobile OS
    interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        checkReady();
      }
    }, 1000);

    checkReady();
  });
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0 || !isFinite(bytesPerSec)) return '';
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${Math.round(bytesPerSec / 1024)} KB/s`;
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '';
  if (seconds < 60) {
    return `${Math.round(seconds)} ثانية تقريباً`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins} دقيقة ${secs > 0 ? `و ${secs} ثانية` : ''} تقريباً`;
}

export const useVideoUploadStore = create<VideoUploadState>((set, get) => ({
  isUploading: false,
  status: 'idle',
  progress: null,
  fileInfo: null,
  activeFile: null,
  courseId: null,
  videoUrl: null,
  error: null,
  uploadSpeed: null,
  timeRemaining: null,
  canRetry: false,

  startUpload: async (file: File, courseId: string | number) => {
    // If an upload is already running, warn the user
    if (get().isUploading) {
      toast.error('هناك عملية رفع فيديو قيد التنفيذ بالفعل في الخلفية.');
      throw new Error('عملية رفع أخرى قيد التنفيذ.');
    }

    // Cancel any previous controller
    if (activeAbortController) {
      activeAbortController.abort();
    }
    activeAbortController = new AbortController();

    lastBytesLoaded = 0;
    lastProgressTimestamp = Date.now();
    smoothedSpeed = 0;

    set({
      isUploading: true,
      status: 'uploading',
      progress: { percent: 0, loaded: 0, total: file.size },
      fileInfo: { name: file.name, size: file.size },
      activeFile: file,
      courseId,
      videoUrl: null,
      error: null,
      uploadSpeed: null,
      timeRemaining: null,
      canRetry: true,
    });

    // Start background survival features (silent audio keepalive, wake lock, beforeunload)
    startBackgroundUploadKeepalive();

    const onProgress = (evt: UploadProgress) => {
      const now = Date.now();
      const timeDelta = (now - lastProgressTimestamp) / 1000;

      let currentSpeedStr = get().uploadSpeed;
      let remainingTimeStr = get().timeRemaining;

      if (timeDelta >= 0.8) {
        const bytesDelta = evt.loaded - lastBytesLoaded;
        const instantSpeed = bytesDelta / timeDelta;
        smoothedSpeed = smoothedSpeed === 0 ? instantSpeed : smoothedSpeed * 0.7 + instantSpeed * 0.3;
        lastBytesLoaded = evt.loaded;
        lastProgressTimestamp = now;

        if (smoothedSpeed > 0) {
          currentSpeedStr = formatSpeed(smoothedSpeed);
          const remainingBytes = Math.max(0, evt.total - evt.loaded);
          const remainingSecs = remainingBytes / smoothedSpeed;
          remainingTimeStr = formatRemainingTime(remainingSecs);
        }
      }

      set({
        progress: evt,
        uploadSpeed: currentSpeedStr,
        timeRemaining: remainingTimeStr,
      });
    };

    try {
      let uploaded;
      const maxAttempts = 10;
      for (let attempt = 1; ; attempt += 1) {
        try {
          uploaded = await mediaApi.uploadVideo(
            file,
            courseId,
            onProgress,
            activeAbortController.signal
          );
          break;
        } catch (uploadError: any) {
          if (activeAbortController?.signal?.aborted) {
            throw uploadError;
          }

          if (attempt >= maxAttempts || !isTransientUploadError(uploadError)) {
            throw uploadError;
          }

          const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
          if (isHidden) {
            set({
              error: 'تم تعليق الرفع مؤقتاً أثناء استخدام تطبيق آخر. أعد الصفحة للواجهة وسنستأنف الرفع تلقائياً.',
            });
          } else {
            set({
              error: `انقطع الاتصال بالخادم. جارٍ استئناف الرفع تلقائياً (${attempt}/${maxAttempts - 1})...`,
            });
          }

          // Wait until the user brings the app back to foreground and has network
          await waitForUploadResume(activeAbortController.signal);

          set({
            error: `جاري إعادة محاولة الرفع (${attempt + 1}/${maxAttempts})...`,
          });

          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * attempt, 3500)));
          lastBytesLoaded = 0;
          lastProgressTimestamp = Date.now();
          smoothedSpeed = 0;
          set({
            error: null,
            progress: { percent: 0, loaded: 0, total: file.size },
            uploadSpeed: null,
            timeRemaining: null,
          });
        }
      }

      const finalVideoUrl = uploaded.videoUrl ?? uploaded.url;
      if (!finalVideoUrl) {
        throw new Error('لم يُرجع الخادم رابط الفيديو.');
      }

      set({
        isUploading: false,
        status: 'completed',
        progress: { percent: 100, loaded: file.size, total: file.size },
        videoUrl: finalVideoUrl,
        error: null,
        uploadSpeed: null,
        timeRemaining: null,
        canRetry: false,
      });

      stopBackgroundUploadKeepalive();
      sendBackgroundUploadNotification('اكتمل رفع الفيديو بنجاح 🎉', file.name);
      toast.success(`اكتمل رفع الفيديو بنجاح (${(file.size / 1024 / 1024).toFixed(1)} MB)`);

      return finalVideoUrl;
    } catch (err: any) {
      stopBackgroundUploadKeepalive();

      if (activeAbortController?.signal?.aborted) {
        set({
          isUploading: false,
          status: 'idle',
          progress: null,
          error: null,
          uploadSpeed: null,
          timeRemaining: null,
          canRetry: false,
        });
        toast('تم إلغاء رفع الفيديو.');
        throw new Error('تم إلغاء الرفع.');
      }

      const errorMessage =
        err?.response?.data?.message || err?.message || 'فشل رفع الفيديو إلى الخادم.';
      set({
        isUploading: false,
        status: 'error',
        error: errorMessage,
        uploadSpeed: null,
        timeRemaining: null,
        canRetry: true,
      });
      toast.error(`خطأ في رفع الفيديو: ${errorMessage}`);
      throw err;
    } finally {
      activeAbortController = null;
    }
  },

  retryUpload: async () => {
    const { activeFile, courseId, isUploading } = get();
    if (!activeFile || !courseId) {
      toast.error('لا يوجد ملف محفوظ لإعادة المحاولة.');
      throw new Error('لا يوجد ملف محفوظ.');
    }
    if (isUploading) {
      toast('عملية الرفع جارية بالفعل.');
      return '';
    }
    return get().startUpload(activeFile, courseId);
  },

  cancelUpload: () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    stopBackgroundUploadKeepalive();
    set({
      isUploading: false,
      status: 'idle',
      progress: null,
      activeFile: null,
      error: null,
      uploadSpeed: null,
      timeRemaining: null,
      canRetry: false,
    });
  },

  dismiss: () => {
    set({
      status: 'idle',
      progress: null,
      error: null,
      uploadSpeed: null,
      timeRemaining: null,
    });
  },

  reset: () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    stopBackgroundUploadKeepalive();
    set({
      isUploading: false,
      status: 'idle',
      progress: null,
      fileInfo: null,
      activeFile: null,
      courseId: null,
      videoUrl: null,
      error: null,
      uploadSpeed: null,
      timeRemaining: null,
      canRetry: false,
    });
  },
}));
