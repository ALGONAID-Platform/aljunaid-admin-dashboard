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
  courseId: string | number | null;
  videoUrl: string | null;
  error: string | null;
  uploadSpeed: string | null;
  timeRemaining: string | null;

  startUpload: (file: File, courseId: string | number) => Promise<string>;
  cancelUpload: () => void;
  dismiss: () => void;
  reset: () => void;
}

let activeAbortController: AbortController | null = null;
let lastBytesLoaded = 0;
let lastProgressTimestamp = 0;
let smoothedSpeed = 0;

function isTransientUploadError(error: any): boolean {
  if (error?.status || error?.response?.status) return false;
  const message = String(error?.message ?? '').toLowerCase();
  return Boolean(error?.isNetworkError)
    || /network|connection|مشكلة في الاتصال|تعذر الاتصال|انقطع الاتصال/.test(message);
}

function waitForUploadResume(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new Error('تم إلغاء الرفع.'));
  if (document.visibilityState === 'visible' && navigator.onLine) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      document.removeEventListener('visibilitychange', checkReady);
      window.removeEventListener('online', checkReady);
      signal.removeEventListener('abort', onAbort);
    };
    const checkReady = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        cleanup();
        resolve();
      }
    };
    const onAbort = () => {
      cleanup();
      reject(new Error('تم إلغاء الرفع.'));
    };
    document.addEventListener('visibilitychange', checkReady);
    window.addEventListener('online', checkReady);
    signal.addEventListener('abort', onAbort, { once: true });
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
  courseId: null,
  videoUrl: null,
  error: null,
  uploadSpeed: null,
  timeRemaining: null,

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
      courseId,
      videoUrl: null,
      error: null,
      uploadSpeed: null,
      timeRemaining: null,
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
      const maxAttempts = 3;
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
          if (attempt >= maxAttempts || !isTransientUploadError(uploadError)) throw uploadError;
          set({ error: `انقطع الاتصال. أعد الصفحة إلى الواجهة والاتصال بالإنترنت لإعادة المحاولة (${attempt}/${maxAttempts - 1}).` });
          await waitForUploadResume(activeAbortController.signal);
          await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
          lastBytesLoaded = 0;
          lastProgressTimestamp = Date.now();
          smoothedSpeed = 0;
          set({ error: null, progress: { percent: 0, loaded: 0, total: file.size }, uploadSpeed: null, timeRemaining: null });
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
      });
      toast.error(`خطأ في رفع الفيديو: ${errorMessage}`);
      throw err;
    } finally {
      activeAbortController = null;
    }
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
      error: null,
      uploadSpeed: null,
      timeRemaining: null,
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
      courseId: null,
      videoUrl: null,
      error: null,
      uploadSpeed: null,
      timeRemaining: null,
    });
  },
}));
