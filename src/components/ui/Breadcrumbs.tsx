import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center text-xs font-medium text-slate-500 mb-2 bg-slate-50/80 max-w-full min-w-0 px-3 py-1.5 rounded-xl border border-slate-100 gap-y-1">
      {items.map((item, index) => (
        <div key={index} className="flex items-center min-w-0 max-w-full">
          {item.href ? (
            <a href={item.href} className="hover:text-emerald-600 transition-colors cursor-pointer truncate">
              {item.label}
            </a>
          ) : (
            <span className="text-slate-800 font-bold truncate max-w-[150px] sm:max-w-[250px]">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <ChevronLeft className="w-3.5 h-3.5 mx-1 text-slate-400 shrink-0" />
          )}
        </div>
      ))}
    </nav>
  );
}
