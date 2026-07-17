import React from 'react';

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const safePercent = Math.min(100, Math.max(0, percent || 0));
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <div className="flex justify-between text-xs font-bold text-slate-600">
          <span>{label}</span>
          <span className="text-emerald-600">{safePercent}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${safePercent}%`, background: 'linear-gradient(90deg, #10B981, #059669)' }}
        />
      </div>
    </div>
  );
}
