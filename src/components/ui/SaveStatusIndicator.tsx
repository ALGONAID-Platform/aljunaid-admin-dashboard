import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { autosaveQueueService, type SaveStatus } from '../../services/sync/autosaveQueue.service';

export const SaveStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = autosaveQueueService.subscribe((newStatus, msg) => {
      setStatus(newStatus);
      if (msg) setMessage(msg);
    });
    return unsubscribe;
  }, []);

  if (status === 'idle') {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/60 text-[11px] font-bold text-slate-500 transition-all">
        <Cloud className="w-3.5 h-3.5 text-emerald-600" />
        <span>قاعدة البيانات متزامنة</span>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
        status === 'saving' ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse' :
        status === 'saved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
        status === 'retrying' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
        'bg-red-50 text-red-800 border border-red-200'
      }`}
      title={message}
    >
      {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
      {status === 'saved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />}
      {status === 'retrying' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />}
      {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
      
      <span>
        {status === 'saving' && 'جاري الحفظ تلقائياً...'}
        {status === 'saved' && 'تم الحفظ في قاعدة البيانات'}
        {status === 'retrying' && 'جاري إعادة المحاولة والتزامن...'}
        {status === 'error' && 'عطل في المزامنة'}
      </span>
    </div>
  );
};
