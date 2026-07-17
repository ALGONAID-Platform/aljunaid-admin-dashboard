import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (items: number) => void;
}

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 bg-white border-t border-slate-100 sm:px-6 gap-4 rounded-b-[2rem]">
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
        <p className="text-sm text-slate-500 font-medium">
          عرض <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> إلى <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, totalItems)}</span> من أصل <span className="font-bold text-slate-800">{totalItems}</span>
        </p>
        
        {onItemsPerPageChange && (
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
               onItemsPerPageChange(Number(e.target.value));
               onPageChange(1);
            }} 
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <option value={10}>10 عناصر</option>
            <option value={20}>20 عنصر</option>
            <option value={50}>50 عنصر</option>
            <option value={100}>100 عنصر</option>
          </select>
        )}
      </div>

      <div className="flex justify-between flex-1 sm:hidden w-full">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">السابق</button>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">التالي</button>
      </div>

      <div className="hidden sm:flex sm:items-center">
        <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-r-xl border border-slate-200 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <span className="sr-only">السابق</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(i => i === 1 || i === totalPages || Math.abs(currentPage - i) <= 1)
            .map((page, index, array) => {
              return (
                <React.Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="relative inline-flex items-center px-3 py-2 border-y border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">...</span>
                  )}
                  <button onClick={() => onPageChange(page)} className={`relative inline-flex items-center px-4 py-2 border text-sm font-bold transition-colors ${currentPage === page ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {page}
                  </button>
                </React.Fragment>
              );
          })}

          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-l-xl border border-slate-200 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <span className="sr-only">التالي</span>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
}
