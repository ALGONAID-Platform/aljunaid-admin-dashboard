import React from 'react';

export function StickyToolbar({ children, position = 'top' }: { children: React.ReactNode; position?: 'top' | 'bottom' }) {
  return (
    <div className={`sticky ${position === 'top' ? 'top-0 z-20 mb-6' : 'bottom-0 z-20 mt-6'} bg-slate-50/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 md:items-center justify-between`}>
      {children}
    </div>
  );
}
