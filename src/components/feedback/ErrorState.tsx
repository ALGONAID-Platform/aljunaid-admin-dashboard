import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'حدث خطأ',
  message = 'تعذّر تحميل البيانات. يرجى المحاولة مجدداً.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: '#FEF2F2' }}
      >
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-slate-700 mb-1" style={{ fontSize: 16, fontWeight: 600 }}>
        {title}
      </h3>
      <p className="text-slate-400 max-w-xs" style={{ fontSize: 14 }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14 }}
        >
          <RefreshCw className="w-4 h-4" />
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
