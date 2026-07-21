import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Plus, Edit3, Loader2, CheckCircle, AlertCircle, FileText, 
  FileImage, FileCode, Upload, Link as LinkIcon, Trash2, Eye, HelpCircle
} from 'lucide-react';
import { useCoursesStore, useModulesStore } from '../../../store';
import { examModelSchema, type ExamModelFormValues } from '../../../utils/validation.schemas';
import type { 
  ExamModel, 
  ExamModelCategory, 
  ExamModelContentType, 
  CreateExamModelPayload 
} from '../../../types/examModel.types';

interface ExamModelFormModalProps {
  isOpen: boolean;
  editingModel?: ExamModel | null;
  defaultCourseId?: string;
  defaultModuleId?: string;
  onClose: () => void;
  onSave: (payload: CreateExamModelPayload & { id?: string }) => Promise<void>;
}

export function ExamModelFormModal({
  isOpen,
  editingModel,
  defaultCourseId,
  defaultModuleId,
  onClose,
  onSave,
}: ExamModelFormModalProps) {
  const { courses } = useCoursesStore();
  const { modules } = useModulesStore();

  const [form, setForm] = useState<ExamModelFormValues>({
    courseId: defaultCourseId || '',
    moduleId: defaultModuleId || '',
    title: '',
    description: '',
    category: 'MIDTERM',
    contentType: 'PDF',
    pdfUrl: '',
    imageUrl: '',
    markdownContent: '',
    semester: 'الفصل الأول',
    academicYear: '2025/2026',
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [markdownActiveTab, setMarkdownActiveTab] = useState<'write' | 'preview'>('write');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const pdfFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);

  // Filter modules by selected course
  const availableModules = modules.filter(
    (m) => String(m.courseId) === String(form.courseId)
  );

  useEffect(() => {
    if (editingModel) {
      setForm({
        courseId: String(editingModel.courseId),
        moduleId: editingModel.moduleId ? String(editingModel.moduleId) : '',
        title: editingModel.title,
        description: editingModel.description,
        category: editingModel.category,
        contentType: editingModel.contentType,
        pdfUrl: editingModel.pdfUrl || '',
        imageUrl: editingModel.imageUrl || '',
        markdownContent: editingModel.markdownContent || '',
        semester: editingModel.semester || 'الفصل الأول',
        academicYear: editingModel.academicYear || '2025/2026',
      });
      if (editingModel.imageUrl) {
        setImagePreviewUrl(editingModel.imageUrl);
      }
    } else {
      setForm({
        courseId: defaultCourseId || (courses.length > 0 ? String(courses[0].id) : ''),
        moduleId: defaultModuleId || '',
        title: '',
        description: '',
        category: 'MIDTERM',
        contentType: 'PDF',
        pdfUrl: '',
        imageUrl: '',
        markdownContent: '',
        semester: 'الفصل الأول',
        academicYear: '2025/2026',
      });
      setPdfFile(null);
      setImageFile(null);
      setImagePreviewUrl(null);
    }
    setErrors({});
    setSubmitSuccess(false);
  }, [editingModel, defaultCourseId, defaultModuleId, courses, isOpen]);

  const handleCourseChange = (newCourseId: string) => {
    setForm((p) => ({
      ...p,
      courseId: newCourseId,
      moduleId: '', // Reset module when course changes
    }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.courseId;
      return copy;
    });
  };

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

  const handleImageFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, imageUrl: 'يرجى اختيار صورة صالحة (PNG, JPG, WEBP)' }));
      return;
    }
    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
    setForm((p) => ({ ...p, imageUrl: file.name }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.imageUrl;
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
      const selectedCourse = courses.find((c) => String(c.id) === String(form.courseId));
      const selectedModule = availableModules.find((m) => String(m.id) === String(form.moduleId));

      const payload: CreateExamModelPayload & { id?: string } = {
        id: editingModel ? String(editingModel.id) : undefined,
        courseId: form.courseId,
        courseName: selectedCourse ? selectedCourse.name : undefined,
        moduleId: form.moduleId || null,
        moduleTitle: selectedModule ? selectedModule.title : null,
        title: form.title,
        description: form.description,
        category: form.category as ExamModelCategory,
        contentType: form.contentType as ExamModelContentType,
        pdfUrl: form.contentType === 'PDF' ? form.pdfUrl : null,
        pdfFile: form.contentType === 'PDF' ? pdfFile : null,
        imageUrl: form.contentType === 'IMAGE' ? (imagePreviewUrl || form.imageUrl) : null,
        imageFile: form.contentType === 'IMAGE' ? imageFile : null,
        markdownContent: form.contentType === 'MARKDOWN' ? form.markdownContent : null,
        semester: form.semester,
        academicYear: form.academicYear,
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
        submit: err?.message || 'حدث خطأ أثناء حفظ نموذج الامتحان. يرجى المحاولة لاحقاً.',
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all">
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-6 duration-300"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white rounded-t-[2.5rem] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              {editingModel ? <Edit3 className="w-6 h-6" /> : <Plus className="w-6 h-6" strokeWidth={2.5} />}
            </div>
            <div>
              <h3 id="modal-title" className="text-xl font-bold text-slate-800">
                {editingModel ? 'تعديل نموذج الامتحان' : 'إنشاء نموذج امتحان جديد'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                نماذج مستقلة للمقررات والوحدات الدراسية (PDF / صورة / Markdown)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-100"
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

          {/* Section 1: Basic Information */}
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 relative">
            <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-100 text-xs font-bold text-emerald-600 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              البيانات الأساسية والتصنيف
            </div>

            {/* Course & Module Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المقرر الدراسي <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-semibold outline-none transition-all ${
                    errors.courseId ? 'border-red-300 bg-red-50/50' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                >
                  <option value="">-- اختر المقرر الدراسي --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.courseId && <p className="text-[11px] font-bold text-red-500 mt-1">{errors.courseId}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الوحدة الدراسية <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <select
                  value={form.moduleId || ''}
                  onChange={(e) => setForm((p) => ({ ...p, moduleId: e.target.value }))}
                  disabled={!form.courseId || availableModules.length === 0}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100 transition-all"
                >
                  <option value="">-- كافّة الوحدات / غير مرتبطة بوحدة --</option>
                  {availableModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">النموذج يتبع المقرر مباشرة إذا لم تشر لوحدة.</p>
              </div>
            </div>

            {/* Title & Description */}
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
                placeholder="مثال: نموذج الامتحان النصفي الشامل لمادة فقه العبادات"
                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-semibold outline-none transition-all ${
                  errors.title ? 'border-red-300 bg-red-50/50' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              {errors.title && <p className="text-[11px] font-bold text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                وصف عن النموذج والتعليمات <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => {
                  setForm((p) => ({ ...p, description: e.target.value }));
                  setErrors((prev) => { const copy = { ...prev }; delete copy.description; return copy; });
                }}
                placeholder="نبذة عن الأسئلة المضمنة، الوقت المقترح للحفظ، أو إرشادات الطالب..."
                rows={3}
                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium outline-none resize-none transition-all ${
                  errors.description ? 'border-red-300 bg-red-50/50' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              {errors.description && <p className="text-[11px] font-bold text-red-500 mt-1">{errors.description}</p>}
            </div>

            {/* Category, Semester, Academic Year */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  تصنيف الامتحان <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ExamModelCategory }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="MIDTERM">اختبار نصف الفصل (Midterm)</option>
                  <option value="FINAL">امتحان نهائي (Final)</option>
                  <option value="QUIZ">اختبار قصير (Quiz)</option>
                  <option value="PRACTICE">تمارين وتطبيقات (Practice)</option>
                  <option value="PREVIOUS_EXAM">أسئلة سنوات سابقة (Previous)</option>
                  <option value="ASSIGNMENT">واجب دراسي (Assignment)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الفصل الدراسي</label>
                <input
                  type="text"
                  value={form.semester}
                  onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}
                  placeholder="الفصل الأول"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">العام الدراسي</label>
                <input
                  type="text"
                  value={form.academicYear}
                  onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                  placeholder="2025/2026"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: MUTUALLY EXCLUSIVE Content Type Selector */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 relative">
            <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              مصدر المحتوى التعليمي (نوع واحد فقط)
            </div>

            {/* Type Selector Tabs */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, contentType: 'PDF' }))}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                  form.contentType === 'PDF'
                    ? 'border-red-500 bg-red-50/60 ring-2 ring-red-500/20 text-red-700 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className={`w-6 h-6 ${form.contentType === 'PDF' ? 'text-red-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">ملف PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, contentType: 'IMAGE' }))}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                  form.contentType === 'IMAGE'
                    ? 'border-cyan-500 bg-cyan-50/60 ring-2 ring-cyan-500/20 text-cyan-700 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileImage className={`w-6 h-6 ${form.contentType === 'IMAGE' ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">صورة نموذج</span>
              </button>

              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, contentType: 'MARKDOWN' }))}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                  form.contentType === 'MARKDOWN'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-700 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileCode className={`w-6 h-6 ${form.contentType === 'MARKDOWN' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">محتوى Markdown</span>
              </button>
            </div>

            {/* DYNAMIC MUTUALLY EXCLUSIVE INPUT PANELS */}

            {/* PANEL 1: PDF INPUT ONLY */}
            {form.contentType === 'PDF' && (
              <div className="space-y-4 p-5 bg-red-50/30 rounded-2xl border border-red-100 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-red-800">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-red-600" /> إرفاق ملف PDF للنموذج
                  </span>
                  <span className="text-[11px] text-red-500">ملاحظة: تم إخفاء خيارات الصور وMarkdown</span>
                </div>

                <div
                  className="border-2 border-dashed border-red-200 hover:border-red-400 rounded-2xl p-6 text-center cursor-pointer bg-white transition-all group"
                  onClick={() => pdfFileRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-red-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-700">اضغط لرفع ملف PDF من جهازك</p>
                  <p className="text-[11px] text-slate-400 mt-1">الحد الأقصى للملف 25 ميجابايت</p>
                  <input
                    ref={pdfFileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfFileSelect(f);
                    }}
                  />
                </div>

                {pdfFile && (
                  <div className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-700 font-bold truncate">
                      <FileText className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="truncate">{pdfFile.name}</span>
                      <span className="text-[10px] text-slate-400">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPdfFile(null); setForm((p) => ({ ...p, pdfUrl: '' })); }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="relative">
                  <span className="text-xs font-bold text-slate-500 mb-1 block">أو أدخل رابط ملف PDF مباشر:</span>
                  <div className="relative">
                    <LinkIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      value={form.pdfUrl || ''}
                      onChange={(e) => setForm((p) => ({ ...p, pdfUrl: e.target.value }))}
                      placeholder="https://example.com/exams/model_2025.pdf"
                      dir="ltr"
                      className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-red-500"
                    />
                  </div>
                </div>
                {errors.pdfUrl && <p className="text-[11px] font-bold text-red-500">{errors.pdfUrl}</p>}
              </div>
            )}

            {/* PANEL 2: IMAGE INPUT ONLY */}
            {form.contentType === 'IMAGE' && (
              <div className="space-y-4 p-5 bg-cyan-50/30 rounded-2xl border border-cyan-100 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-800">
                  <span className="flex items-center gap-1.5">
                    <FileImage className="w-4 h-4 text-cyan-600" /> إرفاق صورة عالية الدقة للنموذج
                  </span>
                  <span className="text-[11px] text-cyan-600">ملاحظة: تم إخفاء خيارات PDF وMarkdown</span>
                </div>

                {imagePreviewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-cyan-200 bg-white group h-48">
                    <img src={imagePreviewUrl} alt="معاينة نموذج الامتحان" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => imageFileRef.current?.click()}
                        className="px-3 py-1.5 bg-white text-cyan-700 rounded-xl text-xs font-bold shadow-md hover:bg-cyan-50"
                      >
                        تغيير الصورة
                      </button>
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreviewUrl(null); setForm((p) => ({ ...p, imageUrl: '' })); }}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-red-600"
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-cyan-200 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-white transition-all group"
                    onClick={() => imageFileRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-slate-700">اضغط لرفع صورة من جهازك</p>
                    <p className="text-[11px] text-slate-400 mt-1">الصيغ المدعومة: PNG, JPG, WEBP</p>
                  </div>
                )}
                <input
                  ref={imageFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageFileSelect(f);
                  }}
                />

                <div className="relative">
                  <span className="text-xs font-bold text-slate-500 mb-1 block">أو أدخل رابط صورة مباشر:</span>
                  <div className="relative">
                    <LinkIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      value={form.imageUrl || ''}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, imageUrl: e.target.value }));
                        setImagePreviewUrl(e.target.value);
                      }}
                      placeholder="https://example.com/images/exam_board.jpg"
                      dir="ltr"
                      className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                {errors.imageUrl && <p className="text-[11px] font-bold text-red-500">{errors.imageUrl}</p>}
              </div>
            )}

            {/* PANEL 3: MARKDOWN INPUT ONLY */}
            {form.contentType === 'MARKDOWN' && (
              <div className="space-y-3 p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-emerald-600" /> تحرير محتوى أسئلة الامتحان بنسق Markdown
                  </span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setMarkdownActiveTab('write')}
                      className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                        markdownActiveTab === 'write' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      كتابة
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarkdownActiveTab('preview')}
                      className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                        markdownActiveTab === 'preview' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      معاينة
                    </button>
                  </div>
                </div>

                {markdownActiveTab === 'write' ? (
                  <textarea
                    value={form.markdownContent || ''}
                    onChange={(e) => setForm((p) => ({ ...p, markdownContent: e.target.value }))}
                    placeholder="# عنوان نموذج الامتحان\n\n## السؤال الأول:\nاكتب نص السؤال هنا...\n\n* الخيار الأول\n* الخيار الثاني"
                    rows={8}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs font-mono leading-relaxed outline-none focus:border-emerald-500 resize-none"
                    dir="rtl"
                  />
                ) : (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs min-h-[200px] overflow-y-auto max-h-[300px] font-sans leading-relaxed space-y-2">
                    <p className="text-[11px] text-emerald-600 font-bold border-b border-emerald-100 pb-2">معاينة نصية لمحتوى المقال:</p>
                    <div className="whitespace-pre-wrap font-mono text-slate-800">
                      {form.markdownContent || 'لا يوجد محتوى معاينة بعد...'}
                    </div>
                  </div>
                )}
                {errors.markdownContent && <p className="text-[11px] font-bold text-red-500">{errors.markdownContent}</p>}
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2.5rem] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-slate-600 font-bold text-sm rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-all"
          >
            إلغاء الأمر
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || submitSuccess}
            className="px-8 py-3 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> جاري حفظ النموذج...
              </>
            ) : submitSuccess ? (
              <>
                <CheckCircle className="w-5 h-5 animate-bounce" /> تم الاعتماد!
              </>
            ) : editingModel ? (
              <>
                <Edit3 className="w-5 h-5" /> حفظ التعديلات
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" strokeWidth={2.5} /> إنشاء نموذج الامتحان
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
