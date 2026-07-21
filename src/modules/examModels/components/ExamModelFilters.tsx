import { Filter, RotateCcw, BookOpen, FolderOpen, Tag, FileType } from 'lucide-react';
import { useCoursesStore, useModulesStore } from '../../../store';
import type { ExamModelFilterOptions, ExamModelCategory, ExamModelContentType } from '../../../types/examModel.types';

interface ExamModelFiltersProps {
  filters: ExamModelFilterOptions;
  onChange: (newFilters: Partial<ExamModelFilterOptions>) => void;
  onReset: () => void;
}

export function ExamModelFilters({ filters, onChange, onReset }: ExamModelFiltersProps) {
  const { courses } = useCoursesStore();
  const { modules } = useModulesStore();

  const availableModules = modules.filter(
    (m) => filters.courseId === 'ALL' || String(m.courseId) === String(filters.courseId)
  );

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        {/* Category Filter */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-amber-500" /> تصنيف النموذج
          </label>
          <select
            value={filters.category || 'ALL'}
            onChange={(e) => onChange({ category: e.target.value as ExamModelCategory | 'ALL' })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="ALL">كافة التصنيفات</option>
            <option value="MIDTERM">اختبار نصف الفصل (Midterm)</option>
            <option value="FINAL">امتحان نهائي (Final)</option>
            <option value="QUIZ">اختبار قصير (Quiz)</option>
            <option value="PRACTICE">تمارين وتطبيقات (Practice)</option>
            <option value="PREVIOUS_EXAM">أسئلة سنوات سابقة (Previous)</option>
            <option value="ASSIGNMENT">واجب دراسي (Assignment)</option>
          </select>
        </div>

        {/* Content Type Filter */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <FileType className="w-3.5 h-3.5 text-blue-500" /> نوع المحتوى
          </label>
          <select
            value={filters.contentType || 'ALL'}
            onChange={(e) => onChange({ contentType: e.target.value as ExamModelContentType | 'ALL' })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="ALL">كافة الأنواع (PDF / صورة / Markdown)</option>
            <option value="PDF">ملف PDF فقط</option>
            <option value="IMAGE">صورة فقط</option>
            <option value="MARKDOWN">محتوى Markdown فقط</option>
          </select>
        </div>

        {/* Course Filter */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> المقرر الدراسي
          </label>
          <select
            value={filters.courseId || 'ALL'}
            onChange={(e) => onChange({ courseId: e.target.value, moduleId: 'ALL' })}
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

        {/* Module Filter */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <FolderOpen className="w-3.5 h-3.5 text-purple-500" /> الوحدة الدراسية
          </label>
          <select
            value={filters.moduleId || 'ALL'}
            onChange={(e) => onChange({ moduleId: e.target.value })}
            disabled={filters.courseId === 'ALL'}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-emerald-500 disabled:opacity-50"
          >
            <option value="ALL">كافة الوحدات</option>
            {availableModules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
