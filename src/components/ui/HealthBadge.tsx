import React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface HealthBadgeProps {
  condition: boolean;
  label: string;
  type?: 'warning' | 'error' | 'info';
}

export function HealthBadge({ condition, label, type = 'warning' }: HealthBadgeProps) {
  if (!condition) return null;
  
  let config = { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', Icon: AlertTriangle };
  if (type === 'error') {
    config = { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', Icon: ShieldAlert };
  } else if (type === 'info') {
    config = { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', Icon: Info };
  }

  const { bg, text, border, Icon } = config;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${bg} ${text} ${border} shadow-sm whitespace-nowrap`}>
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}
