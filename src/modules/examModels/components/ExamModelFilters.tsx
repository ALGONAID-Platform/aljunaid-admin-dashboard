import { Filter, RotateCcw, BookOpen, GraduationCap } from 'lucide-react';
import { useCoursesStore } from '../../../store';
import type { ExamModelFilterOptions } from '../../../types/examModel.types';

interface ExamModelFiltersProps {
  filters: ExamModelFilterOptions;
  onChange: (newFilters: Partial<ExamModelFilterOptions>) => void;
  onReset: () => void;
}

export function ExamModelFilters({ filters, onChange, onReset }: ExamModelFiltersProps) {
  const { courses } = useCoursesStore();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>تصفية وفلترة نماذج الامتحانات</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-bold text-slate-400 hover:text-emerald-600 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Course Filter */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> المقرر الدراسي
          </label>
          <select
            value={filters.courseId || 'ALL'}
            onChange={(e) => onChange({ courseId: e.target.value })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="ALL">كافة المقررات</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Grade Filter */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> المرحلة الدراسية
          </label>
          <input
            type="text"
            value={filters.grade === 'ALL' ? '' : (filters.grade || '')}
            onChange={(e) => onChange({ grade: e.target.value || 'ALL' })}
            placeholder="ابحث بالمرحلة الدراسية..."
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
