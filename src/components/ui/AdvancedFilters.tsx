import React from 'react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  id: string;
  options: FilterOption[];
  value: string;
  onChange: (val: string) => void;
}

interface AdvancedFiltersProps {
  filters: FilterGroup[];
}

export function AdvancedFilters({ filters }: AdvancedFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto">
      {filters.map(filter => (
        <select
          key={filter.id}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="w-full sm:w-auto min-w-0 sm:min-w-[160px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-sm appearance-none cursor-pointer hover:bg-slate-50"
          style={{ backgroundPosition: 'left 1rem center', backgroundSize: '1.2em 1.2em', backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat' }}
        >
          {filter.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  );
}
