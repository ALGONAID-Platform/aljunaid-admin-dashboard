import React from 'react';

export interface SavedView {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface SavedViewsProps {
  views: SavedView[];
  activeView: string;
  onChange: (id: string) => void;
}

export function SavedViews({ views, activeView, onChange }: SavedViewsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
      {views.map(view => {
        const active = activeView === view.id;
        return (
          <button
            key={view.id}
            onClick={() => onChange(view.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              active ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 border'
            }`}
          >
            {view.icon && <view.icon className="w-3.5 h-3.5" />}
            {view.label}
          </button>
        )
      })}
    </div>
  );
}
