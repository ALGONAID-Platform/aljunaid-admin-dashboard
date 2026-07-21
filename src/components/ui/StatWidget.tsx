import React from 'react';

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

export function StatWidget({ title, value, icon: Icon, color, bg }: StatWidgetProps) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />
      </div>
      <div className="min-w-0 w-full">
        <p className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1 sm:mb-1 truncate">{title}</p>
        <h4 className="text-xl sm:text-2xl font-black text-slate-800 leading-none truncate">{value}</h4>
      </div>
    </div>
  );
}
