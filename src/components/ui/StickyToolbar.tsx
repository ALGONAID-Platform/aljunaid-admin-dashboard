import React from 'react';

export function StickyToolbar({ children }: { children: React.ReactNode; position?: 'top' | 'bottom' }) {
  return (
    <div className="relative mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 md:items-center justify-between">
      {children}
    </div>
  );
}
