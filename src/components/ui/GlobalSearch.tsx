import React from 'react';
import { Search } from 'lucide-react';

interface GlobalSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function GlobalSearch({ value, onChange, placeholder = "بحث شامل..." }: GlobalSearchProps) {
  return (
    <div className="relative flex-1 group w-full">
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
      />
    </div>
  );
}
