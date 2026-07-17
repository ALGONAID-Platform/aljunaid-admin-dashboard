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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8">
      <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center bg-emerald-500 text-white w-6 h-6 rounded-full font-bold text-xs shadow-sm">
            {selectedCount}
          </span>
          <span className="text-sm font-semibold whitespace-nowrap">عناصر محددة</span>
        </div>
        
        <div className="w-px h-6 bg-slate-700"></div>
        
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-emerald-400">
              <Loader2 className="w-4 h-4 animate-spin" /> جارٍ المعالجة...
            </div>
          ) : (
            <>
              {onPublish && (
                <button disabled={loading} onClick={onPublish} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold disabled:opacity-50 text-slate-300 hover:text-white">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> نشر
                </button>
              )}
              {onArchive && (
                <button disabled={loading} onClick={onArchive} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold disabled:opacity-50 text-slate-300 hover:text-white">
                  <Clock className="w-4 h-4 text-amber-400" /> مسودة
                </button>
              )}
              {onDuplicate && (
                <button disabled={loading} onClick={onDuplicate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold disabled:opacity-50 text-slate-300 hover:text-white">
                  <Copy className="w-4 h-4 text-blue-400" /> تكرار
                </button>
              )}
              {onDelete && (
                <button disabled={loading} onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors text-xs font-bold disabled:opacity-50">
                  <Trash2 className="w-4 h-4" /> حذف
                </button>
              )}
            </>
          )}
        </div>
        
        {!loading && (
          <>
            <div className="w-px h-6 bg-slate-700"></div>
            <button onClick={onClear} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
