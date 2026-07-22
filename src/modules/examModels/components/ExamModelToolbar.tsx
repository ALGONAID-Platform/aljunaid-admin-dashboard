import { Search, LayoutGrid, List, Plus, Filter } from 'lucide-react';

interface ExamModelToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onCreateOpen: () => void;
}

export function ExamModelToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
  onCreateOpen,
}: ExamModelToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
      {/* Search Input */}
      <div className="relative flex-1 group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="البحث في نماذج الامتحانات، العناوين، الأوصاف، أو المقررات..."
          className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Toggle Filters Button */}
        <button
          type="button"
          onClick={onToggleFilters}
          className={`flex items-center justify-center flex-1 sm:flex-none gap-2 px-3 sm:px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
            showFilters
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Filter className="w-4 h-4 text-emerald-600" />
          <span className="whitespace-nowrap">الفلاتر</span>
        </button>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-xl transition-all ${
              viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="عرض الكروت والشبكة"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`p-2 rounded-xl transition-all ${
              viewMode === 'table' ? 'bg-white text-emerald-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="عرض القائمة والجدول"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Create Button */}
        <button
          type="button"
          onClick={onCreateOpen}
          className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
        >
          <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          <span className="whitespace-nowrap">إضافة نموذج</span>
        </button>
      </div>
    </div>
  );
}
