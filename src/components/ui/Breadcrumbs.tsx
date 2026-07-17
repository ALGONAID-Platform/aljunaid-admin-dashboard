import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center text-sm font-medium text-slate-500 mb-4 bg-slate-50/50 w-max px-4 py-2 rounded-xl border border-slate-100">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {item.href ? (
            <a href={item.href} className="hover:text-emerald-600 transition-colors cursor-pointer">
              {item.label}
            </a>
          ) : (
            <span className="text-slate-800 font-bold">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <ChevronLeft className="w-4 h-4 mx-2 text-slate-400" />
          )}
        </div>
      ))}
    </nav>
  );
}
