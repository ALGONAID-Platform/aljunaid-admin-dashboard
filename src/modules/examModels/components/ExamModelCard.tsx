import { useState } from 'react';
import { 
  FileText, FileImage, FileCode, Edit3, Trash2, Eye, 
  CheckCircle, Clock, BookOpen, FolderOpen, Calendar,
  MoreVertical, Download, ExternalLink, Sparkles
} from 'lucide-react';
import type { ExamModel, ExamModelCategory, ExamModelContentType } from '../../../types/examModel.types';

interface ExamModelCardProps {
  examModel: ExamModel;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onEdit: (examModel: ExamModel) => void;
  onDelete: (id: string) => void;
  onPreview: (examModel: ExamModel) => void;
  onTogglePublish: (id: string) => void;
}

export const CATEGORY_LABELS: Record<ExamModelCategory, { label: string; bg: string; text: string; border: string }> = {
  MIDTERM: { label: 'اختبار نصف الفصل', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  FINAL: { label: 'امتحان نهائي', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  QUIZ: { label: 'اختبار قصير', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PRACTICE: { label: 'تمارين وتطبيقات', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  PREVIOUS_EXAM: { label: 'أسئلة سنوات سابقة', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  ASSIGNMENT: { label: 'واجب دراسي', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
};

export const CONTENT_TYPE_ICONS: Record<ExamModelContentType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PDF: { label: 'ملف PDF', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
  IMAGE: { label: 'صورة توضيحية', icon: FileImage, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  MARKDOWN: { label: 'محتوى Markdown', icon: FileCode, color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export function ExamModelCard({
  examModel,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onPreview,
  onTogglePublish,
}: ExamModelCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const categoryMeta = CATEGORY_LABELS[examModel.category] || CATEGORY_LABELS.MIDTERM;
  const contentTypeMeta = CONTENT_TYPE_ICONS[examModel.contentType] || CONTENT_TYPE_ICONS.PDF;
  const TypeIcon = contentTypeMeta.icon;

  return (
    <div
      className={`bg-white rounded-3xl border transition-all duration-300 group flex flex-col relative overflow-hidden ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
          : 'border-slate-100 hover:border-slate-200 hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      {/* Top Banner / Color Strip */}
      <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

      <div className="p-6 flex flex-col flex-1">
        {/* Badges & Header Controls */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${categoryMeta.bg} ${categoryMeta.text} ${categoryMeta.border}`}
            >
              {categoryMeta.label}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${contentTypeMeta.bg} ${contentTypeMeta.color}`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              {contentTypeMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(examModel.id)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
              >
                ✓
              </button>
            )}

            <button
              type="button"
              onClick={() => onTogglePublish(examModel.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                examModel.isPublished
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
              title={examModel.isPublished ? 'منشور للطلاب (اضغط لإلغاء النشر)' : 'مسودة غير منشورة (اضغط للنشر)'}
            >
              {examModel.isPublished ? (
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
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-slate-800 font-bold text-base mb-2 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
          {examModel.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4 flex-1">
          {examModel.description}
        </p>

        {/* Content Type Feature Preview Box */}
        <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          {examModel.contentType === 'PDF' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-bold text-slate-800 truncate">{examModel.pdfFileName || 'نموذج PDF'}</p>
                  <p className="text-[11px] text-slate-400">{examModel.pdfFileSize || 'مستند PDF'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPreview(examModel)}
                className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-white transition-colors"
                title="معاينة الملف"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}

          {examModel.contentType === 'IMAGE' && (
            <div className="relative h-28 rounded-xl overflow-hidden bg-slate-200 group/img cursor-pointer" onClick={() => onPreview(examModel)}>
              {examModel.imageUrl ? (
                <img src={examModel.imageUrl} alt={examModel.title} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <FileImage className="w-8 h-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                <Eye className="w-4 h-4" /> معاينة الصورة
              </div>
            </div>
          )}

          {examModel.contentType === 'MARKDOWN' && (
            <div className="space-y-1 cursor-pointer" onClick={() => onPreview(examModel)}>
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <Sparkles className="w-3.5 h-3.5" /> نص وتنسيق كامل
                </span>
                <span className="text-slate-400">انقر للمعاينة</span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono bg-white p-2 rounded-lg border border-slate-100 line-clamp-2">
                {examModel.markdownContent || 'لا يوجد محتوى نصي...'}
              </p>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="space-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 truncate max-w-[60%]">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{examModel.courseName || `مقرر (${examModel.courseId})`}</span>
            </span>
            {examModel.moduleTitle && (
              <span className="flex items-center gap-1 text-slate-500 truncate max-w-[40%]" title={examModel.moduleTitle}>
                <FolderOpen className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span className="truncate">{examModel.moduleTitle}</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-slate-400 font-medium pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {examModel.semester} ({examModel.academicYear})
            </span>
            <span>{new Date(examModel.createdAt).toLocaleDateString('ar-SA')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onPreview(examModel)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-bold transition-colors border border-slate-200 hover:border-emerald-200"
          >
            <Eye className="w-4 h-4" /> معاينة
          </button>
          <button
            type="button"
            onClick={() => onEdit(examModel)}
            className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 hover:border-blue-200"
            title="تعديل النموذج"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(examModel.id)}
            className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors border border-slate-200 hover:border-red-200"
            title="حذف النموذج"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
