import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, BookOpen, X, CheckCircle, AlertCircle, ImageIcon, Link,
  Upload, Loader2, Edit3, Trash2, RefreshCw, Wifi, FileWarning
} from 'lucide-react';
import { useCoursesStore } from '../../../store';
import { validateImageFile, classifyUploadError, type UploadProgress, type UploadError } from '../../../services/api/upload.api';
import { Loader } from '../../../components/feedback/Loader';
import { EmptyState } from '../../../components/feedback/EmptyState';
import type { Course, EducationalLevel } from '../../../types';
import { EDUCATIONAL_LEVELS } from '../../../types';

const LEVELS = Object.keys(EDUCATIONAL_LEVELS) as EducationalLevel[];

interface FormState {
  name: string;
  description: string;
  level: EducationalLevel | '';
  thumbnailUrl: string;
  thumbnailFile: File | null;
}

type FormError = Partial<Record<keyof FormState | 'submit', string>>;
type SaveStatus = 'idle' | 'uploading' | 'loading' | 'success' | 'error';

function UploadErrorBanner({ error, onRetry }: { error: UploadError; onRetry?: () => void }) {
  const icons: Record<UploadError['type'], React.ElementType> = {
    size: FileWarning,
    format: FileWarning,
    network: Wifi,
    server: AlertCircle,
    unknown: AlertCircle,
  };
  const Icon = icons[error.type];
  return (
    <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p style={{ fontSize: 13, fontWeight: 600 }}>{error.message}</p>
        {error.type === 'size' && (
          <p style={{ fontSize: 12, marginTop: 2, color: '#9B1C1C' }}>
            الحد الأقصى المسموح: {(error as { maxMB: number }).maxMB} MB
          </p>
        )}
        {error.type === 'format' && (
          <p style={{ fontSize: 12, marginTop: 2, color: '#9B1C1C' }}>
            الصيغ المدعومة: {(error as { allowed: string[] }).allowed.join(', ')}
          </p>
        )}
      </div>
      {onRetry && (error.type === 'network' || error.type === 'server') && (
        <button onClick={onRetry} className="flex items-center gap-1 px-2 py-1 bg-red-100 rounded-lg hover:bg-red-200 transition-colors flex-shrink-0" style={{ fontSize: 12, fontWeight: 600 }}>
          <RefreshCw className="w-3 h-3" /> إعادة المحاولة
        </button>
      )}
    </div>
  );
}

function ProgressBar({ progress }: { progress: UploadProgress }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between" style={{ fontSize: 12 }}>
        <span className="text-blue-600">جارٍ رفع الصورة...</span>
        <span className="text-blue-600 font-semibold">{progress.percent}%</span>
      </div>
      <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress.percent}%`, background: 'linear-gradient(90deg, #3B82F6, #0D9488)' }}
        />
      </div>
      <p style={{ fontSize: 11, color: '#6B7280' }}>
        {(progress.loaded / 1024 / 1024).toFixed(1)} MB / {(progress.total / 1024 / 1024).toFixed(1)} MB
      </p>
    </div>
  );
}

export function CoursesPage() {
  const { courses, addCourse, updateCourse, deleteCourse, fetchCourses, isLoading, error } = useCoursesStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => { void fetchCourses(); }, [fetchCourses]);

  const [form, setForm] = useState<FormState>({ name: '', description: '', level: '', thumbnailUrl: '', thumbnailFile: null });
  const [errors, setErrors] = useState<FormError>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetModal = useCallback(() => {
    setForm({ name: '', description: '', level: '', thumbnailUrl: '', thumbnailFile: null });
    setErrors({});
    setSaveStatus('idle');
    setUploadError(null);
    setUploadProgress(null);
    setPreviewUrl(null);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const openCreate = () => { resetModal(); setShowModal(true); };
  const openEdit = (course: Course) => {
    resetModal();
    setEditingId(course.id);
    setForm({ name: course.name, description: course.description, level: course.level, thumbnailUrl: course.imagePreview || '', thumbnailFile: null });
    if (course.imagePreview) setPreviewUrl(course.imagePreview);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); resetModal(); };

  const validate = (): boolean => {
    const e: FormError = {};
    if (!form.name.trim()) e.name = 'اسم المقرر مطلوب';
    else if (!editingId && courses.some(c => c.name === form.name.trim())) e.name = 'اسم المقرر موجود مسبقاً';
    if (!form.description.trim()) e.description = 'وصف المقرر مطلوب';
    if (!form.level) e.level = 'يرجى اختيار المستوى التعليمي';
    if (!form.thumbnailFile && form.thumbnailUrl && !form.thumbnailUrl.startsWith('http')) {
      e.thumbnailUrl = 'الرابط غير صالح. يجب أن يبدأ بـ https://';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = useCallback(async () => {
    if (!validate() || !form.level) return;
    setSaveStatus('loading');
    setUploadError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        level: form.level,
        imagePreview: form.thumbnailUrl.trim().startsWith('http') ? form.thumbnailUrl.trim() : undefined,
        imageFile: form.thumbnailFile ?? undefined,
      };

      if (editingId) {
        await updateCourse({ id: editingId, ...payload });
      } else {
        await addCourse(payload);
      }
      setSaveStatus('success');
      setTimeout(closeModal, 1200);
    } catch (err) {
      setSaveStatus('error');
      const classified = classifyUploadError(err);
      if (form.thumbnailFile && (classified.type === 'size' || classified.type === 'format' || classified.type === 'server')) {
        setUploadError(classified);
      } else {
        setErrors(prev => ({ ...prev, submit: 'فشل حفظ البيانات. يرجى المحاولة مرة أخرى' }));
      }
    }
  }, [form, editingId, validate, updateCourse, addCourse, closeModal]);

  const handleFileSelect = (file: File) => {
    const validationErr = validateImageFile(file);
    if (validationErr) {
      setUploadError(validationErr);
      return;
    }
    setUploadError(null);
    setForm(p => ({ ...p, thumbnailFile: file, thumbnailUrl: '' }));
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    setDeleteStatus('loading');
    try {
      await deleteCourse(id);
      setDeleteConfirm(null);
      setDeleteStatus('idle');
    } catch {
      setDeleteStatus('error');
    }
  };

  const isFormValid = form.name.trim() && form.description.trim() && form.level;

  if (isLoading && courses.length === 0) return <Loader fullPage />;

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-800" style={{ fontSize: 20, fontWeight: 700 }}>إدارة المقررات</h2>
          <p className="text-slate-400" style={{ fontSize: 13 }}>{courses.length} مقرر مسجّل في المنصة</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all shadow-md"
          style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', fontSize: 14, fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />إنشاء مقرر جديد
        </button>
      </div>

      {error && courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center shadow-sm flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-slate-800 mb-2" style={{ fontSize: 18, fontWeight: 700 }}>فشل تحميل المقررات</h3>
          <p className="text-slate-500 mb-6" style={{ fontSize: 14 }}>{error}</p>
          <button onClick={() => void fetchCourses()} className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
            إعادة المحاولة
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={BookOpen}
            title="لا توجد مقررات بعد"
            description="ابدأ بإنشاء أول مقرر في منصتك"
            action={
              <button onClick={openCreate} className="px-5 py-2.5 text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14, fontWeight: 600 }}>
                إنشاء مقرر
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={() => openEdit(course)}
              onDelete={() => setDeleteConfirm(course.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-slate-800 mb-2" style={{ fontSize: 17, fontWeight: 700 }}>حذف المقرر</h3>
            <p className="text-slate-500 mb-2" style={{ fontSize: 14 }}>
              هل أنت متأكد من حذف مقرر "{courses.find(c => c.id === deleteConfirm)?.name}"؟
            </p>
            <p className="text-red-500 mb-6" style={{ fontSize: 12 }}>هذا الإجراء لا يمكن التراجع عنه وسيحذف جميع الدروس والمحتوى المرتبط.</p>
            {deleteStatus === 'error' && (
              <p className="text-red-600 mb-4" style={{ fontSize: 13 }}>فشل الحذف. يرجى المحاولة مرة أخرى.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteStatus === 'loading'}
                className="flex-1 py-2.5 text-white rounded-xl bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                {deleteStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleteStatus === 'loading' ? 'جارٍ الحذف...' : 'حذف المقرر'}
              </button>
              <button onClick={() => { setDeleteConfirm(null); setDeleteStatus('idle'); }} className="flex-1 py-2.5 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors" style={{ fontSize: 14 }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-slate-800" style={{ fontSize: 17, fontWeight: 700 }}>
                {editingId ? 'تعديل المقرر' : 'إنشاء مقرر جديد'}
              </h3>
              <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {errors.submit && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span style={{ fontSize: 13 }}>{errors.submit}</span>
                </div>
              )}

              {uploadError && (
                <UploadErrorBanner
                  error={uploadError}
                  onRetry={() => { setUploadError(null); setSaveStatus('idle'); }}
                />
              )}

              <Field label="اسم المقرر" required error={errors.name}>
                <input
                  value={form.name}
                  onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => { const x = { ...p }; delete x.name; return x; }); }}
                  placeholder="مثال: أساسيات علم الحاسب"
                  className={inputCls(!!errors.name)}
                />
              </Field>

              <Field label="وصف المقرر" required error={errors.description}>
                <textarea
                  value={form.description}
                  onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => { const x = { ...p }; delete x.description; return x; }); }}
                  placeholder="اكتب وصفاً مختصراً للمقرر..."
                  rows={3}
                  className={`${inputCls(!!errors.description)} resize-none`}
                />
              </Field>

              <Field label="المستوى التعليمي" required error={errors.level}>
                <select
                  value={form.level}
                  onChange={e => { setForm(p => ({ ...p, level: e.target.value as EducationalLevel })); setErrors(p => { const x = { ...p }; delete x.level; return x; }); }}
                  className={inputCls(!!errors.level)}
                >
                  <option value="">اختر المستوى...</option>
                  {LEVELS.map(l => <option key={l} value={l}>{EDUCATIONAL_LEVELS[l]}</option>)}
                </select>
              </Field>

              <Field label="صورة المقرر (اختياري)" error={errors.thumbnailUrl}>
                {(previewUrl || (form.thumbnailUrl && form.thumbnailUrl.startsWith('http'))) && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-slate-200 relative" style={{ height: 120 }}>
                    <img src={previewUrl || form.thumbnailUrl} alt="معاينة" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <button type="button" onClick={() => { setPreviewUrl(null); setForm(p => ({ ...p, thumbnailFile: null, thumbnailUrl: '' })); setUploadError(null); if (fileRef.current) fileRef.current.value = ''; }} className="absolute top-2 left-2 p-1 bg-white rounded-full shadow text-slate-500 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {uploadProgress && saveStatus === 'uploading' && <ProgressBar progress={uploadProgress} />}

                <div
                  className="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer hover:border-emerald-400 transition-all mb-2"
                  style={{ borderColor: '#E2E8F0' }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                >
                  <Upload className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                  <p className="text-slate-400" style={{ fontSize: 12 }}>اضغط لرفع صورة أو اسحب وأفلت — JPG, PNG, WebP (5MB)</p>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-slate-400" style={{ fontSize: 11 }}>أو أدخل رابطاً</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="relative">
                  <Link className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={form.thumbnailFile ? '' : form.thumbnailUrl}
                    onChange={e => { setForm(p => ({ ...p, thumbnailUrl: e.target.value, thumbnailFile: null })); setPreviewUrl(null); setUploadError(null); }}
                    placeholder="https://example.com/image.jpg"
                    className={`${inputCls(!!errors.thumbnailUrl)} pr-10`}
                    style={{ direction: 'ltr', textAlign: 'left' }}
                    disabled={!!form.thumbnailFile}
                  />
                </div>
              </Field>
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={handleSave}
                disabled={!isFormValid || saveStatus === 'loading' || saveStatus === 'uploading' || saveStatus === 'success'}
                className="flex-1 py-3 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14, fontWeight: 600 }}
              >
                {(saveStatus === 'loading' || saveStatus === 'uploading') && <Loader2 className="w-4 h-4 animate-spin" />}
                {saveStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                {saveStatus === 'loading' || saveStatus === 'uploading' ? 'جارٍ الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : editingId ? 'حفظ التعديلات' : 'حفظ المقرر'}
              </button>
              <button onClick={closeModal} className="px-4 py-3 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" style={{ fontSize: 14, fontWeight: 500 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, onEdit, onDelete }: { course: Course; onEdit: () => void; onDelete: () => void }) {
  const levelColors: Record<string, { bg: string; text: string }> = {
    'SECONDARY': { bg: '#ECFDF5', text: '#059669' },
    'DIPLOMA': { bg: '#FFF7ED', text: '#D97706' },
    'UNIVERSITY_LEVEL_1': { bg: '#F5F3FF', text: '#7C3AED' },
    'UNIVERSITY_LEVEL_2': { bg: '#EFF6FF', text: '#2563EB' },
    'UNIVERSITY_LEVEL_3': { bg: '#FEF2F2', text: '#DC2626' },
    'UNIVERSITY_LEVEL_4': { bg: '#FDF4FF', text: '#C026D3' },
  };
  const lc = levelColors[course.level] ?? { bg: '#F1F5F9', text: '#64748B' };
  const levelText = EDUCATIONAL_LEVELS[course.level] ?? course.level;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
      {course.imagePreview ? (
        <img src={course.imagePreview} alt={course.name} className="w-full object-cover bg-slate-100" style={{ height: 140 }} onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/ECFDF5/10B981?text=Course'; }} />
      ) : (
        <div className="w-full flex items-center justify-center" style={{ height: 140, background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}>
          <BookOpen className="w-10 h-10 text-emerald-300" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-slate-800" style={{ fontSize: 15, fontWeight: 600 }}>{course.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: lc.bg, color: lc.text }}>{levelText}</span>
        </div>
        <p className="text-slate-400 mb-3 line-clamp-2" style={{ fontSize: 13 }}>{course.description}</p>
        <div className="flex items-center justify-between text-slate-400" style={{ fontSize: 12 }}>
          <span>{course.lessonsCount} درس</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-slate-700 mb-1.5" style={{ fontSize: 14, fontWeight: 500 }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 mt-1" style={{ fontSize: 12 }}>{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-3.5 py-2.5 rounded-xl border outline-none transition-all ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'}`;
}
