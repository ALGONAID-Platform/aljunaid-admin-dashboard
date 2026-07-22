import { X, FileText, Download, Calendar, BookOpen, GraduationCap } from 'lucide-react';
import type { ExamModel } from '../../../types/examModel.types';

interface ExamModelPreviewModalProps {
  isOpen: boolean;
  examModel: ExamModel | null;
  onClose: () => void;
}

export function ExamModelPreviewModal({
  isOpen,
  examModel,
  onClose,
}: ExamModelPreviewModalProps) {
  if (!isOpen || !examModel) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md transition-all">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-250 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-red-50 text-red-600`}>
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border bg-red-50 text-red-600`}>
                  ملف PDF
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 truncate" title={examModel.title}>
                {examModel.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview Container */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">المقرر الدراسي:</span>
                <span className="font-bold text-slate-800 truncate">{examModel.courseName || `مقرر (${examModel.courseId})`}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">المرحلة الدراسية:</span>
                <span className="font-bold text-slate-800 truncate">{examModel.grade || 'غير محدد'}</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100">
            <p className="font-bold text-slate-800 text-xs mb-1">وصف النموذج والتعليمات:</p>
            <p>{examModel.description}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">مستند PDF</p>
                </div>
              </div>
              {examModel.pdfUrl && (
                <a
                  href={examModel.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> تحميل PDF
                </a>
              )}
            </div>

            {examModel.pdfUrl ? (
              <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <iframe
                  src={examModel.pdfUrl}
                  title={examModel.title}
                  className="w-full h-full border-none"
                />
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                لم يتم إضافة رابط PDF مباشر بعد
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
