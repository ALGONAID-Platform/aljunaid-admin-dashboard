import { 
  FileText, Edit3, Trash2, Eye, 
  Calendar, BookOpen, Square, CheckSquare
} from 'lucide-react';
import type { ExamModel } from '../../../types/examModel.types';

interface ExamModelTableProps {
  examModels: ExamModel[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (examModel: ExamModel) => void;
  onDelete: (id: string) => void;
  onPreview: (examModel: ExamModel) => void;
}

export function ExamModelTable({
  examModels,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onPreview,
}: ExamModelTableProps) {
  const isAllSelected = examModels.length > 0 && selectedIds.length === examModels.length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Mobile Stacked Cards Layout */}
      <div className="md:hidden divide-y divide-slate-100">
        {/* Mobile Select All Header */}
        <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="text-slate-400 hover:text-emerald-600 transition-colors p-2"
            >
              {isAllSelected ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
            </button>
            <span className="text-xs font-bold text-slate-500">تحديد الكل</span>
          </div>
        </div>
        
        {examModels.map((item) => {
          const isSelected = selectedIds.includes(String(item.id));

          return (
            <div key={item.id} className={`p-4 space-y-4 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggleSelect(String(item.id))}
                  className="mt-1 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {isSelected ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 hover:text-emerald-600 cursor-pointer transition-colors" onClick={() => onPreview(item)}>
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{item.courseName || `مقرر (${item.courseId})`}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {item.grade && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200 whitespace-nowrap">
                      {item.grade}
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap bg-red-50 text-red-600">
                    <FileText className="w-3 h-3" />
                    PDF
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <button onClick={() => onPreview(item)} className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl touch-target flex items-center justify-center" title="معاينة">
                    <Eye className="w-4.5 h-4.5" />
                  </button>
                  <button onClick={() => onEdit(item)} className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl touch-target flex items-center justify-center" title="تعديل">
                    <Edit3 className="w-4.5 h-4.5" />
                  </button>
                  <button onClick={() => onDelete(String(item.id))} className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl touch-target flex items-center justify-center" title="حذف">
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-6 py-4 w-14">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className="text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {isAllSelected ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                </button>
              </th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">العنوان</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">المقرر والمرحلة</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {examModels.map((item) => {
              const isSelected = selectedIds.includes(String(item.id));

              return (
                <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors group ${isSelected ? 'bg-emerald-50/20' : ''}`}>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => onToggleSelect(String(item.id))}
                      className="text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {isSelected ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-emerald-600 cursor-pointer transition-colors" onClick={() => onPreview(item)}>
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate max-w-xs">{item.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        <span>{item.courseName || `مقرر (${item.courseId})`}</span>
                      </div>
                      {item.grade && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-600">
                           <span className="w-4 h-4 flex items-center justify-center bg-purple-100 rounded-md">🏫</span>
                           <span>{item.grade}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onPreview(item)}
                        className="p-2 bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors"
                        title="معاينة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="p-2 bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                        title="تعديل"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(String(item.id))}
                        className="p-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {examModels.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">
                  لا توجد نماذج لعرضها.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
