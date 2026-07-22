import { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Edit3, Loader2, AlertCircle, FileText, Upload, Link as LinkIcon
} from 'lucide-react';
import { useCoursesStore } from '../../../store';
import { examModelSchema, type ExamModelFormValues } from '../../../utils/validation.schemas';
import type { 
  ExamModel, 
  CreateExamModelPayload 
} from '../../../types/examModel.types';

interface ExamModelFormModalProps {
  isOpen: boolean;
  editingModel?: ExamModel | null;
  defaultCourseId?: string;
  onClose: () => void;
  onSave: (payload: CreateExamModelPayload & { id?: string }) => Promise<void>;
}

export function ExamModelFormModal({
  isOpen,
  editingModel,
  defaultCourseId,
  onClose,
  onSave,
}: ExamModelFormModalProps) {
  const { courses } = useCoursesStore();

  const [form, setForm] = useState<ExamModelFormValues>({
    courseId: defaultCourseId || '',
    title: '',
    description: '',
    pdfUrl: '',
    grade: '',
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const pdfFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingModel) {
      setForm({
        courseId: editingModel.courseId ? String(editingModel.courseId) : '',
        title: editingModel.title,
        description: editingModel.description || '',
        pdfUrl: editingModel.pdfUrl || '',
        grade: editingModel.grade || '',
      });
    } else {
      setForm({
        courseId: defaultCourseId || (courses.length > 0 ? String(courses[0].id) : ''),
        title: '',
        description: '',
        pdfUrl: '',
        grade: '',
      });
      setPdfFile(null);
    }
    setErrors({});
    setSubmitSuccess(false);
  }, [editingModel, defaultCourseId, courses, isOpen]);

  const handlePdfFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setErrors((prev) => ({ ...prev, pdfUrl: 'يرجى اختيار ملف بصيغة PDF فقط' }));
      return;
    }
    setPdfFile(file);
    setForm((p) => ({ ...p, pdfUrl: file.name }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.pdfUrl;
      return copy;
    });
  };

  const validate = (): boolean => {
    const result = examModelSchema.safeParse(form);
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const pathKey = issue.path[0] as string;
        if (!formattedErrors[pathKey]) {
          formattedErrors[pathKey] = issue.message;
        }
      });
      setErrors(formattedErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: CreateExamModelPayload & { id?: string } = {
        id: editingModel ? String(editingModel.id) : undefined,
        courseId: form.courseId,
        title: form.title,
        description: form.description,
        pdfUrl: form.pdfUrl,
        pdfFile: pdfFile,
        grade: form.grade,
      };

      await onSave(payload);
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 600);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrors((prev) => ({
        ...prev,
        submit: err?.message || 'حدث خطأ أثناء حفظ النموذج. يرجى المحاولة لاحقاً.',
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all">
      <div 
        role="dialog" 
        aria-modal="true" 
        className="bg-white w-full h-full sm:max-h-[92vh] sm:max-w-2xl rounded-none sm:rounded-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              {editingModel ? <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />}
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-800">
                {editingModel ? 'تعديل نموذج الامتحان' : 'إنشاء نموذج امتحان جديد'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                نماذج PDF تطبيقية للمقررات
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-100 touch-target shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {errors.submit && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المقرر الدراسي
                </label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm(p => ({ ...p, courseId: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">-- كافّة المقررات --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">المرحلة الدراسية (Grade)</label>
                <input
                  type="text"
                  value={form.grade || ''}
                  onChange={(e) => setForm(p => ({ ...p, grade: e.target.value }))}
                  placeholder="مثال: الصف الأول الثانوي"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان نموذج الامتحان <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm((p) => ({ ...p, title: e.target.value }));
                  setErrors((prev) => { const copy = { ...prev }; delete copy.title; return copy; });
                }}
                placeholder="مثال: نموذج الامتحان النصفي الشامل"
                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-semibold outline-none transition-all ${
                  errors.title ? 'border-red-300 bg-red-50/50' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              {errors.title && <p className="text-[11px] font-bold text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الوصف والتعليمات
              </label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="نبذة عن الأسئلة المضمنة، أو إرشادات الطالب..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none resize-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-4 p-5 bg-red-50/30 rounded-2xl border border-red-100">
            <div className="flex items-center text-xs font-bold text-red-800 gap-1.5">
              <FileText className="w-4 h-4 text-red-600" /> إرفاق ملف PDF للنموذج <span className="text-red-500">*</span>
            </div>

            <div
              className="border-2 border-dashed border-red-200 hover:border-red-400 rounded-2xl p-6 text-center cursor-pointer bg-white transition-all group"
              onClick={() => pdfFileRef.current?.click()}
            >
              <input
                type="file"
                ref={pdfFileRef}
                className="hidden"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfFileSelect(file);
                }}
              />
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">اضغط لرفع ملف PDF من جهازك</p>
              <p className="text-xs text-slate-400 mt-1">الحد الأقصى للملف 10MB</p>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-400">أو إرفاق عبر رابط</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div>
              <div className="relative">
                <LinkIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={form.pdfUrl || ''}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, pdfUrl: e.target.value }));
                    setErrors((prev) => { const copy = { ...prev }; delete copy.pdfUrl; return copy; });
                    if (e.target.value) setPdfFile(null);
                  }}
                  placeholder="https://example.com/exam.pdf"
                  className={`w-full pr-10 pl-4 py-3 bg-white border rounded-xl text-sm font-semibold outline-none transition-all text-left dir-ltr ${
                    errors.pdfUrl ? 'border-red-300 bg-red-50/50' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
              </div>
              {errors.pdfUrl && <p className="text-[11px] font-bold text-red-500 mt-1">{errors.pdfUrl}</p>}
            </div>
            
            {pdfFile && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800 line-clamp-1 truncate max-w-[200px]" dir="ltr">
                    {pdfFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPdfFile(null);
                    setForm(p => ({ ...p, pdfUrl: '' }));
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-700 bg-white px-2 py-1 rounded-lg border border-red-100"
                >
                  إزالة
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all"
            disabled={isSubmitting}
          >
            إلغاء
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || submitSuccess}
            className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : submitSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                تم الحفظ بنجاح
              </>
            ) : (
              'حفظ التغييرات'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
