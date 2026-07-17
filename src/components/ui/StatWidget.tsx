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
    <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 mb-1">{title}</p>
        <h4 className="text-2xl font-black text-slate-800 leading-none">{value}</h4>
      </div>
    </div>
  );
}
