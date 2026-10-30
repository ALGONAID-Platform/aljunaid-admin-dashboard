import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { uploadService, validateImageFile, classifyUploadError, type UploadProgress, type UploadError } from '../../../services/api/upload.api';
import {
  Plus, BookOpen, X, CheckCircle, AlertCircle, Image as ImageIcon, Link as LinkIcon,
  Upload, Loader2, Edit3, Trash2, RefreshCw, FileWarning, Search, Filter, BookOpenCheck, Wifi, CheckSquare, Square, Copy
} from 'lucide-react';
import { getImageUrl } from '../../../utils/helpers';
import { useCoursesStore, useLessonsStore, useModulesStore, useExamModelsStore } from '../../../store';
import { Loader } from '../../../components/feedback/Loader';
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcuts';
import { BulkActionBar } from '../../../components/ui/BulkActionBar';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { StatWidget } from '../../../components/ui/StatWidget';
import { BookMarked, PlayCircle, FolderOpen, Clock, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';
import { Pagination } from '../../../components/ui/Pagination';
import { StickyToolbar } from '../../../components/ui/StickyToolbar';
import { GlobalSearch } from '../../../components/ui/GlobalSearch';
import { SavedViews } from '../../../components/ui/SavedViews';
import { CascadeDeleteModal } from '../../../components/ui/CascadeDeleteModal';
import { ModuleManagerModal } from '../../../components/ui/ModuleManagerModal';
import { PageGuide } from '../../../components/ui/PageGuide';
import type { Course } from '../../../types';
import { courseService } from '../../../services/api/courses.api';
import { useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';

interface FormState {
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnailFile: File | null;
  isPaid: boolean;
  courseType: 'RECORDED' | 'LIVE';
  priceYerOld: string; discountedPriceYerOld: string; priceYerNew: string; discountedPriceYerNew: string;
  priceSar: string; discountedPriceSar: string; price: string; discountedPrice: string;
  maxStudents: string; startDate: string; endDate: string; durationWeeks: string;
  scheduleDaysText: string; objectives: string[]; certificateMinScore: string; certificateMinAttendance: string;
}
const emptyForm: FormState = { title: '', description: '', thumbnailUrl: '', thumbnailFile: null, isPaid: false, courseType: 'RECORDED', priceYerOld: '', discountedPriceYerOld: '', priceYerNew: '', discountedPriceYerNew: '', priceSar: '', discountedPriceSar: '', price: '', discountedPrice: '', maxStudents: '', startDate: '', endDate: '', durationWeeks: '', scheduleDaysText: '', objectives: [], certificateMinScore: '70', certificateMinAttendance: '80' };

const normalizeSearchText = (value: unknown) => String(value ?? '')
  .normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLocaleLowerCase().trim();

const matchesCourseSearch = (value: unknown, query: string) => {
  const textTerms = normalizeSearchText(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const queryTerms = normalizeSearchText(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!textTerms.length || !queryTerms.length) return false;
  return textTerms.some((_, index) => queryTerms.every((term, offset) => textTerms[index + offset]?.startsWith(term)));
};

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

function UploadProgressBar({ progress }: { progress: UploadProgress }) {
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
  const navigate = useNavigate();
  const { courses, addCourse, updateCourse, deleteCourse, fetchCourses, isLoading, error } = useCoursesStore();
  const { modules, fetchModules } = useModulesStore();
  const { lessons, fetchLessons } = useLessonsStore();
  const { examModels, fetchExamModels } = useExamModelsStore();
  const [convertingCourseId, setConvertingCourseId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showModuleManager, setShowModuleManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiMatchedCourseIds, setApiMatchedCourseIds] = useState<Set<string> | null>(null);
  const [isCourseSearchLoading, setIsCourseSearchLoading] = useState(false);
  const [activeView, setActiveView] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrentPage(1); setSelectedCourses([]); }, [searchQuery, activeView, itemsPerPage]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setApiMatchedCourseIds(null);
      setIsCourseSearchLoading(false);
      return;
    }

    let active = true;
    setApiMatchedCourseIds(null);
    setIsCourseSearchLoading(true);
    const timer = window.setTimeout(() => {
      void courseService.search(query)
        .then(results => {
          if (active) setApiMatchedCourseIds(new Set(results.filter(course => matchesCourseSearch(course.title, query)).map(course => String(course.id))));
        })
        .catch(() => {
          // Keep the dashboard's local search working if the public API search is unavailable.
          if (active) setApiMatchedCourseIds(null);
        })
        .finally(() => {
          if (active) setIsCourseSearchLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    void fetchCourses();
    void fetchModules();
    void fetchLessons();
    void fetchExamModels();
  }, [fetchCourses, fetchModules, fetchLessons, fetchExamModels]);

  const stats = useMemo(() => {
    return {
      totalCourses: courses.length,
      totalModules: modules.length,
      totalLessons: lessons.length,
      publishedLessons: lessons.filter(l => l.isPublished).length,
      draftLessons: lessons.filter(l => !l.isPublished).length,
      completionRate: lessons.length ? Math.round((lessons.filter(l => l.hasContent).length / lessons.length) * 100) : 0,
    };
  }, [courses, modules, lessons]);

  const [form, setForm] = useState<FormState>(emptyForm);
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
    setForm(emptyForm);
    setErrors({});
    setSaveStatus('idle');
    setUploadError(null);
    setUploadProgress(null);
    setPreviewUrl(null);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const openCreate = () => { resetModal(); setShowModal(true); };

  const openEdit = async (course: Course) => {
    let editableCourse: Course;
    try {
      // The public course list omits descriptions. Fetch the full course record
      // before populating the edit form so the saved description is preserved.
      editableCourse = { ...course, ...await courseService.getById(String(course.id)) };
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل بيانات المقرر للتعديل.');
      return;
    }
    resetModal();
    setEditingId(editableCourse.id);
    setForm({
      ...emptyForm,
      title: editableCourse.title,
      description: editableCourse.description ?? '',
      thumbnailUrl: editableCourse.thumbnail || '',
      thumbnailFile: null,
      isPaid: Boolean(editableCourse.isPaid),
      courseType: (editableCourse.courseType as FormState['courseType']) ?? 'RECORDED',
      ...Object.fromEntries(['price','discountedPrice','priceYerOld','discountedPriceYerOld','priceYerNew','discountedPriceYerNew','priceSar','discountedPriceSar','maxStudents','durationWeeks','certificateMinScore','certificateMinAttendance'].map(k => [k, (editableCourse as any)[k] == null ? '' : String((editableCourse as any)[k])])) as Partial<FormState>,
      startDate: editableCourse.startDate?.slice(0, 10) ?? '', endDate: editableCourse.endDate?.slice(0, 10) ?? '',
      scheduleDaysText: String((editableCourse as any).scheduleDaysText ?? ''), objectives: Array.isArray((editableCourse as any).objectives) ? [...(editableCourse as any).objectives] : []
    });
    if (editableCourse.thumbnail) setPreviewUrl(editableCourse.thumbnail);
    setShowModal(true);
  };

  const closeModal = () => {
    const isDirty = form.title || form.description || form.thumbnailFile || form.thumbnailUrl || form.objectives.length || form.isPaid;
    if (isDirty && saveStatus !== 'success' && !confirm('لديك تغييرات غير محفوظة. هل أنت متأكد من الإلغاء؟')) {
      return;
    }
    setShowModal(false);
    resetModal();
  };

  const validate = (): boolean => {
    const e: FormError = {};
    const titleStr = form.title.trim();
    if (!titleStr) e.title = 'اسم المقرر مطلوب';
    else if (titleStr.length < 3) e.title = 'يجب أن يكون عنوان المقرر 3 أحرف على الأقل';
    else if (titleStr.length > 100) e.title = 'لا يمكن أن يتجاوز عنوان المقرر 100 حرف';
    else if (!/^(?!\s*$).+/.test(form.title)) e.title = 'لا يمكن أن يكون عنوان المقرر مسافات فارغة فقط';
    else if (!editingId && courses.some(c => c.title.toLowerCase() === titleStr.toLowerCase())) e.title = 'اسم المقرر موجود مسبقاً في النظام';
    if (!form.thumbnailFile && form.thumbnailUrl && !form.thumbnailUrl.startsWith('http') && !form.thumbnailUrl.startsWith('/') && !form.thumbnailUrl.startsWith('uploads/')) {
      e.thumbnailUrl = 'الرابط غير صالح. تأكد من إدخال رابط أو مسار صورة صحيح';
    }
    if (form.isPaid && (!form.price.trim() || !Number.isFinite(Number(form.price)) || Number(form.price) <= 0)) e.price = 'السعر الأساسي بالدولار مطلوب للمقررات المدفوعة';
    setErrors(e);
    return Object.keys(e).length === 0;
  };


  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaveStatus('loading');
    setUploadError(null);
    setUploadProgress(null);
    setErrors({});

    try {
    let finalThumbnailUrl = form.thumbnailUrl.trim() ? getImageUrl(form.thumbnailUrl.trim()) : undefined;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        thumbnail: finalThumbnailUrl,
        isPaid: form.isPaid,
        courseType: form.courseType,
        ...Object.fromEntries(['price','discountedPrice','priceYerOld','discountedPriceYerOld','priceYerNew','discountedPriceYerNew','priceSar','discountedPriceSar','maxStudents','durationWeeks','certificateMinScore','certificateMinAttendance'].map(k => [k, form[k as keyof FormState] ? Number(form[k as keyof FormState]) : undefined])),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        scheduleDaysText: form.scheduleDaysText || undefined,
        scheduleDays: form.scheduleDaysText ? form.scheduleDaysText.split(',').map(s => s.trim()).filter(Boolean) : [],
        objectives: form.objectives.map(s => s.trim()).filter(Boolean),
      };

      if (editingId) {
        await updateCourse({ id: editingId, ...payload });
        toast.success('تم تحديث المقرر بنجاح');
      } else {
        await addCourse(payload);
        toast.success('تم إنشاء المقرر بنجاح');
      }

      setSaveStatus('success');
      setTimeout(() => {
        setShowModal(false);
        resetModal();
        void fetchCourses();
      }, 1000);
    } catch (err) {
      toast.error((err as any)?.response?.data?.message || (err as any)?.message || 'تعذر حفظ المقرر');
      setSaveStatus('error');
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || 'تعذر حفظ البيانات بسبب خطأ في النظام.';
      setErrors(prev => ({ ...prev, submit: Array.isArray(msg) ? msg[0] : msg }));
    }
  }, [form, editingId, validate, updateCourse, addCourse, resetModal, fetchCourses]);

  const handleFileSelect = async (file: File) => {
    const validationErr = validateImageFile(file);
    if (validationErr) {
      setUploadError(validationErr);
      return;
    }
    setUploadError(null);
    setSaveStatus('uploading');
    
    setForm(p => ({ ...p, thumbnailFile: file, thumbnailUrl: '' }));
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    
    try {
      const onProgress = (evt: UploadProgress) => setUploadProgress(evt);
      const uploadedUrl = await uploadService.uploadImage(file, onProgress);
      
      setForm(p => ({ ...p, thumbnailUrl: uploadedUrl, thumbnailFile: null }));
      setPreviewUrl(uploadedUrl);
      setSaveStatus('idle');
      setUploadProgress(null);
      setUploadError(null);
      toast.success('تم رفع صورة المقرر بنجاح');
    } catch (err) {
      toast.error(classifyUploadError(err).message || 'تعذر رفع الصورة');
      setUploadError(classifyUploadError(err));
      setSaveStatus('idle');
      setUploadProgress(null);
    }
  };

  const handleRetryUpload = async () => {
    if (form.thumbnailFile) {
      setUploadError(null);
      setSaveStatus('uploading');
      try {
        const onProgress = (evt: UploadProgress) => setUploadProgress(evt);
        const uploadedUrl = await uploadService.uploadImage(form.thumbnailFile, onProgress);
        
        setForm(p => ({ ...p, thumbnailUrl: uploadedUrl, thumbnailFile: null }));
        setPreviewUrl(uploadedUrl);
        setSaveStatus('idle');
        setUploadProgress(null);
        setUploadError(null);
      } catch (err) {
        setUploadError(classifyUploadError(err));
        setSaveStatus('idle');
        setUploadProgress(null);
      }
    } else {
      setUploadError(null);
      setSaveStatus('idle');
      if (fileRef.current) {
        fileRef.current.value = '';
        fileRef.current.click();
      }
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteStatus('loading');
    try {
      await deleteCourse(id);
      toast.success('تم حذف المقرر');
      setDeleteConfirm(null);
      setDeleteStatus('idle');
    } catch {
      toast.error('تعذر حذف المقرر');
      setDeleteStatus('error');
    }
  };

  const isFormValid = form.title.trim() && form.description.trim();

  const filteredCourses = courses.filter(c => {
    const query = normalizeSearchText(searchQuery);
    const searchableValues = [c.title, c.description, c.objectives, c.keywords, c.tags];
    const matchesSearch = !query || apiMatchedCourseIds?.has(String(c.id)) || searchableValues.some(value => {
      const text = Array.isArray(value) ? value.join(' ') : value;
      return matchesCourseSearch(text, query);
    });
    let matchesView = true;
    if (activeView === 'no_image') matchesView = !c.thumbnail;
    if (activeView === 'no_desc') matchesView = !c.description?.trim();
    if (activeView === 'empty') matchesView = c.lessonsCount === 0;
    if (activeView === 'paid') matchesView = c.isPaid === true;
    if (activeView === 'free') matchesView = c.isPaid !== true;
    return matchesSearch && matchesView;
  });

  // Keyboard Shortcuts
  useKeyboardShortcut('f', true, () => searchInputRef.current?.focus()); // Ctrl+F
  useKeyboardShortcut('escape', false, () => {
    if (showModal) closeModal();
    if (deleteConfirm) { setDeleteConfirm(null); setDeleteStatus('idle'); }
    setSelectedCourses([]);
  });
  useKeyboardShortcut('s', true, (e) => {
    if (showModal && isFormValid && saveStatus !== 'loading' && saveStatus !== 'uploading' && saveStatus !== 'success') {
      e.preventDefault();
      void handleSave();
    }
  });

  const handleBulkAction = async (action: 'delete' | 'duplicate') => {
    if (selectedCourses.length === 0) return;
    if (action === 'delete' && !confirm(`تأكيد حذف ${selectedCourses.length} مقرر نهائياً؟ لا يمكن التراجع.`)) return;

    setBulkActionLoading(true);
    try {
      for (const id of selectedCourses) {
        if (action === 'delete') await deleteCourse(id);
        else if (action === 'duplicate') {
          const c = courses.find(x => x.id === id);
          if (c) await addCourse({ title: c.title + ' (نسخة)', description: c.description, thumbnail: c.thumbnail } as any);
        }
      }
      setSelectedCourses([]);
      toast.success(action === 'delete' ? 'تم حذف المقررات المحددة' : 'تم نسخ المقررات المحددة');
    } catch {
      toast.error('حدث خطأ أثناء تنفيذ الإجراء المجمع.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const paginatedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading && courses.length === 0) return <Loader fullPage />;

  return (
    <div className="font-sans antialiased text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1">
            إدارة المقررات الدراسية
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            نظرة شاملة على {courses.length} مقرر مسجّل في المنصة. تحكم، أضف، ونظم المحتوى.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={openCreate}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            تأسيس مقرر جديد
          </button>
        </div>
      </div>

      <PageGuide
        title="دليل استخدام المقررات"
        description="تعلم كيف تدير مقرراتك الدراسية بكفاءة عالية"
        steps={[
          {
            title: "إضافة مقرر",
            description: "انقر على 'تأسيس مقرر جديد' لإنشاء مقرر فارغ، يمكنك لاحقاً إضافة الدروس والاختبارات إليه."
          },
          {
            title: "التحرير والحذف",
            description: "يمكنك تعديل اسم ووصف وصورة المقرر أو حذفه بالكامل من خلال الأزرار المتوفرة بجوار كل مقرر."
          },
          {
            title: "العمليات المجمعة",
            description: "حدد عدة مقررات باستخدام مربعات التحديد لتتمكن من حذفها دفعة واحدة لتوفير الوقت."
          }
        ]}
        tips={[
          "استخدم اختصار Ctrl+F للوصول السريع لشريط البحث.",
          "تأكد من استخدام صور مصغرة واضحة لزيادة تفاعل الطلاب مع المقررات."
        ]}
      />

      <StickyToolbar position="top" className="!flex-col !items-stretch">
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="relative group w-full min-w-0">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-busy={isCourseSearchLoading}
              placeholder="ابحث باسم المقرر أو الوحدة أو الدرس أو الوصف..."
              className="min-h-12 w-full min-w-0 pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
            {isCourseSearchLoading && <Loader2 aria-label="جارٍ البحث" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-600" />}
          </div>
          <SavedViews
            activeView={activeView}
            onChange={setActiveView}
            views={[
              { id: 'all', label: 'الكل', icon: BookOpen },
              { id: 'paid', label: 'المقررات المدفوعة', icon: BookOpenCheck },
              { id: 'free', label: 'المقررات المجانية', icon: BookOpen },
              { id: 'empty', label: 'بدون دروس', icon: FolderOpen },
              { id: 'no_image', label: 'بدون غلاف', icon: AlertCircle },
              { id: 'no_desc', label: 'بدون وصف', icon: AlertCircle },
            ]}
          />
        </div>
      </StickyToolbar>

      <div className="flex overflow-x-auto sm:flex-wrap items-center gap-2 sm:gap-3 mb-6 pb-2 sm:pb-0 hide-scrollbar">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm whitespace-nowrap">
          <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-500"><BookOpen className="w-3.5 h-3.5" /></div>
          <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 leading-none mb-1">المقررات</span><span className="text-sm font-black text-slate-700 leading-none">{stats.totalCourses}</span></div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm whitespace-nowrap">
          <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center text-purple-500"><FolderOpen className="w-3.5 h-3.5" /></div>
          <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 leading-none mb-1">الوحدات</span><span className="text-sm font-black text-slate-700 leading-none">{stats.totalModules}</span></div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm whitespace-nowrap">
          <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-500"><BookMarked className="w-3.5 h-3.5" /></div>
          <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 leading-none mb-1">الدروس</span><span className="text-sm font-black text-slate-700 leading-none">{stats.totalLessons}</span></div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm whitespace-nowrap">
          <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-500"><CheckCircle className="w-3.5 h-3.5" /></div>
          <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 leading-none mb-1">منشورة</span><span className="text-sm font-black text-slate-700 leading-none">{stats.publishedLessons}</span></div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm whitespace-nowrap">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500"><Clock className="w-3.5 h-3.5" /></div>
          <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 leading-none mb-1">مسودات</span><span className="text-sm font-black text-slate-700 leading-none">{stats.draftLessons}</span></div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm whitespace-nowrap">
          <div className="w-6 h-6 rounded-md bg-pink-50 flex items-center justify-center text-pink-500"><PlayCircle className="w-3.5 h-3.5" /></div>
          <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 leading-none mb-1">الاكتمال</span><span className="text-sm font-black text-slate-700 leading-none">{stats.completionRate}%</span></div>
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedCourses.length}
        onClear={() => setSelectedCourses([])}
        onDuplicate={() => handleBulkAction('duplicate')}
        onDelete={() => handleBulkAction('delete')}
        loading={bulkActionLoading}
      />

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
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500 flex items-center gap-2">
              <button onClick={() => setSelectedCourses(p => p.length === paginatedCourses.length ? [] : paginatedCourses.map(c => c.id))} className="text-slate-400 hover:text-emerald-500 transition-colors" title="تحديد الكل في هذه الصفحة">
                {selectedCourses.length > 0 && selectedCourses.length === paginatedCourses.length ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
              </button>
              <span>المقررات التعليمية ({filteredCourses.length})</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCourses.map(course => {
              const cLessons = lessons.filter(l => {
                if (course.isPaid === true) return String(l.courseId) === String(course.id);
                const lessonModule = modules.find(m => String(m.id) === String(l.courseId));
                return lessonModule
                  ? String(lessonModule.courseId) === String(course.id)
                  : String(l.courseId) === String(course.id);
              });
              const publishedCLessons = cLessons.filter(l => l.isPublished);
              const isSelected = selectedCourses.includes(course.id);
              const toggleSelect = () => setSelectedCourses(p => p.includes(course.id) ? p.filter(id => id !== course.id) : [...p, course.id]);

              return (
                <div key={course.id} className={`bg-white rounded-2xl sm:rounded-[2rem] border overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-100 hover:-translate-y-1'}`}>
                  <div className="h-36 sm:h-40 bg-slate-100 relative group-hover:brightness-105 transition-all overflow-hidden flex items-center justify-center">
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                      <button onClick={toggleSelect} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-slate-500 hover:text-emerald-600 transition-colors touch-target">
                        {isSelected ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Mobile Visible Action Buttons */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 md:hidden">
                      <button onClick={() => openEdit(course)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-700 shadow-sm touch-target">
                        <Edit3 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button onClick={() => setDeleteConfirm(course.id)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-700 shadow-sm touch-target">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                    {(course.thumbnail || (course as any).imageUrl || (course as any).image) ? (
                      <img
                        src={getImageUrl(course.thumbnail || (course as any).imageUrl || (course as any).image)}
                        alt={course.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="%23f1f5f9"%3E%3Crect width="600" height="400" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%2394a3b8"%3E%D8%BA%D9%84%D8%A7%D9%81+%D8%A7%D9%84%D9%85%D9%82%D8%B1%D8%B1%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <BookOpen className="w-12 h-12 text-emerald-200" />
                    )}

                    {/* Desktop Hover Action Buttons */}
                    <div className="hidden md:flex absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-center justify-center gap-3 backdrop-blur-[1px]">
                      <button onClick={() => openEdit(course)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-110 transition-all shadow-lg" title="تعديل المقرر">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(course.id)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:text-red-600 hover:scale-110 transition-all shadow-lg" title="حذف المقرر">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    <h3 className="text-slate-800 font-bold text-sm sm:text-base mb-1.5 line-clamp-1 leading-tight group-hover:text-emerald-600 transition-colors">{course.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 min-h-[2.2rem] sm:min-h-[2.5rem] leading-relaxed mb-3 sm:mb-4">{course.description}</p>

                    <div className="mb-3 sm:mb-4">
                      <ProgressBar percent={cLessons.length ? Math.round((publishedCLessons.length / cLessons.length) * 100) : 0} label="نسبة النشر" />
                    </div>
                    {publishedCLessons.length === 0 && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">هذا المقرر غير متاح للطلاب حتى يُنشر درس واحد على الأقل. المسودات تبقى متاحة للإدارة.</p>}

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs border border-slate-100 rounded-lg p-1.5 sm:p-2 bg-slate-50/50">
                        <BookOpenCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{cLessons.length} درس</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md flex items-center justify-center">
                        {new Date(course.createdAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    <button onClick={() => navigate(`/admin/courses/${course.id}/lessons`)} className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-700">إدارة المقرر ومحتواه</button>
                    {(course as any).courseType === 'LIVE' && <button disabled={convertingCourseId === course.id} onClick={async () => { if (!window.confirm('تحويل هذا المعسكر إلى مقرر مسجل؟')) return; const priceInput = window.prompt('سعر المقرر المسجل بالدولار (اختياري، اتركه فارغاً للإبقاء على السعر الحالي):'); if (priceInput === null) return; const discountInput = window.prompt('سعر الخصم بالدولار (اختياري، اتركه فارغاً للإبقاء على السعر الحالي):'); if (discountInput === null) return; const prices: Record<string, number | undefined> = {}; if (priceInput.trim()) prices.price = Number(priceInput); if (discountInput.trim()) prices.discountedPrice = Number(discountInput); if (Object.values(prices).some(value => value !== undefined && (!Number.isFinite(value) || value < 0))) { window.alert('أدخل أسعاراً صحيحة غير سالبة.'); return; } setConvertingCourseId(course.id); try { await courseService.convertToRecorded(course.id, prices); await fetchCourses(); } catch (e: any) { window.alert(e?.response?.data?.message ?? e?.message ?? 'تعذر تحويل المقرر'); } finally { setConvertingCourseId(null); } }} className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-50">{convertingCourseId === course.id ? 'جارٍ التحويل…' : 'تحويل إلى مقرر مسجل'}</button>}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredCourses.length}
            itemsPerPage={itemsPerPage}
            isLoading={isLoading}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}

      <CascadeDeleteModal
        isOpen={!!deleteConfirm}
        targetType="course"
        targetId={deleteConfirm || ''}
        onClose={() => setDeleteConfirm(null)}
      />

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all">
          <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl rounded-none sm:rounded-[2rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
                  {editingId ? <Edit3 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" /> : <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-slate-800">
                    {editingId ? 'تعديل تفاصيل المقرر' : 'بناء مقرر جديد'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                    {editingId ? 'قم بتحديث المعلومات الأساسية للمقرر.' : 'أدخل المعلومات الأساسية لإضافة المقرر إلى المنصة.'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 rounded-xl transition-all border border-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
              {errors.submit && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold">{errors.submit}</span>
                </div>
              )}

              {uploadError && (
                <div className="mb-6">
                  <UploadErrorBanner error={uploadError} onRetry={handleRetryUpload} />
                </div>
              )}

              <div className="space-y-6">
                {editingId && !form.isPaid && (
                  <section className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800">وحدات المقرر</h4>
                      <p className="mt-1 text-xs text-slate-500">أضف وحدات هذا المقرر أو عدّلها.</p>
                    </div>
                    <button type="button" onClick={() => setShowModuleManager(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
                      <Plus className="h-4 w-4" /> إدارة الوحدات
                    </button>
                  </section>
                )}
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-5 relative">
                  <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-100 text-xs font-bold text-emerald-600 shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    المعلومات الأساسية (إلزامية)
                  </div>

                  <Field label="اسم المقرر الدراسي" required error={errors.title} helperText="يجب أن يكون الاسم فريداً ومعبراً ومكوناً من 5 أحرف على الأقل.">
                    <input
                      value={form.title}
                      onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => { const x = { ...p }; delete x.title; return x; }); }}
                      placeholder="مثال: الرياضيات المتقدمة للمرحلة الثانوية"
                      className={inputCls(!!errors.title, 'text-base font-semibold placeholder:font-normal')}
                      maxLength={100}
                    />
                  </Field>

                  <Field label="وصف المقرر" required error={errors.description} helperText="اكتب نبذة شاملة عن أهداف المقرر وما سيتعلمه الطالب.">
                    <textarea
                      value={form.description}
                      onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => { const x = { ...p }; delete x.description; return x; }); }}
                      placeholder="هذا المقرر يهدف إلى تعريف الطلاب بالمفاهيم الأساسية لـ..."
                      rows={7}
                      className={`${inputCls(!!errors.description)} resize-y leading-relaxed text-sm min-h-[160px]`}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPaid} onChange={e=>setForm(p=>({...p,isPaid:e.target.checked}))}/>مقرر مدفوع</label>
                    <label className="text-sm font-bold">نوع المقرر<select className={inputCls(false)} value={form.courseType} onChange={e=>setForm(p=>({...p,courseType:e.target.value as FormState['courseType']}))}><option value="RECORDED">مسجل</option><option value="LIVE">معسكر مباشر</option></select></label>
                  </div>
                  {form.isPaid && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['price','Base price (USD) *'],['discountedPrice','Discounted price (USD)'],['priceSar','Price (SAR)'],['discountedPriceSar','Discounted price (SAR)'],['priceYerOld','Price (YER old)'],['discountedPriceYerOld','Discounted price (YER old)'],['priceYerNew','Price (YER new)'],['discountedPriceYerNew','Discounted price (YER new)']].map(([key,label])=><label key={key} className="text-xs font-bold text-slate-600">{label}{key === 'price' && <span className="mt-1 block font-normal leading-relaxed text-slate-500">This field is required for paid courses. It represents the base price in US dollars ($ USD) and is the primary reference for international students and payments through Karty and bank cards.</span>}<input type="number" min="0" required={key === 'price'} value={form[key as keyof FormState] as string} onChange={e=>{setForm(p=>({...p,[key]:e.target.value})); setErrors(p=>({...p,price:undefined}));}} className={`${inputCls(key === 'price' && !!errors.price)} mt-1`} />{key === 'price' && errors.price && <span className="text-red-600">{errors.price}</span>}</label>)}</div>}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {([['maxStudents','الحد الأقصى للطلاب'],['durationWeeks','المدة بالأسابيع'],['certificateMinScore','حد درجة الشهادة %'],['certificateMinAttendance','حد الحضور للشهادة %']] as const).map(([key,label])=><label key={key} className="text-xs font-bold text-slate-600">{label}<input type="number" min="0" value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={key==='maxStudents'?'غير محدود':''} className={`${inputCls(false)} mt-1`} /></label>)}
                    <label className="text-xs font-bold text-slate-600">تاريخ البداية<input type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} className={`${inputCls(false)} mt-1`}/></label>
                    <label className="text-xs font-bold text-slate-600">تاريخ النهاية<input type="date" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} className={`${inputCls(false)} mt-1`}/></label>
                  </div>
                  {form.courseType === 'LIVE' && <Field label="أيام ومواعيد اللقاءات" helperText="افصل بين المواعيد بفاصلة."><input value={form.scheduleDaysText} onChange={e=>setForm(p=>({...p,scheduleDaysText:e.target.value}))} className={inputCls(false)} placeholder="الأحد 8 مساءً، الثلاثاء 8 مساءً"/></Field>}
                  <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-700">أهداف المقرر</span><button type="button" onClick={()=>setForm(p=>({...p,objectives:[...p.objectives,'']}))} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">+ إضافة هدف</button></div>{form.objectives.map((objective,index)=><div key={index} className="flex gap-2"><input value={objective} onChange={e=>setForm(p=>({...p,objectives:p.objectives.map((item,i)=>i===index?e.target.value:item)}))} className={inputCls(false)} placeholder={`الهدف ${index+1}`}/><button type="button" aria-label={`حذف الهدف ${index+1}`} onClick={()=>setForm(p=>({...p,objectives:p.objectives.filter((_,i)=>i!==index)}))} className="rounded-lg border px-3 text-red-600">×</button></div>)}{form.objectives.length===0&&<p className="text-xs text-slate-400">أضف أهداف المقرر واحداً تلو الآخر.</p>}</div>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 relative mt-6">
                  <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
                    الوسائط المرئية (اختياري)
                  </div>

                  <Field label="غلاف المقرر (الصورة المصغرة)" error={errors.thumbnailUrl} helperText="سيتم عرض هذه الصورة كواجهة للمقرر في لوحة الطلاب والمشرفين.">
                    {(previewUrl || (form.thumbnailUrl && form.thumbnailUrl.startsWith('http'))) ? (
                      <div className="mb-4 rounded-2xl overflow-hidden border-2 border-emerald-100 shadow-sm relative group bg-slate-50" style={{ height: 180 }}>
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-[2px]">
                          <button
                            type="button"
                            onClick={() => {
                              if (fileRef.current) fileRef.current.value = '';
                              fileRef.current?.click();
                            }}
                            className="px-4 py-2 bg-white text-emerald-600 rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-50 transition-colors mx-2 flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" /> تغيير الصورة
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl(null);
                              setForm(p => ({ ...p, thumbnailFile: null, thumbnailUrl: '' }));
                              setUploadError(null);
                              setUploadProgress(null);
                              if (fileRef.current) fileRef.current.value = '';
                            }}
                            className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-red-600 transition-colors mx-2 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> إزالة
                          </button>
                        </div>
                        <img
                          src={previewUrl ? getImageUrl(previewUrl) : getImageUrl(form.thumbnailUrl)}
                          alt="معاينة الغلاف"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400" fill="%23f1f5f9"%3E%3Crect width="800" height="400" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%2394a3b8"%3E%D9%84%D8%A7+%D8%AA%D9%88%D8%AC%D8%AF+%D8%B5%D9%88%D8%B1%D8%A9%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10">
                          <p className="text-white text-xs font-medium truncate flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> الصورة جاهزة
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-4 group bg-slate-50"
                        style={{ borderColor: errors.thumbnailUrl ? '#EF4444' : '#CBD5E1' }}
                        onClick={() => {
                          if (fileRef.current) fileRef.current.value = '';
                          fileRef.current?.click();
                        }}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.backgroundColor = '#ECFDF5'; }}
                        onDragLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#F8FAFC'; const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                      >
                        <div className="w-16 h-16 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center mb-4 border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                          <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <h4 className="text-slate-700 font-bold text-sm mb-1">اضغط لرفع صورة من جهازك</h4>
                        <p className="text-slate-400 text-xs">أو قم بسحب وإفلات الصورة هنا</p>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onClick={e => { (e.target as HTMLInputElement).value = ''; }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                    />
                    {uploadProgress && saveStatus === 'uploading' && <UploadProgressBar progress={uploadProgress} />}
                    {!previewUrl && !form.thumbnailFile && (
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
                    )}
                  </Field>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
              <button onClick={closeModal} className="w-full sm:w-auto px-6 py-3 text-slate-600 font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all focus:ring-2 focus:ring-slate-200 order-2 sm:order-1">إلغاء الأمر</button>
              <button
                onClick={handleSave}
                disabled={!isFormValid || saveStatus === 'loading' || saveStatus === 'uploading' || saveStatus === 'success'}
                className="w-full sm:w-auto px-8 py-3 text-white rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 order-1 sm:order-2"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                {(saveStatus === 'loading' || saveStatus === 'uploading') ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> جاري المعالجة...</>
                ) : saveStatus === 'success' ? (
                  <><CheckCircle className="w-5 h-5 animate-bounce" /> تم الاعتماد!</>
                ) : editingId ? (
                  <><Edit3 className="w-5 h-5" /> حفظ التعديلات</>
                ) : (
                  <><Plus className="w-5 h-5" strokeWidth={3} /> إطلاق المقرر</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {!form.isPaid && <ModuleManagerModal
        isOpen={showModuleManager}
        onClose={() => setShowModuleManager(false)}
        initialCourseId={editingId ?? undefined}
      />}
    </div>
  );
}

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
  return `w-full px-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 ${hasError
    ? 'border-red-300 bg-red-50/50 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:bg-white'
    : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
    } ${extra}`;
}

// ─── Component Helpers ────────────────────────────────────────────────────────

