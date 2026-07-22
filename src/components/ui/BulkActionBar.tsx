import React from 'react';
import { Trash2, CheckCircle, Clock, Copy, X, Loader2 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onPublish?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  loading?: boolean;
}

export function BulkActionBar({ selectedCount, onClear, onPublish, onArchive, onDelete, onDuplicate, loading }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-18 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-xl animate-in slide-in-from-bottom-8">
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-2xl sm:rounded-full shadow-2xl flex items-center justify-between gap-2 sm:gap-4 border border-slate-700 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center justify-center bg-emerald-500 text-white w-6 h-6 rounded-full font-bold text-xs shadow-xs">
            {selectedCount}
          </span>
          <span className="text-xs sm:text-sm font-semibold whitespace-nowrap hidden xs:inline">محدد</span>
        </div>
        
        <div className="w-px h-5 bg-slate-700 shrink-0"></div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-emerald-400">
              <Loader2 className="w-4 h-4 animate-spin" /> معالجة...
            </div>
          ) : (
            <>
              {onPublish && (
                <button disabled={loading} onClick={onPublish} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 transition-colors text-xs font-bold text-emerald-400 touch-target">
                  <CheckCircle className="w-4 h-4" /> <span className="hidden sm:inline">نشر</span>
                </button>
              )}
              {onArchive && (
                <button disabled={loading} onClick={onArchive} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 transition-colors text-xs font-bold text-amber-400 touch-target">
                  <Clock className="w-4 h-4" /> <span className="hidden sm:inline">مسودة</span>
                </button>
              )}
              {onDuplicate && (
                <button disabled={loading} onClick={onDuplicate} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 transition-colors text-xs font-bold text-blue-400 touch-target">
                  <Copy className="w-4 h-4" /> <span className="hidden sm:inline">تكرار</span>
                </button>
              )}
              {onDelete && (
                <button disabled={loading} onClick={onDelete} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-red-500/20 text-red-400 transition-colors text-xs font-bold touch-target">
                  <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">حذف</span>
                </button>
              )}
            </>
          )}
        </div>
        
        {!loading && (
          <>
            <div className="w-px h-5 bg-slate-700 shrink-0"></div>
            <button onClick={onClear} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors touch-target shrink-0">
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
