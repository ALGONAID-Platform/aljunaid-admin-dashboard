import React from 'react';

interface StatusBadgeProps {
  status: 'published' | 'draft' | 'archived' | 'scheduled' | string | boolean;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let config = { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: String(status) };
  
  if (status === 'published' || status === true) {
    config = { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'منشور' };
  } else if (status === 'draft' || status === false) {
    config = { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'مسودة' };
  } else if (status === 'archived') {
    config = { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', label: 'مؤرشف' };
  } else if (status === 'scheduled') {
    config = { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'مجدول' };
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${config.bg} ${config.text} ${config.border} shadow-sm whitespace-nowrap`}>
      {config.label}
    </span>
  );
}
