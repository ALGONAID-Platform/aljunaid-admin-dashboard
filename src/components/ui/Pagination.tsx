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
    <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-100 gap-3 sm:gap-4 rounded-b-2xl sm:rounded-b-[2rem]">
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between text-xs sm:text-sm text-slate-500 font-medium">
        <span>
          عرض <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span>-
          <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, totalItems)}</span> من <span className="font-bold text-slate-800">{totalItems}</span>
        </span>
        
        {onItemsPerPageChange && (
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
               onItemsPerPageChange(Number(e.target.value));
               onPageChange(1);
            }} 
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-700 outline-none hover:bg-slate-100 transition-colors cursor-pointer touch-target"
          >
            <option value={10}>10 / صفحة</option>
            <option value={20}>20 / صفحة</option>
            <option value={50}>50 / صفحة</option>
            <option value={100}>100 / صفحة</option>
          </select>
        )}
      </div>

      {/* Mobile controls */}
      <div className="flex items-center justify-between flex-1 sm:hidden w-full gap-2">
        <button 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1} 
          className="flex-1 inline-flex items-center justify-center gap-1 min-h-[44px] px-3 py-2 text-xs font-extrabold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all shadow-xs"
        >
          <ChevronRight className="w-4 h-4" />
          السابق
        </button>
        <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 whitespace-nowrap">
          {currentPage} / {totalPages}
        </span>
        <button 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages} 
          className="flex-1 inline-flex items-center justify-center gap-1 min-h-[44px] px-3 py-2 text-xs font-extrabold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all shadow-xs"
        >
          التالي
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop controls */}
      <div className="hidden sm:flex sm:items-center">
        <nav className="relative z-0 inline-flex rounded-xl shadow-xs -space-x-px" aria-label="Pagination">
          <button 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1} 
            className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <span className="sr-only">السابق</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(i => i === 1 || i === totalPages || Math.abs(currentPage - i) <= 1)
            .map((page, index, array) => {
              return (
                <React.Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="relative inline-flex items-center px-3 py-2 border-y border-slate-200 bg-slate-50 text-xs font-medium text-slate-400">...</span>
                  )}
                  <button 
                    onClick={() => onPageChange(page)} 
                    className={`relative inline-flex items-center px-3.5 py-2 border text-xs font-bold transition-colors ${currentPage === page ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
          })}

          <button 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === totalPages} 
            className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <span className="sr-only">التالي</span>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
}
