import React from 'react';
import { Activity, ShieldCheck, AlertOctagon, TrendingUp } from 'lucide-react';

interface HealthScoreProps {
  score: number;
}

export function HealthScore({ score }: HealthScoreProps) {
  const safeScore = Math.min(100, Math.max(0, score || 0));
  
  let color = 'text-emerald-500';
  let bg = 'bg-emerald-50';
  let border = 'border-emerald-100';
  let Icon = ShieldCheck;
  let text = 'ممتاز';

  if (safeScore < 50) {
    color = 'text-red-500';
    bg = 'bg-red-50';
    border = 'border-red-100';
    Icon = AlertOctagon;
    text = 'حرج';
  } else if (safeScore < 80) {
    color = 'text-amber-500';
    bg = 'bg-amber-50';
    border = 'border-amber-100';
    Icon = Activity;
    text = 'جيد';
  }

  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${border} ${bg} relative overflow-hidden group`}>
      <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10 ${bg} group-hover:scale-150 transition-transform duration-500`}></div>
      <Icon className={`w-8 h-8 mb-2 ${color}`} strokeWidth={1.5} />
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black ${color}`}>{safeScore}</span>
        <span className={`text-xs font-bold ${color}`}>/100</span>
      </div>
      <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${color}`}>درجة صحة المحتوى: {text}</span>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-black/5">
        <div className={`h-full ${color.replace('text-', 'bg-')}`} style={{ width: `${safeScore}%` }}></div>
      </div>
    </div>
  );
}
