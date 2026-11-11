import { useState } from 'react';
import {
  UploadCloud, CheckCircle2, AlertCircle, X, ShieldCheck,
  Minimize2, Maximize2, Copy, Check
} from 'lucide-react';
import { useVideoUploadStore } from '../../store';
import { toast } from 'react-hot-toast';

export function GlobalVideoUploadBanner() {
  const {
    isUploading,
    status,
    progress,
    fileInfo,
    videoUrl,
    error,
    uploadSpeed,
    timeRemaining,
    cancelUpload,
    dismiss,
  } = useVideoUploadStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);

  if (status === 'idle') return null;

  const handleCopy = () => {
    if (!videoUrl) return;
    navigator.clipboard.writeText(videoUrl);
    setCopied(true);
    toast.success('تم نسخ رابط الفيديو إلى الحافظة!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = () => {
    if (confirm('هل أنت متأكد من رغبتك في إلغاء عملية رفع هذا الفيديو؟ سيتم فقدان التقدم.')) {
      cancelUpload();
    }
  };

  const percent = progress?.percent ?? (status === 'completed' ? 100 : 0);
  const loadedMB = progress ? (progress.loaded / 1024 / 1024).toFixed(1) : '0';
  const totalMB = progress
    ? (progress.total / 1024 / 1024).toFixed(1)
    : fileInfo
    ? (fileInfo.size / 1024 / 1024).toFixed(1)
    : '0';

  return (
    <div
      dir="rtl"
      role="region"
      aria-label="شريط تقدم رفع الفيديو في الخلفية"
      className="fixed bottom-16 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-[420px] z-50 transition-all duration-300 pointer-events-auto"
    >
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/95 text-white shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-white/10">
        {/* Top Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/50">
          <div className="flex items-center gap-2 min-w-0">
            {status === 'uploading' && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
            {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}

            <span className="text-xs font-bold text-slate-100 truncate">
              {status === 'uploading'
                ? 'جارٍ رفع الفيديو في الخلفية'
                : status === 'completed'
                ? 'اكتمل رفع الفيديو بنجاح'
                : 'تعذر رفع الفيديو'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsMinimized((p) => !p)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title={isMinimized ? 'توسيع' : 'تصغير'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {status !== 'uploading' && (
              <button
                type="button"
                onClick={dismiss}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                title="إغلاق"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Minimized Single-line view */}
        {isMinimized && (
          <div className="px-3.5 py-2 flex items-center justify-between text-xs">
            <span className="truncate max-w-[260px] text-slate-300 font-medium">
              {fileInfo?.name || 'ملف فيديو'}
            </span>
            <span className="font-bold font-mono text-emerald-400 mr-2">{percent}%</span>
          </div>
        )}

        {/* Full Details View */}
        {!isMinimized && (
          <div className="p-3.5 space-y-3">
            {/* File Info */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-100 truncate" title={fileInfo?.name}>
                  {fileInfo?.name || 'ملف الفيديو'}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                  <span>
                    {loadedMB} / {totalMB} MB
                  </span>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">{percent}%</span>
                </div>
              </div>

              {status === 'uploading' && (
                <div className="text-right shrink-0">
                  {uploadSpeed && (
                    <p className="text-[11px] font-bold text-emerald-300 font-mono" dir="ltr">
                      {uploadSpeed}
                    </p>
                  )}
                  {timeRemaining && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeRemaining}</p>
                  )}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden ring-1 ring-slate-700/50">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  status === 'error'
                    ? 'bg-red-500'
                    : status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-teal-400 to-emerald-500 animate-pulse'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Background Keepalive Assurance Badge */}
            {status === 'uploading' && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="leading-tight">
                  الرفع مستمر في الخلفية حتى عند الخروج بالزر الأوسط أو إيقاف الشاشة مؤقتاً.
                </span>
              </div>
            )}

            {/* Error Message */}
            {status === 'error' && error && (
              <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded-xl border border-red-500/20 leading-relaxed">
                {error}
              </p>
            )}

            {/* Completed Actions */}
            {status === 'completed' && videoUrl && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 truncate font-mono select-all">
                  {videoUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
                </button>
              </div>
            )}

            {/* Cancel Action */}
            {status === 'uploading' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  إلغاء عملية الرفع
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
