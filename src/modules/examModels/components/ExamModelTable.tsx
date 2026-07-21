import { 
  FileText, FileImage, FileCode, Edit3, Trash2, Eye, 
  CheckCircle, Clock, BookOpen, FolderOpen, Square, CheckSquare
} from 'lucide-react';
import type { ExamModel } from '../../../types/examModel.types';
import { CATEGORY_LABELS, CONTENT_TYPE_ICONS } from './ExamModelCard';

interface ExamModelTableProps {
  examModels: ExamModel[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (examModel: ExamModel) => void;
  onDelete: (id: string) => void;
  onPreview: (examModel: ExamModel) => void;
  onTogglePublish: (id: string) => void;
}

export function ExamModelTable({
  examModels,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onPreview,
  onTogglePublish,
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
          const categoryMeta = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.MIDTERM;
          const contentTypeMeta = CONTENT_TYPE_ICONS[item.contentType] || CONTENT_TYPE_ICONS.PDF;
          const TypeIcon = contentTypeMeta.icon;

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
                  {item.moduleTitle && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <FolderOpen className="w-3 h-3 text-purple-500 shrink-0" />
                      <span className="truncate">{item.moduleTitle}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${categoryMeta.bg} ${categoryMeta.text} ${categoryMeta.border}`}>
                    {categoryMeta.label}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap ${contentTypeMeta.bg} ${contentTypeMeta.color}`}>
                    <TypeIcon className="w-3 h-3" />
                    {contentTypeMeta.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onTogglePublish(String(item.id))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                    item.isPublished
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {item.isPublished ? (
                    <><CheckCircle className="w-3.5 h-3.5" /> منشور</>
                  ) : (
                    <><Clock className="w-3.5 h-3.5" /> مسودة</>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <button onClick={() => onPreview(item)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl" title="معاينة">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => onEdit(item)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="تعديل">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(String(item.id))} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl" title="حذف">
                    <Trash2 className="w-4 h-4" />
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
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs">
              <th className="p-4 w-12 text-center">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className="text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {isAllSelected ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                </button>
              </th>
              <th className="p-4">نموذج الامتحان / الوصف</th>
              <th className="p-4">التصنيف الأكاديمي</th>
              <th className="p-4">نوع المحتوى</th>
              <th className="p-4">المقرر / الوحدة</th>
              <th className="p-4">الفصل والعام</th>
              <th className="p-4 text-center">حالة النشر</th>
              <th className="p-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {examModels.map((item) => {
              const isSelected = selectedIds.includes(String(item.id));
              const categoryMeta = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.MIDTERM;
              const contentTypeMeta = CONTENT_TYPE_ICONS[item.contentType] || CONTENT_TYPE_ICONS.PDF;
              const TypeIcon = contentTypeMeta.icon;

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isSelected ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleSelect(String(item.id))}
                      className="text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {isSelected ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                    </button>
                  </td>

                  <td className="p-4 max-w-xs">
                    <p className="font-bold text-slate-800 hover:text-emerald-600 cursor-pointer transition-colors" onClick={() => onPreview(item)}>
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5 max-w-sm">
                      {item.description}
                    </p>
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${categoryMeta.bg} ${categoryMeta.text} ${categoryMeta.border}`}
                    >
                      {categoryMeta.label}
                    </span>
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${contentTypeMeta.bg} ${contentTypeMeta.color}`}
                    >
                      <TypeIcon className="w-3.5 h-3.5" />
                      {contentTypeMeta.label}
                    </span>
                  </td>

                  <td className="p-4 max-w-xs">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 truncate">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{item.courseName || `مقرر (${item.courseId})`}</span>
                    </div>
                    {item.moduleTitle && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate mt-0.5">
                        <FolderOpen className="w-3 h-3 text-purple-500 shrink-0" />
                        <span className="truncate">{item.moduleTitle}</span>
                      </div>
                    )}
                  </td>

                  <td className="p-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                    <div>{item.semester}</div>
                    <div className="text-[11px] text-slate-400">{item.academicYear}</div>
                  </td>

                  <td className="p-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onTogglePublish(String(item.id))}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                        item.isPublished
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {item.isPublished ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>منشور</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>مسودة</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="p-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onPreview(item)}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="معاينة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="تعديل"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(String(item.id))}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
