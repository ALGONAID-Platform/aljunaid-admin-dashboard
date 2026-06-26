import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, BookOpen, X, CheckCircle, AlertCircle, Image as ImageIcon, Link as LinkIcon,
  Upload, Loader2, Edit3, Trash2, RefreshCw, FileWarning, Search, Filter, BookOpenCheck, Wifi
} from 'lucide-react';
import { useCoursesStore } from '../../../store';
import { validateImageFile, classifyUploadError, type UploadProgress, type UploadError } from '../../../services/api/upload.api';
import { Loader } from '../../../components/feedback/Loader';
import { EmptyState } from '../../../components/feedback/EmptyState';
import type { Course } from '../../../types';

interface FormState {
  name: string;
  description: string;
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
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 shadow-sm transition-all animate-in fade-in slide-in-from-top-4">
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-bold">{error.message}</p>
        {error.type === 'size' && (
          <p className="text-xs mt-1 text-red-800">
            الحد الأقصى المسموح: {(error as { maxMB: number }).maxMB} MB
          </p>
        )}
        {error.type === 'format' && (
          <p className="text-xs mt-1 text-red-800">
            الصيغ المدعومة: {(error as { allowed: string[] }).allowed.join(', ')}
          </p>
        )}
      </div>
      {onRetry && (error.type === 'network' || error.type === 'server') && (
        <button onClick={onRetry} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 rounded-xl hover:bg-red-50 transition-colors flex-shrink-0 text-xs font-bold border border-red-200 shadow-sm">
          <RefreshCw className="w-3.5 h-3.5" /> إعادة المحاولة
        </button>
      )}
    </div>
  );
}

function ProgressBar({ progress }: { progress: UploadProgress }) {
  return (
    <div className="space-y-2 mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
      <div className="flex justify-between text-xs font-semibold text-slate-700">
        <span className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          جارٍ رفع الغلاف...
        </span>
        <span className="text-emerald-600">{progress.percent}%</span>
      </div>
      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
          style={{ width: `${progress.percent}%`, background: 'linear-gradient(90deg, #10B981, #059669)' }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 text-left" dir="ltr">
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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { void fetchCourses(); }, [fetchCourses]);

  const [form, setForm] = useState<FormState>({ name: '', description: '', thumbnailUrl: '', thumbnailFile: null });
  const [errors, setErrors] = useState<FormError>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resetModal = useCallback(() => {
    setForm({ name: '', description: '', thumbnailUrl: '', thumbnailFile: null });
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
    setForm({ 
      name: course.name, 
      description: course.description, 
      thumbnailUrl: course.imagePreview || '', 
      thumbnailFile: null 
    });
    if (course.imagePreview) setPreviewUrl(course.imagePreview);
    setShowModal(true);
  };

  const closeModal = () => {
    // Prevent accidental closure if form is dirty
    const isDirty = form.name || form.description || form.thumbnailFile || form.thumbnailUrl;
    if (isDirty && saveStatus !== 'success' && !confirm('لديك تغييرات غير محفوظة. هل أنت متأكد من الإلغاء؟')) {
      return;
    }
    setShowModal(false); 
    resetModal(); 
  };

  const validate = (): boolean => {
    const e: FormError = {};
    const nameStr = form.name.trim();
    
    // Title Validation
    if (!nameStr) e.name = 'اسم المقرر مطلوب';
    else if (nameStr.length < 5) e.name = 'يجب أن يكون عنوان المقرر 5 أحرف على الأقل';
    else if (nameStr.length > 100) e.name = 'لا يمكن أن يتجاوز عنوان المقرر 100 حرف';
    else if (!/^(?!\s*$).+/.test(form.name)) e.name = 'لا يمكن أن يكون عنوان المقرر مسافات فارغة فقط';
    else if (!editingId && courses.some(c => c.name.toLowerCase() === nameStr.toLowerCase())) e.name = 'اسم المقرر موجود مسبقاً في النظام';
    
    // Description Validation
    if (!form.description.trim()) e.description = 'وصف المقرر مطلوب ويفضل أن يكون شاملاً';
    

    // Image URL Validation (if file is not selected but URL is provided)
    if (!form.thumbnailFile && form.thumbnailUrl && !form.thumbnailUrl.startsWith('http')) {
      e.thumbnailUrl = 'الرابط غير صالح. تأكد من أنه يبدأ بـ http:// أو https://';
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaveStatus(form.thumbnailFile ? 'uploading' : 'loading');
    setUploadError(null);
    setUploadProgress(null);
    setErrors({});
    
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        imagePreview: form.thumbnailUrl.trim().startsWith('http') ? form.thumbnailUrl.trim() : undefined,
        imageFile: form.thumbnailFile ?? undefined,
      };

      const onProgress = (evt: any) => {
        if (evt.total) {
          setUploadProgress({
            loaded: evt.loaded,
            total: evt.total,
            percent: Math.round((evt.loaded * 100) / evt.total)
          });
        }
      };

      if (editingId) {
        await updateCourse({ id: editingId, ...payload }, form.thumbnailFile ? onProgress : undefined);
      } else {
        await addCourse(payload, form.thumbnailFile ? onProgress : undefined);
      }
      
      setSaveStatus('success');
      setTimeout(() => {
        setShowModal(false);
        resetModal();
      }, 1000);
    } catch (err) {
      setSaveStatus('error');
      const classified = classifyUploadError(err);
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || 'تعذر حفظ البيانات بسبب خطأ في النظام.';
      if (form.thumbnailFile) {
        setUploadError(classified);
      } else {
        setErrors(prev => ({ ...prev, submit: Array.isArray(msg) ? msg[0] : msg }));
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
    
    // Generate secure preview blob URL
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    
    // Cleanup old URL to prevent memory leaks
    return () => URL.revokeObjectURL(preview);
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

  const isFormValid = form.name.trim() && form.description.trim();
  
  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && courses.length === 0) return <Loader fullPage />;

  return (
    <div className="font-sans antialiased text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1">
            إدارة المقررات الدراسية
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            نظرة شاملة على {courses.length} مقرر مسجّل في المنصة. تحكم، أضف، ونظم المحتوى.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مقرر أو مرحلة..."
              className="w-full sm:w-64 pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
          
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            إنشاء مقرر جديد
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {error && courses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-red-100 p-12 text-center shadow-xl shadow-red-500/5 flex flex-col items-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-inner">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">تعذر تحميل بيانات المقررات</h3>
          <p className="text-slate-500 mb-8 max-w-md">{error}</p>
          <button onClick={() => void fetchCourses()} className="px-8 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold shadow-md shadow-red-500/20 active:scale-95">
            إعادة المحاولة للاتصال بالخادم
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
          <EmptyState
            icon={BookOpenCheck}
            title="منصتك خالية من المقررات حتى الآن"
            description="ابدأ رحلة التعليم بإنشاء أول مقرر دراسي وإضافة محتوى تفاعلي ليتمكن الطلاب من الالتحاق به."
            action={
              <button onClick={openCreate} className="px-6 py-3 mt-2 text-white rounded-xl transition-all shadow-md hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 700 }}>
                إنشاء أول مقرر الآن
              </button>
            }
          />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
          <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-400">لم يتم العثور على مقررات تطابق بحثك "{searchQuery}"</p>
          <button onClick={() => setSearchQuery('')} className="mt-4 text-emerald-600 hover:text-emerald-700 font-semibold text-sm underline underline-offset-4">مسح البحث</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map(course => (
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
                <Trash2 className="w-10 h-10 text-red-500 relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">هل أنت متأكد تماماً؟</h3>
              <p className="text-slate-500 text-sm mb-2 leading-relaxed">
                أنت على وشك حذف المقرر <span className="font-bold text-slate-700">"{courses.find(c => c.id === deleteConfirm)?.name}"</span>.
              </p>
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl font-medium">
                تنبيه خطير: سيؤدي هذا إلى حذف جميع الوحدات، الدروس، والملفات المرتبطة به بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
              </div>
              
              {deleteStatus === 'error' && (
                <p className="text-red-600 mt-4 text-sm font-bold animate-pulse">حدث خطأ أثناء محاولة الحذف. يرجى التأكد من صلاحياتك والمحاولة مجدداً.</p>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => { setDeleteConfirm(null); setDeleteStatus('idle'); }} className="flex-1 py-3 text-slate-600 rounded-xl font-bold bg-white border border-slate-200 hover:bg-slate-100 transition-colors">
                إلغاء التراجع
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteStatus === 'loading'}
                className="flex-1 py-3 text-white rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 transition-all shadow-md shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold"
              >
                {deleteStatus === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                {deleteStatus === 'loading' ? 'جاري المسح...' : 'نعم، احذف المقرر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ultra-Modern Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-white rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  {editingId ? <Edit3 className="w-6 h-6 text-emerald-600" /> : <BookOpen className="w-6 h-6 text-emerald-600" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingId ? 'تعديل تفاصيل المقرر' : 'بناء مقرر جديد'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {editingId ? 'قم بتحديث المعلومات الأساسية للمقرر.' : 'أدخل المعلومات الأساسية لإضافة المقرر إلى المنصة.'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 rounded-xl transition-all border border-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Form Level Errors */}
              {errors.submit && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold">{errors.submit}</span>
                </div>
              )}

              {uploadError && (
                <div className="mb-6">
                  <UploadErrorBanner error={uploadError} onRetry={() => { setUploadError(null); setSaveStatus('idle'); }} />
                </div>
              )}

              <div className="space-y-6">
                {/* Visual Distinction: Section 1 - Basic Info */}
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-5 relative">
                  <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-100 text-xs font-bold text-emerald-600 shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    المعلومات الأساسية (إلزامية)
                  </div>

                  <Field label="اسم المقرر الدراسي" required error={errors.name} helperText="يجب أن يكون الاسم فريداً ومعبراً ومكوناً من 5 أحرف على الأقل.">
                    <input
                      value={form.name}
                      onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => { const x = { ...p }; delete x.name; return x; }); }}
                      placeholder="مثال: الرياضيات المتقدمة للمرحلة الثانوية"
                      className={inputCls(!!errors.name, 'text-base font-semibold placeholder:font-normal')}
                      maxLength={100}
                    />
                  </Field>



                  <Field label="وصف المقرر" required error={errors.description} helperText="اكتب نبذة شاملة عن أهداف المقرر وما سيتعلمه الطالب.">
                    <textarea
                      value={form.description}
                      onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => { const x = { ...p }; delete x.description; return x; }); }}
                      placeholder="هذا المقرر يهدف إلى تعريف الطلاب بالمفاهيم الأساسية لـ..."
                      rows={4}
                      className={`${inputCls(!!errors.description)} resize-none leading-relaxed text-sm`}
                    />
                  </Field>
                </div>

                {/* Visual Distinction: Section 2 - Media */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 relative mt-6">
                  <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
                    الوسائط المرئية (اختياري)
                  </div>
                  
                  <Field label="غلاف المقرر (الصورة المصغرة)" error={errors.thumbnailUrl} helperText="سيتم عرض هذه الصورة كواجهة للمقرر في لوحة الطلاب والمشرفين.">
                    
                    {/* Active Image Preview Box */}
                    {(previewUrl || (form.thumbnailUrl && form.thumbnailUrl.startsWith('http'))) ? (
                      <div className="mb-4 rounded-2xl overflow-hidden border-2 border-emerald-100 shadow-sm relative group bg-slate-50" style={{ height: 180 }}>
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-[2px]">
                          <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-white text-emerald-600 rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-50 transition-colors mx-2 flex items-center gap-2">
                            <Upload className="w-4 h-4" /> تغيير الصورة
                          </button>
                          <button type="button" onClick={() => { setPreviewUrl(null); setForm(p => ({ ...p, thumbnailFile: null, thumbnailUrl: '' })); setUploadError(null); if (fileRef.current) fileRef.current.value = ''; }} className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-red-600 transition-colors mx-2 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> إزالة
                          </button>
                        </div>
                        <img 
                          src={previewUrl || form.thumbnailUrl} 
                          alt="معاينة الغلاف" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x400/F8FAFC/94A3B8?text=Image+Not+Found'; }} 
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10">
                          <p className="text-white text-xs font-medium truncate flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> الصورة جاهزة
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop Upload Area */
                      <div
                        className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-4 group bg-slate-50"
                        style={{ borderColor: errors.thumbnailUrl ? '#EF4444' : '#CBD5E1' }}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.backgroundColor = '#ECFDF5'; }}
                        onDragLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                      >
                        <div className="w-16 h-16 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center mb-4 border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                          <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <h4 className="text-slate-700 font-bold text-sm mb-1">اضغط لرفع صورة من جهازك</h4>
                        <p className="text-slate-400 text-xs">أو قم بسحب وإفلات الصورة هنا</p>
                        <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-500 font-medium">
                          <span className="bg-white px-2 py-1 rounded border border-slate-200">JPG, PNG, WEBP</span>
                          <span className="bg-white px-2 py-1 rounded border border-slate-200">Max 5MB</span>
                        </div>
                      </div>
                    )}

                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

                    {uploadProgress && saveStatus === 'uploading' && <ProgressBar progress={uploadProgress} />}

                    {/* URL Input Divider */}
                    {!previewUrl && !form.thumbnailFile && (
                      <>
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-slate-200" />
                          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">أو إرفاق رابط خارجي</span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        
                        <div className="relative group">
                          <LinkIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                          <input
                            type="url"
                            value={form.thumbnailUrl}
                            onChange={e => { setForm(p => ({ ...p, thumbnailUrl: e.target.value, thumbnailFile: null })); setPreviewUrl(null); setUploadError(null); }}
                            placeholder="https://example.com/images/course-cover.jpg"
                            className={`${inputCls(!!errors.thumbnailUrl)} pr-11 font-mono text-sm placeholder:font-sans placeholder:text-right`}
                            style={{ direction: 'ltr', textAlign: 'left' }}
                          />
                        </div>
                      </>
                    )}
                  </Field>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] flex items-center justify-end gap-3 shrink-0">
              <button 
                onClick={closeModal} 
                className="px-6 py-3 text-slate-600 font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all focus:ring-2 focus:ring-slate-200"
              >
                إلغاء الأمر
              </button>
              
              <button
                onClick={handleSave}
                disabled={!isFormValid || saveStatus === 'loading' || saveStatus === 'uploading' || saveStatus === 'success'}
                className="px-8 py-3 text-white rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                {(saveStatus === 'loading' || saveStatus === 'uploading') ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> جاري معالجة البيانات...</>
                ) : saveStatus === 'success' ? (
                  <><CheckCircle className="w-5 h-5 animate-bounce" /> تم الاعتماد بنجاح!</>
                ) : editingId ? (
                  <><Edit3 className="w-5 h-5" /> حفظ جميع التعديلات</>
                ) : (
                  <><Plus className="w-5 h-5" strokeWidth={3} /> إطلاق المقرر الجديد</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers & Micro Components ───────────────────────────────────────────────

function Field({ label, required, error, helperText, children }: { label: string; required?: boolean; error?: string; helperText?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
          {label} 
          {required && <span className="text-red-500 text-lg leading-none mt-1">*</span>}
        </label>
        {error && <span className="text-[11px] font-bold text-red-500 animate-pulse bg-red-50 px-2 py-0.5 rounded-md">{error}</span>}
      </div>
      {children}
      {helperText && !error && (
        <p className="text-xs text-slate-400 font-medium">{helperText}</p>
      )}
    </div>
  );
}

function inputCls(hasError: boolean, extra = '') {
  return `w-full px-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 ${
    hasError 
      ? 'border-red-300 bg-red-50/50 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:bg-white' 
      : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
  } ${extra}`;
}

// ─── Course Card Component ──────────────────────────────────────────────────

function CourseCard({ course, onEdit, onDelete }: { course: Course; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-[20px] border border-slate-100 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group flex flex-col h-full hover:-translate-y-1">
      {/* Image Header */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-50">
        {course.imagePreview ? (
          <img 
            src={course.imagePreview} 
            alt={course.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/ECFDF5/10B981?text=Course'; }} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50/50">
            <BookOpen className="w-12 h-12 text-emerald-200" />
          </div>
        )}
        

        {/* Overlay Actions (Hover) */}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[1px]">
          <button onClick={onEdit} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-110 transition-all shadow-lg" title="تعديل المقرر">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:text-red-600 hover:scale-110 transition-all shadow-lg" title="حذف المقرر">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Content Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-slate-800 font-bold text-base mb-2 line-clamp-1 leading-tight group-hover:text-emerald-600 transition-colors" title={course.name}>
          {course.name}
        </h3>
        <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
          {course.description}
        </p>
        
        {/* Footer Stats */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs">
            <BookOpenCheck className="w-4 h-4 text-emerald-500" />
            <span>{course.lessonsCount} درس متاح</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
            {new Date(course.createdAt).toLocaleDateString('ar-SA')}
          </span>
        </div>
      </div>
    </div>
  );
}
