import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: '#F8FAFC' }}
      >
        <Icon className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-slate-600 mb-1" style={{ fontSize: 16, fontWeight: 600 }}>
        {title}
      </h3>
      {description && (
        <p className="text-slate-400 max-w-xs" style={{ fontSize: 14 }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
