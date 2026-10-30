import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, BookMarked, X, Loader2, CheckCircle, AlertCircle, Trash2, Search, Filter, PlayCircle, Clock, Edit3, AlertTriangle, Eye, CheckSquare, Square, Copy, GripVertical, FileWarning, Timer, ChevronDown, FileText, FileType2, Link
} from 'lucide-react';
import { useCoursesStore, useLessonsStore, useModulesStore } from '../../../store';
import { Loader } from '../../../components/feedback/Loader';
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcuts';
import { BulkActionBar } from '../../../components/ui/BulkActionBar';
import { LessonPreviewModal } from '../../../components/ui/LessonPreviewModal';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { ActivityLog } from '../../../components/ui/ActivityLog';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { HealthBadge } from '../../../components/ui/HealthBadge';
import { Pagination } from '../../../components/ui/Pagination';
import { StickyToolbar } from '../../../components/ui/StickyToolbar';
import { GlobalSearch } from '../../../components/ui/GlobalSearch';
import { AdvancedFilters } from '../../../components/ui/AdvancedFilters';
import { SavedViews } from '../../../components/ui/SavedViews';
import { CascadeDeleteModal } from '../../../components/ui/CascadeDeleteModal';
import { PageGuide } from '../../../components/ui/PageGuide';
import { Layers } from 'lucide-react';
import type { BackendModule } from '../../../types/api';
import { lessonService } from '../../../services/api/lessons.api';
import { mediaApi, type UploadProgress } from '../../../services/api/media.api';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';

const normalizeSearchText = (value: unknown) => String(value ?? '')
  .normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLocaleLowerCase().trim();

function PortalSelect({ value, onChange, options, placeholder, className, disabled }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      let top = rect.bottom + window.scrollY;
      if (spaceBelow < 240 && rect.top > spaceBelow) {
        top = rect.top + window.scrollY - Math.min(240, options.length * 40) - 8;
      }
      setCoords({ top, left: rect.left + window.scrollX, width: rect.width });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
      return () => {
        window.removeEventListener('scroll', updateCoords, true);
        window.removeEventListener('resize', updateCoords);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        (!popupRef.current || !popupRef.current.contains(e.target as Node))
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  const selectedOpt = options.find((o: any) => o.value === value);

  return (
    <div ref={triggerRef} className="relative w-full">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate flex-1 min-w-0 text-right">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0 mr-2`} />
      </div>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          dir="rtl"
          style={{ position: 'absolute', top: coords.top + 4, left: coords.left, width: coords.width, maxWidth: coords.width, zIndex: 999999 }}
          className="bg-white border border-slate-200 shadow-xl rounded-xl max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar"
        >
          {options.map((opt: any) => (
            <div
              key={opt.value}
              className={`px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm transition-colors break-words whitespace-normal leading-relaxed border-b border-slate-50 last:border-0 ${value === opt.value ? 'bg-emerald-50 text-emerald-700 font-bold' : ''}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
          {options.length === 0 && <div className="px-4 py-3 text-sm text-slate-500 text-center">لا توجد خيارات</div>}
        </div>,
        document.body
      )}
    </div>
  );
}

type LocalContentType = 'video' | 'markdown' | 'pdf' | 'live';
const TYPE_CONFIG: Record<LocalContentType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  video: { label: 'مقطع فيديو', icon: PlayCircle, color: '#3B82F6', bg: '#EFF6FF' },
  markdown: { label: 'محتوى نصي (Markdown)', icon: FileText, color: '#6366F1', bg: '#EEF2FF' },
  pdf: { label: 'مستند PDF', icon: FileType2, color: '#EF4444', bg: '#FEF2F2' },
  live: { label: 'درس مباشر', icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
};

interface FormState {
  courseId: string;
  moduleId: string;
  title: string;
  description: string;
  objectives: string[];
  order: string;
  type: LocalContentType;
  videoUrl: string;
  pdfUrl: string;
  content: string;
  scheduledAt: string;
  durationMinutes: string;
  dayNumber: string;
  isMandatory: boolean;
  isFreePreview: boolean;
  liveStatus: 'SCHEDULED' | 'LIVE_NOW' | 'COMPLETED';
  liveMeetingUrl: string;
  recordingVideoUrl: string;
  status: 'DRAFT' | 'PUBLISHED';
}
const emptyLessonForm: FormState = { courseId: '', moduleId: '', title: '', description: '', objectives: [''], order: '', type: 'video', videoUrl: '', pdfUrl: '', content: '', scheduledAt: '', durationMinutes: '', dayNumber: '', isMandatory: true, isFreePreview: false, liveStatus: 'SCHEDULED', liveMeetingUrl: '', recordingVideoUrl: '', status: 'DRAFT' };

type FormError = Partial<Record<keyof FormState | 'submit', string>>;
type SaveStatus = 'idle' | 'loading' | 'success' | 'error';

export function LessonsPage({ scopedCourseId, scopedLessonId }: { scopedCourseId?: string; scopedLessonId?: string } = {}) {
  const navigate = useNavigate();
  const { courses, fetchCourses } = useCoursesStore();
  const { lessons, addLesson, updateLesson, deleteLesson, fetchLessons, fetchLessonsPage, serverPage, serverTotalPages, serverTotal, serverLimit, error, isLoading, clearLessons } = useLessonsStore();
  const { modules: allModules, fetchModules, fetchModulesByCourse } = useModulesStore();

  const [showModal, setShowModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'lesson'; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [courseFilter, setCourseFilter] = useState<string>(scopedCourseId || 'all');
  const [activeView, setActiveView] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isPaginating, setIsPaginating] = useState(false);

  // Whether server-side pagination is active (only when scoped to a course and no client-side filtering)
  const useServerPagination = Boolean(scopedCourseId) && !searchQuery && activeView === 'all';

  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<any>(null);
  const autoPreviewOpened = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrentPage(1); setSelectedLessons([]); }, [searchQuery, courseFilter, activeView, itemsPerPage]);
  useEffect(() => { setCourseFilter(scopedCourseId || 'all'); }, [scopedCourseId]);

  useEffect(() => {
    void fetchCourses();
    if (scopedCourseId) {
      // Clear stale lessons from previous course immediately to avoid showing wrong data
      clearLessons();
      // Use server-side pagination when scoped to a specific course
      void fetchLessonsPage(scopedCourseId, 1, itemsPerPage);
      void fetchModulesByCourse(scopedCourseId);
    } else {
      void fetchLessons();
      void fetchModules();
    }
  }, [fetchCourses, fetchLessons, fetchLessonsPage, fetchModules, fetchModulesByCourse, clearLessons, scopedCourseId, itemsPerPage]);

  const [form, setForm] = useState<FormState>(emptyLessonForm);
  const [errors, setErrors] = useState<FormError>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [lessonPdfs, setLessonPdfs] = useState<Array<{ id?: string; title?: string; url?: string; file?: File; order?: number }>>([]);
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [newPdfTitle, setNewPdfTitle] = useState('');
  const [pdfManagementError, setPdfManagementError] = useState('');
  const [pdfManagementLoading, setPdfManagementLoading] = useState(false);
  const [pdfManagementProgress, setPdfManagementProgress] = useState<UploadProgress | null>(null);
  const [pdfListLoadFailed, setPdfListLoadFailed] = useState(false);
  const pdfUploadInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<UploadProgress | null>(null);
  const [videoUploadError, setVideoUploadError] = useState('');
  const [videoFileInfo, setVideoFileInfo] = useState<{name: string; size: number} | null>(null);

  const uploadLessonVideo = async (file?: File) => {
    if (!file || !form.courseId) return;
    setVideoUploadError(''); setVideoUploadProgress({ percent: 0, loaded: 0, total: file.size });
    try {
      const uploaded = await mediaApi.uploadVideo(file, form.courseId, setVideoUploadProgress);
      const videoUrl = uploaded.videoUrl ?? uploaded.url;
      if (!videoUrl) throw new Error('لم يُرجع الخادم رابط الفيديو.');
      setForm(current => ({ ...current, videoUrl }));
      setVideoFileInfo({ name: uploaded.originalName ?? file.name, size: uploaded.size ?? file.size });
      setVideoUploadProgress({ percent: 100, loaded: file.size, total: file.size });
    } catch (error: any) {
      setVideoUploadError(error?.response?.data?.message ?? error?.message ?? 'فشل رفع الفيديو.');
      setVideoUploadProgress(null);
    }
  };

  // Persist "Create New Lesson" form state
  useEffect(() => {
    if (showModal && !editingLessonId) {
      const timer = setTimeout(() => {
        sessionStorage.setItem('create_lesson_form_state', JSON.stringify(form));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [form, showModal, editingLessonId]);

  const filteredModules = scopedCourseId
    ? allModules.filter(module => String(module.courseId) === String(scopedCourseId))
    : allModules;
  const selectedCourse = courses.find(course => String(course.id) === String(scopedCourseId ?? form.courseId));
  const isNonModuleCourse = Boolean(
    selectedCourse?.isPaid ||
    (selectedCourse as any)?.isPaid === 1 ||
    (selectedCourse as any)?.isPaid === 'true' ||
    (selectedCourse?.price !== undefined && Number(selectedCourse.price) > 0)
  );
  const modulesLoading = false;
  const [modulesError, setModulesError] = useState<string | null>(null);

  // Keyboard Shortcuts
  useKeyboardShortcut('f', true, () => searchInputRef.current?.focus()); // Ctrl+F
  useKeyboardShortcut('escape', false, () => {
    if (showModal) closeModal();
    if (previewLesson) setPreviewLesson(null);
    setSelectedLessons([]);
  });
  useKeyboardShortcut('s', true, (e) => {
    if (showModal && formStep === 3 && saveStatus !== 'loading' && saveStatus !== 'success') {
      e.preventDefault();
      void handleSave();
    }
  });

  const resetModal = useCallback(() => {
    setForm(emptyLessonForm);
    setErrors({});
    setSaveStatus('idle');
    setModulesError(null);
    setEditingLessonId(null);
    setLessonPdfs([]); setNewPdfUrl(''); setNewPdfTitle(''); setPdfManagementError(''); setPdfManagementLoading(false); setPdfManagementProgress(null); setPdfListLoadFailed(false);
    setVideoUploadProgress(null);
    setVideoUploadError('');
    setVideoFileInfo(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
    setFormStep(1);
  }, []);

  useEffect(() => {
    if (!showModal || !editingLessonId) return;
    let active = true;
    setPdfManagementLoading(true);
    setPdfListLoadFailed(false);
    void lessonService.getPdfs(editingLessonId).then(items => { if (active) setLessonPdfs(items); }).catch((err: any) => { if (active) { setPdfManagementError(err?.message || 'تعذر تحميل ملفات PDF'); setPdfListLoadFailed(true); } }).finally(() => { if (active) setPdfManagementLoading(false); });
    return () => { active = false; };
  }, [showModal, editingLessonId]);

  const openModal = () => {
    resetModal();
    const effectiveCourseId = scopedCourseId ? String(scopedCourseId) : '';
    const defaultModuleId = isNonModuleCourse
      ? effectiveCourseId
      : (filteredModules[0]?.id ? String(filteredModules[0].id) : '');
    setForm({
      ...emptyLessonForm,
      courseId: effectiveCourseId,
      moduleId: defaultModuleId,
    });
    sessionStorage.removeItem('create_lesson_form_state');
    setShowModal(true);
  };

  const openEdit = async (lesson: { id: string; courseId: string; title: string; description: string; order: number }) => {
    try {
      // Fetch the canonical lesson (including persisted PDF rows and media URLs)
      // before populating the edit form; list rows may be stale after attachment updates.
      lesson = { ...lesson, ...await lessonService.getById(String(lesson.id)) };
    } catch (err: any) {
      setModulesError(err?.message || 'تعذر تحميل تفاصيل الدرس قبل التعديل.');
      return;
    }
    resetModal();
    setLessonPdfs(((lesson as any).pdfFiles ?? []).map((pdf: any, index: number) => ({ ...pdf, title: pdf.title || `PDF ${index + 1}`, order: pdf.order ?? index })).sort((a: any, b: any) => a.order - b.order));
    setEditingLessonId(lesson.id);
    setShowModal(true);
    const parentModule = allModules.find(m => String(m.id) === String(lesson.courseId));
    const directCourse = courses.find(course => String(course.id) === String(lesson.courseId));
    const lessonCourseId = scopedCourseId ?? String(directCourse?.isPaid ? directCourse.id : parentModule?.courseId ?? lesson.courseId);
    const lessonCourse = courses.find(course => String(course.id) === String(lessonCourseId));
    const lessonIsNonModule = lessonCourse?.isPaid === true;
    if (parentModule && !lessonIsNonModule) {
      setForm({
        courseId: String(lessonCourseId),
        moduleId: lesson.courseId,
        title: lesson.title,
        description: lesson.description || '',
        objectives: Array.isArray((lesson as any).objectives) && (lesson as any).objectives.length ? (lesson as any).objectives.map(String) : [''],
        order: String(lesson.order),
        type: (lesson as any).type || 'video',
        videoUrl: (lesson as any).videoUrl || '',
        pdfUrl: (lesson as any).pdfUrl || '',
        content: (lesson as any).content || '',
        scheduledAt: (lesson as any).scheduledAt ? new Date((lesson as any).scheduledAt).toISOString().slice(0,16) : '',
        durationMinutes: String((lesson as any).durationMinutes ?? ''), dayNumber: String((lesson as any).dayNumber ?? ''),
        isMandatory: (lesson as any).isMandatory !== false, isFreePreview: Boolean((lesson as any).isFreePreview),
        liveStatus: (lesson as any).liveStatus ?? 'SCHEDULED',
        liveMeetingUrl: (lesson as any).liveMeetingUrl ?? '', recordingVideoUrl: (lesson as any).recordingVideoUrl ?? '',
        status: (lesson as any).isPublished ? 'PUBLISHED' : 'DRAFT',
      });
    } else {
      if (!lessonIsNonModule) setModulesError('تعذر تحميل الوحدة المرتبطة بهذا الدرس.');
      setForm({
        courseId: String(lessonCourseId),
        moduleId: lessonIsNonModule ? String(lessonCourseId) : lesson.courseId,
        title: lesson.title,
        description: lesson.description || '',
        objectives: Array.isArray((lesson as any).objectives) && (lesson as any).objectives.length ? (lesson as any).objectives.map(String) : [''],
        order: String(lesson.order),
        type: (lesson as any).type || 'video',
        videoUrl: (lesson as any).videoUrl || '',
        pdfUrl: (lesson as any).pdfUrl || '',
        content: (lesson as any).content || '',
        scheduledAt: (lesson as any).scheduledAt ? new Date((lesson as any).scheduledAt).toISOString().slice(0,16) : '',
        durationMinutes: String((lesson as any).durationMinutes ?? ''), dayNumber: String((lesson as any).dayNumber ?? ''),
        isMandatory: (lesson as any).isMandatory !== false, isFreePreview: Boolean((lesson as any).isFreePreview),
        liveStatus: (lesson as any).liveStatus ?? 'SCHEDULED',
        liveMeetingUrl: (lesson as any).liveMeetingUrl ?? '', recordingVideoUrl: (lesson as any).recordingVideoUrl ?? '',
        status: (lesson as any).isPublished ? 'PUBLISHED' : 'DRAFT',
      });
    }
  };

  const openPreview = async (lesson: any) => {
    setPreviewLesson(lesson);
    try {
      const details = await lessonService.getById(String(lesson.id));
      setPreviewLesson({ ...lesson, ...details });
    } catch {
      // Keep the already loaded lesson preview available if details cannot be fetched.
    }
  };

  useEffect(() => {
    if (!scopedLessonId || autoPreviewOpened.current) return;
    const lesson = lessons.find(item => String(item.id) === String(scopedLessonId));
    if (!lesson) return;
    autoPreviewOpened.current = true;
    void openPreview(lesson);
  }, [scopedLessonId, lessons]);

  const closeModal = () => {
    const isDirty = form.courseId || form.moduleId || form.title || form.content || form.order;
    if (isDirty && saveStatus !== 'success' && !confirm('لديك تغييرات غير محفوظة. هل أنت متأكد من الإلغاء؟')) {
      return;
    }
    if (!editingLessonId) {
      sessionStorage.removeItem('create_lesson_form_state');
    }
    setShowModal(false);
    resetModal();
  };

  useEffect(() => {
    if (isNonModuleCourse) {
      const courseIdStr = String(scopedCourseId ?? form.courseId ?? '');
      if (courseIdStr && form.moduleId !== courseIdStr) {
        setForm(current => ({ ...current, moduleId: courseIdStr }));
      }
    } else if (form.moduleId && !filteredModules.some(m => String(m.id) === form.moduleId)) {
      setForm(current => ({ ...current, moduleId: '' }));
    }
  }, [form.courseId, form.moduleId, filteredModules, isNonModuleCourse, scopedCourseId]);

  const suggestedOrder = (): number => {
    const targetId = isNonModuleCourse ? (scopedCourseId ?? form.courseId) : form.moduleId;
    if (!targetId) return 1;
    return lessons.filter(l => String(l.courseId) === String(targetId)).length + 1;
  };

  const handleAttachPdfUrl = async () => {
    let parsedUrl: URL;
    try { parsedUrl = new URL(newPdfUrl.trim()); } catch { setPdfManagementError('أدخل رابط PDF صحيحاً.'); return; }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) { setPdfManagementError('يجب أن يبدأ الرابط بـ http أو https.'); return; }
    const entry = { title: newPdfTitle.trim() || newPdfUrl.trim().split('/').pop() || `PDF ${lessonPdfs.length + 1}`, url: newPdfUrl.trim(), order: lessonPdfs.length };
    if (!editingLessonId) {
      setLessonPdfs(items => [...items, { ...entry, order: items.length }]);
      setNewPdfTitle(''); setNewPdfUrl(''); setPdfManagementError('');
      return;
    }
    setPdfManagementLoading(true);
    try {
      await lessonService.addPdf(editingLessonId, entry);
      setNewPdfTitle(''); setNewPdfUrl(''); setLessonPdfs(await lessonService.getPdfs(editingLessonId)); setPdfManagementError('');
    } catch (err: any) { setPdfManagementError(err?.message || 'تعذر إضافة الملف'); }
    finally { setPdfManagementLoading(false); }
  };

  const validate = (step: 1 | 2 | 3 = formStep): boolean => {
    const e: FormError = {};
    const effectiveCourseId = form.courseId || scopedCourseId || '';
    if (step === 1 || step === 3) {
      if (!effectiveCourseId) {
        e.title = 'تعذر تحديد المقرر المرتبط بهذا الدرس';
      } else if (!isNonModuleCourse && !form.moduleId) {
        e.moduleId = 'يرجى اختيار الوحدة التي ينتمي لها الدرس';
      }
      if (!form.title || !form.title.trim()) {
        e.title = 'عنوان الدرس مطلوب';
      } else if (form.title.trim().length < 2) {
        e.title = 'يجب أن يكون عنوان الدرس حرفين على الأقل';
      }
      if (!form.order || !String(form.order).trim()) {
        e.order = 'ترتيب الدرس مطلوب داخل الوحدة';
      } else if (isNaN(Number(form.order)) || Number(form.order) < 1) {
        e.order = 'يجب أن يكون الترتيب رقماً موجباً';
      }
    }

    if (step === 3) {
      if (form.type === 'video' && !form.videoUrl.trim()) e.videoUrl = 'رابط الفيديو مطلوب';
      if (form.type === 'pdf' && !form.pdfUrl && !lessonPdfs.length) e.pdfUrl = 'يرجى اختيار ملف PDF';
    }
    setErrors(e);
    if (step === 3 && (e.moduleId || e.title || e.order)) setFormStep(1);
    return Object.keys(e).length === 0;
  };


  const handleSave = async () => {
    if (saveInFlightRef.current || pdfManagementLoading || pdfListLoadFailed) return;
    if (!validate(3)) return;
    saveInFlightRef.current = true;
    setSaveStatus('loading');
    const courseIdToUse = form.courseId || scopedCourseId || '';
    const course = courses.find(c => String(c.id) === String(courseIdToUse));
    if (!course && !courseIdToUse) {
      saveInFlightRef.current = false;
      setSaveStatus('error');
      setErrors(previous => ({ ...previous, submit: 'تعذر تحديد المقرر المرتبط بهذا الدرس.' }));
      return;
    }
    try {

      const payload: any = {
        courseId: courseIdToUse,
        isPaidCourse: isNonModuleCourse,
        courseName: course?.title || '',
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        objectives: form.objectives.map(objective => objective.trim()).filter(Boolean),
        order: Number(form.order),
        type: form.type, // إرسال النوع الحقيقي للباكاند بدون تحايل
        videoUrl: (form.type === 'video' || form.type === 'live') && form.videoUrl.trim() ? form.videoUrl.trim() : undefined,
        content: form.content.trim() || undefined,
        pdfUrl: (form.type === 'pdf' || form.type === 'video') ? (lessonPdfs.find(pdf => pdf.url)?.url || form.pdfUrl.trim() || undefined) : undefined,
        pdfFiles: lessonPdfs.length
          ? lessonPdfs.map((pdf, index) => ({ title: pdf.title || `PDF ${index + 1}`, url: pdf.url || '', file: pdf.file, order: index }))
          : form.pdfUrl.trim() ? [{ title: form.pdfUrl.trim().split('/').pop() || form.title.trim(), url: form.pdfUrl.trim(), order: 0 }] : [],
        pdf: undefined,
        // إرسال true بشكل صريح للـ PDF والنص
        isReading: (form.type === 'pdf' || form.type === 'markdown') ? true : false,
        status: form.status,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
        dayNumber: form.dayNumber ? Number(form.dayNumber) : undefined,
        isMandatory: form.isMandatory,
        // Persist the form value explicitly, including `false`; the API service
        // sends this flag as JSON because multipart boolean parsing is unreliable.
        isFreePreview: form.isFreePreview,
        liveStatus: form.liveStatus,
        liveMeetingUrl: form.liveMeetingUrl || undefined,
        recordingVideoUrl: form.recordingVideoUrl || undefined,
      };

      if (!isNonModuleCourse && form.moduleId) {
        payload.moduleId = Number(form.moduleId);
      }

      if (editingLessonId) {
        // Editing lesson details must not reassign its backend module. The
        // form's courseId is a course ID for paid courses, while lesson PATCH
        // interprets courseId as moduleId; sending it moves the lesson.
        const { courseId: _courseId, ...lessonChanges } = payload;
        await updateLesson({ id: editingLessonId, ...lessonChanges });
        toast.success('تم تحديث الدرس بنجاح');
      } else {
        await addLesson(payload);
        toast.success('تم إنشاء الدرس بنجاح');
        sessionStorage.removeItem('create_lesson_form_state');
      }
      setSaveStatus('success');
      window.setTimeout(() => {
        setShowModal(false);
        resetModal();
      }, 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'تعذر حفظ الدرس');
      setSaveStatus('error');
      const backendMessage = err?.response?.data?.message || err?.message || 'تعذر حفظ الدرس. تحقق من بيانات الدرس والملفات المرفقة.';
      const errorMsg = Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage;
      setErrors(prev => ({ ...prev, submit: `خطأ من الخادم: ${errorMsg}` }));
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const handleDelete = (lessonId: string) => {
    setDeleteTarget({ type: 'lesson', id: lessonId });
  };

  const goToNextStep = () => {
    if (formStep === 1) {
      const isValid = validate(1);
      if (!isValid) {
        toast.error('يرجى التحقق من ملء الحقول الإلزامية (عنوان الدرس والترتيب)');
        return;
      }
    }
    setFormStep(current => current === 1 ? 2 : 3);
    setErrors(current => ({ ...current, submit: undefined }));
  };

  const handleBulkAction = async (action: 'publish' | 'archive' | 'delete' | 'duplicate') => {
    if (selectedLessons.length === 0) return;
    if (action === 'delete' && !confirm(`تأكيد حذف ${selectedLessons.length} درس نهائياً؟ لا يمكن التراجع.`)) return;

    setBulkActionLoading(true);
    try {
      for (const id of selectedLessons) {
        if (action === 'delete') await deleteLesson(id);
        else if (action === 'publish') await updateLesson({ id, isPublished: true });
        else if (action === 'archive') await updateLesson({ id, isPublished: false });
        else if (action === 'duplicate') {
          const l = lessons.find(x => x.id === id);
          if (l) await addLesson({ courseId: l.courseId, courseName: l.courseName, title: l.title + ' (نسخة)', description: l.description, order: l.order + 1 });
        }
      }
      const successMessage = { publish: 'تم نشر الدروس المحددة', archive: 'تمت أرشفة الدروس المحددة', delete: 'تم حذف الدروس المحددة', duplicate: 'تم نسخ الدروس المحددة' }[action];
      toast.success(successMessage);
      setSelectedLessons([]);
    } catch {
      toast.error('حدث خطأ أثناء تنفيذ الإجراء المجمع.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const filteredLessons = lessons.filter(l => {
    const query = normalizeSearchText(searchQuery);
    const lessonModuleForSearch = allModules.find(module => String(module.id) === String(l.courseId));
    const courseForSearch = courses.find(course => String(course.id) === String(lessonModuleForSearch?.courseId));
    const matchesSearch = !query || [l.title, l.description, l.courseName, lessonModuleForSearch?.title, courseForSearch?.title, l.objectives]
      .some(value => normalizeSearchText(Array.isArray(value) ? value.join(' ') : value).includes(query));
    const matchesStatus = true;
    // Lesson.courseId is the module ID in this dashboard's backend adapter.
    // Comparing it directly to a course ID leaks lessons when IDs happen to overlap.
    const isCoursePaid = (c: any) => Boolean(c?.isPaid || c?.isPaid === 1 || c?.isPaid === 'true' || (c?.price !== undefined && Number(c?.price) > 0));
    const lessonModule = allModules.find(module => String(module.id) === String(l.courseId));
    const directPaidCourse = courses.find(course => isCoursePaid(course) && String(course.id) === String(l.courseId));
    const matchesCourse = courseFilter === 'all'
      || String(l.courseId) === courseFilter
      || String(directPaidCourse?.id ?? lessonModule?.courseId ?? l.courseId) === courseFilter;

    let matchesView = true;
    if (activeView === 'published') matchesView = !!l.isPublished;
    if (activeView === 'drafts') matchesView = !l.isPublished;
    if (activeView === 'incomplete') matchesView = !l.hasContent;

    return matchesSearch && matchesStatus && matchesCourse && matchesView
      && (!scopedLessonId || String(l.id) === String(scopedLessonId));
  });

  const isCoursePaid = (c: any) => Boolean(c?.isPaid || c?.isPaid === 1 || c?.isPaid === 'true' || (c?.price !== undefined && Number(c?.price) > 0));
  const courseLessons = scopedCourseId
    ? lessons.filter(lesson => {
        if (String(lesson.courseId) === String(scopedCourseId)) return true;
        const directPaidCourse = courses.find(course => isCoursePaid(course) && String(course.id) === String(lesson.courseId));
        const lessonModule = allModules.find(module => String(module.id) === String(lesson.courseId));
        return String(directPaidCourse?.id ?? lessonModule?.courseId ?? lesson.courseId) === String(scopedCourseId);
      })
    : lessons;

  const stats = {
    total: courseLessons.length,
    published: courseLessons.filter(l => l.isPublished).length,
    drafts: courseLessons.filter(l => !l.isPublished).length,
    missingContent: courseLessons.filter(l => !l.hasContent).length,
    healthScore: courseLessons.length ? Math.round((courseLessons.filter(l => l.hasContent && l.isPublished).length / courseLessons.length) * 100) : 0
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-emerald-50/50', 'border-emerald-200');
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId === targetId) return;

    const src = lessons.find(l => l.id === sourceId);
    const tgt = lessons.find(l => l.id === targetId);
    if (src && tgt) {
      const srcOrder = src.order;
      updateLesson({ id: src.id, order: tgt.order });
      updateLesson({ id: tgt.id, order: srcOrder });
    }
  };

  const paginatedLessons = useServerPagination
    ? [...filteredLessons].sort((a, b) => a.order - b.order)
    : [...filteredLessons]
        .sort((a, b) => a.order - b.order)
        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const hasFetchedOnceRef = useRef(false);
  if (!isLoading && (lessons.length > 0 || !scopedCourseId)) hasFetchedOnceRef.current = true;
  // Reset when scoped course changes so we show spinner for new course
  const prevScopedCourseIdRef = useRef(scopedCourseId);
  if (prevScopedCourseIdRef.current !== scopedCourseId) {
    prevScopedCourseIdRef.current = scopedCourseId;
    hasFetchedOnceRef.current = false;
  }
  const hasFetchedOnce = hasFetchedOnceRef.current;

  if (isLoading && lessons.length === 0 && !showModal) return <Loader fullPage />;

  return (
    <div className="font-sans antialiased text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1">
            إدارة الدروس والمحتوى
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            تصفح، أضف، ونظّم {courseLessons.length} درس مسجّل{scopedCourseId ? ' في هذا المقرر' : '. قم ببناء الهيكل التعليمي لمقرراتك'}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={openModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            إنشاء درس جديد
          </button>
        </div>
      </div>

      <PageGuide
        title="دليل إدارة الدروس"
        description="خطوات إدارة الدروس والوحدات التعليمية الخاصة بكل مقرر"
        steps={[
          {
            title: "إدارة الوحدات التعليمية",
            description: "استخدم زر 'إدارة الوحدات' لإنشاء وترتيب فصول/وحدات المقرر قبل إضافة الدروس إليها."
          },
          {
            title: "إضافة درس جديد",
            description: "انقر على 'إنشاء درس جديد' لتحديد نوع المحتوى (فيديو، مستند، نص) وربطه بمقرر ووحدة معينة."
          },
          {
            title: "تصفية متقدمة",
            description: "استخدم شريط الفلاتر للوصول السريع إلى الدروس المنشورة، المسودات، أو الدروس بدون محتوى."
          }
        ]}
        tips={[
          "لا تنس تحديد حالة الدرس كـ 'منشور' عندما يكون جاهزاً ليظهر للطلاب.",
          "يمكنك النقر على زر 'توليد بالذكاء الاصطناعي' أثناء كتابة الدرس للحصول على أفكار ونصوص سريعة."
        ]}
      />

      {/* Sticky Advanced Filters */}
      <StickyToolbar position="top" className="!flex-col !items-stretch">
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="relative group w-full min-w-0">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الدرس أو وصفه أو المقرر..."
              className="min-h-12 w-full min-w-0 pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
          {!scopedCourseId && (
            <div className="w-full min-w-0">
              <AdvancedFilters
                filters={[
                  {
                    id: 'course',
                    value: courseFilter,
                    onChange: setCourseFilter,
                    options: [
                      { label: 'جميع المقررات', value: 'all' },
                      ...courses.map(c => ({ label: c.title, value: String(c.id) }))
                    ]
                  }
                ]}
              />
            </div>
          )}
        </div>

        <SavedViews
          activeView={activeView}
          onChange={setActiveView}
          views={[
            { id: 'all', label: 'الكل', icon: Layers },
            { id: 'published', label: 'منشور', icon: CheckCircle },
            { id: 'drafts', label: 'مسودات', icon: Clock },
            { id: 'incomplete', label: 'غير مكتمل', icon: AlertTriangle }
          ]}
        />
      </StickyToolbar>

      {/* Performance Monitoring Widgets */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <div className="text-slate-500 text-xs font-bold flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-indigo-500" /> إجمالي الدروس</div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
        </div>
      </div>

      {error && courseLessons.length === 0 && lessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-red-100 p-12 text-center shadow-xl shadow-red-500/5 flex flex-col items-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-inner">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">فشل تحميل الدروس</h3>
          <p className="text-slate-500 mb-8 max-w-md">{error}</p>
          <button onClick={() => void fetchLessons()} className="px-8 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold shadow-md shadow-red-500/20">
            إعادة المحاولة
          </button>
        </div>
      ) : isLoading && courseLessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-slate-500 font-semibold">جارٍ تحميل الدروس...</p>
          </div>
        </div>
      ) : !isLoading && !hasFetchedOnce ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-slate-500 font-semibold">جارٍ تحميل الدروس...</p>
          </div>
        </div>
      ) : courseLessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
          <EmptyState
            icon={BookMarked}
            title="لا توجد دروس حالياً لهذا المقرر"
            description="أضف درساً جديداً ليظهر هنا."
            action={
              <button onClick={openModal} className="px-6 py-3 mt-2 text-white rounded-xl transition-all shadow-md hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 700 }}>
                إنشاء الدرس الأول
              </button>
            }
          />
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
          <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد دروس مطابقة</h3>
          <p className="text-slate-400">لم يتم العثور على ما يطابق بحثك "{searchQuery}"</p>
          <button onClick={() => setSearchQuery('')} className="mt-4 text-emerald-600 hover:text-emerald-700 font-semibold text-sm underline underline-offset-4">مسح عوامل التصفية</button>
        </div>
      ) : (
        <div id="lessons-table-container" className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-6 relative">
          {(isLoading || isPaginating) && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3 transition-opacity duration-200 min-h-[300px]">
              <div className="bg-white px-6 py-3.5 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                <span className="text-sm font-bold text-slate-700">
                  {useServerPagination
                    ? `جارٍ تحميل الصفحة ${serverPage}...`
                    : `جارٍ تحميل الصفحة ${currentPage}...`}
                </span>
              </div>
            </div>
          )}

          {/* Mobile Stacked Cards Layout with Clear Visual Separation */}
          <div className="md:hidden space-y-4 p-3 bg-slate-50/50">
            {/* Mobile Select All Header */}
            <div className="p-3.5 flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedLessons(p => p.length === paginatedLessons.length ? [] : paginatedLessons.map(l => l.id))}
                  className="text-slate-400 hover:text-emerald-500 transition-colors p-1"
                >
                  {selectedLessons.length > 0 && selectedLessons.length === paginatedLessons.length ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                </button>
                <span className="text-xs font-bold text-slate-600">تحديد كل الدروس في الصفحة</span>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                {paginatedLessons.length} درس
              </span>
            </div>

            {paginatedLessons.map(lesson => {
              const moduleObj = allModules.find(m => String(m.id) === String(lesson.courseId));
              return (
                <details
                  key={lesson.id}
                  className={`group bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all ${selectedLessons.includes(lesson.id) ? 'border-emerald-400 ring-2 ring-emerald-50' : 'border-slate-200/80'
                    }`}
                >
                  <summary className="p-4 flex items-center justify-between cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-3 w-full">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedLessons(p => p.includes(lesson.id) ? p.filter(id => id !== lesson.id) : [...p, lesson.id]);
                        }}
                        className="text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                      >
                        {selectedLessons.includes(lesson.id) ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                      </button>

                      <div className="flex flex-col min-w-0 flex-1">
                        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void openPreview(lesson); }} className="text-right text-slate-900 font-extrabold text-sm truncate hover:text-emerald-700 hover:underline" title={`عرض تفاصيل ${lesson.title}`}>{lesson.title}</button>
                        <div className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                          <BookMarked className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lesson.courseName || 'مقرر مجهول'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {lesson.order}
                        </div>
                        <StatusBadge status={lesson.isPublished ? 'published' : 'draft'} />
                        <ChevronDown className="w-5 h-5 text-slate-400 group-open:-rotate-180 transition-transform" />
                      </div>
                    </div>
                  </summary>

                  {/* Expanded Content */}
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      {/* Unit */}
                      <div className="flex items-center gap-1.5 bg-emerald-50/80 text-emerald-700 px-2.5 py-1.5 rounded-lg border border-emerald-100/50">
                        <Layers className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[120px]">{moduleObj ? moduleObj.title.replace(/^وحدة:\s*/, '') : 'الوحدة'}</span>
                      </div>

                      {/* Type */}
                      <div className="flex items-center gap-1.5 bg-amber-50/80 text-amber-700 px-2.5 py-1.5 rounded-lg border border-amber-100/50">
                        {lesson.type === 'video' || lesson.videoUrl ? <PlayCircle className="w-3.5 h-3.5" /> : lesson.type === 'pdf' || lesson.pdfUrl ? <FileText className="w-3.5 h-3.5" /> : <FileType2 className="w-3.5 h-3.5" />}
                        <span>{lesson.type === 'video' || lesson.videoUrl ? 'فيديو' : lesson.type === 'pdf' || lesson.pdfUrl ? 'ملف PDF' : lesson.content ? 'مقال' : 'درس'}</span>
                      </div>
                    </div>
                    {lesson.videoUrl && (
                      <a href={lesson.videoUrl} target="_blank" rel="noreferrer" dir="ltr" className="inline-flex max-w-full items-center gap-1.5 self-start break-all text-xs font-semibold text-blue-700 hover:underline">
                        <Link className="h-3.5 w-3.5 shrink-0" />
                        <span className="break-all">{lesson.videoUrl}</span>
                      </a>
                    )}

                    {/* Footer: Health & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1.5">
                        <HealthBadge condition={!lesson.hasContent} label="محتوى مفقود" type="danger" />
                      </div>

                      <div className="flex items-center gap-1 bg-white">
                        <button onClick={() => navigate(`/admin/lessons/${lesson.id}`)} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100">إدارة الدرس</button>
                        <button onClick={() => void openPreview(lesson)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="معاينة">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateLesson({ id: lesson.id, isPublished: !lesson.isPublished })} className={`p-2 rounded-xl transition-all ${lesson.isPublished ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={lesson.isPublished ? "مسودة" : "نشر"}>
                          {lesson.isPublished ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button onClick={() => void openEdit(lesson)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="تعديل">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => void handleDelete(lesson.id)} disabled={deleteStatus === 'loading'} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar pb-24">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 w-12">
                    <button onClick={() => setSelectedLessons(p => p.length === paginatedLessons.length ? [] : paginatedLessons.map(l => l.id))} className="text-slate-400 hover:text-emerald-500 transition-colors" title="تحديد الكل في هذه الصفحة">
                      {selectedLessons.length > 0 && selectedLessons.length === paginatedLessons.length ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                    </button>
                  </th>
                  {['التسلسل', 'معلومات الدرس', 'الارتباط التعليمي', 'المحتوى المرفق', 'حالة الظهور', 'سجل النشاط', 'الإجراءات'].map((h, i) => (
                    <th key={i} className="px-6 py-4 text-slate-500 font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {paginatedLessons.map(lesson => (
                  <tr
                    key={lesson.id}
                    draggable
                    onDragStart={e => handleDragStart(e, lesson.id)}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-emerald-50/50', 'border-emerald-200'); }}
                    onDragLeave={e => e.currentTarget.classList.remove('bg-emerald-50/50', 'border-emerald-200')}
                    onDrop={e => handleDrop(e, lesson.id)}
                    className={`hover:bg-slate-50/80 transition-colors group ${selectedLessons.includes(lesson.id) ? 'bg-emerald-50/30' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap w-12">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab hover:text-slate-500 active:cursor-grabbing" title="اسحب لإعادة الترتيب" />
                        <button onClick={() => setSelectedLessons(p => p.includes(lesson.id) ? p.filter(id => id !== lesson.id) : [...p, lesson.id])} className="text-slate-400 hover:text-emerald-500 transition-colors">
                          {selectedLessons.includes(lesson.id) ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold group-hover:bg-emerald-50 group-hover:border-emerald-200 group-hover:text-emerald-700 transition-colors">
                        {lesson.order}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => void openPreview(lesson)} className="mb-1 block max-w-xs truncate text-right font-bold text-slate-800 hover:text-emerald-700 hover:underline" title={`عرض تفاصيل ${lesson.title}`}>{lesson.title}</button>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <HealthBadge condition={!lesson.hasContent} label="درس غير مكتمل (بدون محتوى)" type="error" />
                        <HealthBadge condition={!lesson.isPublished} label="غير منشور" type="info" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Breadcrumbs items={[
                        { label: lesson.courseName || 'مقرر مجهول' },
                        { label: allModules.find(m => String(m.id) === String(lesson.courseId))?.title || 'وحدة مجهولة' },
                        { label: lesson.title }
                      ]} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-2">
                        {lesson.hasContent ? (
                          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-sm">
                            <PlayCircle className="w-3.5 h-3.5" /> مادة علمية متوفرة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200">
                            <AlertCircle className="w-3.5 h-3.5" /> قيد الإعداد
                          </span>
                        )}
                        {lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noreferrer" dir="ltr" title={lesson.videoUrl} className="inline-flex max-w-[220px] items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"><Link className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{lesson.videoUrl}</span></a>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <StatusBadge status={lesson.isPublished ? 'published' : 'draft'} />
                        {!lesson.isPublished && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            <Timer className="w-3 h-3" /> مجدول للنشر لاحقاً
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ActivityLog createdAt={lesson.createdAt} updatedAt={lesson.updatedAt} publishedAt={lesson.publishedAt} isPublished={lesson.isPublished} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/admin/lessons/${lesson.id}`)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100">إدارة الدرس</button>
                        <button onClick={() => void openPreview(lesson)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="وضع معاينة الطالب">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateLesson({ id: lesson.id, isPublished: !lesson.isPublished })} className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${lesson.isPublished ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={lesson.isPublished ? "إلغاء النشر (مسودة)" : "نشر الدرس"}>
                          {lesson.isPublished ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button
                          onClick={() => void openEdit(lesson)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(lesson.id)}
                          disabled={deleteStatus === 'loading'}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={useServerPagination ? serverPage : currentPage}
            totalItems={useServerPagination ? serverTotal : filteredLessons.length}
            itemsPerPage={useServerPagination ? serverLimit : itemsPerPage}
            isLoading={isLoading || isPaginating}
            onPageChange={(page) => {
              if (useServerPagination) {
                void fetchLessonsPage(scopedCourseId!, page, serverLimit);
              } else {
                setIsPaginating(true);
                setCurrentPage(page);
                setTimeout(() => setIsPaginating(false), 200);
              }
              const tableEl = document.getElementById('lessons-table-container');
              if (tableEl) {
                tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }}
            onItemsPerPageChange={(limit) => {
              setItemsPerPage(limit);
              if (useServerPagination) {
                void fetchLessonsPage(scopedCourseId!, 1, limit);
              }
            }}
          />
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedLessons.length}
        onClear={() => setSelectedLessons([])}
        onPublish={() => handleBulkAction('publish')}
        onArchive={() => handleBulkAction('archive')}
        onDuplicate={() => handleBulkAction('duplicate')}
        onDelete={() => handleBulkAction('delete')}
        loading={bulkActionLoading}
      />

      {/* Preview Modal */}
      {previewLesson && (
        <LessonPreviewModal
          lesson={previewLesson}
          onClose={() => setPreviewLesson(null)}
        />
      )}

      {/* Ultra-Modern Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all">
          <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl rounded-none sm:rounded-[2rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
                  <BookMarked className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-slate-800">{editingLessonId ? 'تعديل بيانات الدرس' : 'صياغة درس جديد'}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">أكمل بيانات الدرس عبر الخطوات الثلاث.</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 rounded-xl transition-all border border-slate-100 touch-target shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 sm:space-y-8">
              <div className="grid grid-cols-3 gap-2" aria-label="خطوات إنشاء الدرس">
                {(['تفاصيل الدرس', 'الجدولة', 'محتوى الدرس'] as const).map((label, index) => {
                  const number = (index + 1) as 1 | 2 | 3;
                  const active = formStep === number;
                  const complete = formStep > number;
                  return <div key={label} aria-current={active ? 'step' : undefined} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-xs font-bold sm:text-sm ${active ? 'bg-emerald-600 text-white' : complete ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${active ? 'bg-white/20' : complete ? 'bg-emerald-100' : 'bg-white'}`}>{number}</span><span>{label}</span></div>;
                })}
              </div>
              {errors.submit && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold">{errors.submit}</span>
                </div>
              )}
              {formStep === 1 && <>
              {/* Section 1: Relational Structure */}
              {!isNonModuleCourse && <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-5 relative">
                <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-100 text-xs font-bold text-emerald-600 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  المسار التنظيمي
                </div>

                <Field label="اختر الوحدة" required error={errors.moduleId} helperText="اختر الوحدة التي سينتمي إليها هذا الدرس.">
                  {modulesLoading ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 flex items-center gap-2 text-sm font-bold animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" /> جاري سحب بيانات الوحدات من الخادم...
                    </div>
                  ) : modulesError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {modulesError}
                    </div>
                  ) : filteredModules.length === 0 ? (
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 shadow-sm">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-500" /> لا توجد وحدات متاحة للاختيار.
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full min-w-0">
                      <select
                        value={form.moduleId}
                        onChange={e => {
                          const moduleId = e.target.value;
                          const selectedModule = allModules.find(module => String(module.id) === moduleId);
                          const courseId = scopedCourseId ?? String(selectedModule?.courseId ?? '');
                          setForm(p => ({ ...p, moduleId, courseId }));
                          setErrors(p => { const x = { ...p }; delete x.moduleId; delete x.courseId; return x; });
                        }}
                        className={`w-full ${inputCls(!!errors.moduleId)} pr-11 font-medium appearance-none`}
                        style={{ backgroundPosition: 'left 1rem center', backgroundSize: '1.5em 1.5em', backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat' }}
                      >
                        <option value="" disabled>الرجاء تحديد الوحدة...</option>
                        {filteredModules.map(m => {
                          const courseTitle = courses.find(course => String(course.id) === String(m.courseId))?.title;
                          return <option key={m.id} value={String(m.id)}>{courseTitle ? `${courseTitle} — ${m.title}` : m.title}</option>;
                        })}
                      </select>
                    </div>
                  )}
                </Field>
              </div>}

              {/* Section 2: Lesson Specifics */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 relative">
                <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
                  تفاصيل المادة المعرفية
                </div>

                <Field
                  label="عنوان الدرس"
                  required
                  error={errors.title}
                >
                  <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => { const x = { ...p }; delete x.title; return x; }); }} placeholder="مثال: حل المعادلات من الدرجة الأولى" className={inputCls(!!errors.title, 'font-semibold')} />
                </Field>

                <Field label="وصف الدرس" error={errors.description}>
                  <textarea
                    value={form.description}
                    onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => { const x = { ...p }; delete x.description; return x; }); }}
                    placeholder="اكتب وصفاً موجزاً يوضح ما سيتعلمه الطالب في هذا الدرس..."
                    rows={7}
                    className={`${inputCls(!!errors.description)} resize-y font-medium leading-relaxed min-h-[160px]`}
                  />
                </Field>

                <Field label="أهداف الدرس" helperText="اختياري — يمكنك إضافة أهداف لمساعدة الطالب على معرفة ما سيحققه من هذا الدرس.">
                  <div className="space-y-2">
                    {form.objectives.map((objective, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          value={objective}
                          onChange={event => {
                            const value = event.target.value;
                            setForm(current => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? value : item) }));
                            setErrors(current => { const next = { ...current }; delete next.objectives; return next; });
                          }}
                          placeholder={`الهدف ${index + 1}`}
                          className={inputCls(!!errors.objectives)}
                        />
                        {form.objectives.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setForm(current => ({ ...current, objectives: current.objectives.filter((_, itemIndex) => itemIndex !== index) }));
                              setErrors(current => { const next = { ...current }; delete next.objectives; return next; });
                            }}
                            className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            aria-label={`حذف الهدف ${index + 1}`}
                            title="حذف الهدف"
                          >×</button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm(current => ({ ...current, objectives: [...current.objectives, ''] }))}
                      className="rounded-lg px-2 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                    >+ إضافة هدف</button>
                  </div>
                </Field>

                <Field label="حالة النشر" helperText="يمكن حفظ الدرس كمسودة ثم نشره عندما يصبح جاهزاً.">
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as FormState['status'] }))} className={inputCls(false)}>
                    <option value="DRAFT">مسودة</option><option value="PUBLISHED">منشور</option>
                  </select>
                  {editingLessonId && <p className="mt-1 text-xs text-slate-500">الحالة الحالية: {form.status === 'PUBLISHED' ? 'منشور' : 'مسودة'}</p>}
                </Field>


                <Field label="ترتيب التشغيل" required error={errors.order} helperText="تُعرض الدروس للمتعلم تصاعدياً بناءً على هذا الرقم.">
                  <div className="flex gap-3 items-stretch">
                    <input type="number" min={1} value={form.order} onChange={e => { setForm(p => ({ ...p, order: e.target.value })); setErrors(p => { const x = { ...p }; delete x.order; return x; }); }} placeholder="مثال: 1" className={`w-32 ${inputCls(!!errors.order, 'font-mono text-center text-lg')}`} dir="ltr" />
                    {(isNonModuleCourse || form.moduleId) && (
                      <button type="button" onClick={() => { setForm(p => ({ ...p, order: String(suggestedOrder()) })); setErrors(p => { const x = { ...p }; delete x.order; return x; }); }} className="px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 rounded-xl transition-all font-bold flex items-center gap-2 shadow-sm shrink-0" title="استخدام الترتيب التلقائي التالي">
                        الترتيب المقترح: {suggestedOrder()}
                      </button>
                    )}
                  </div>
                </Field>
              </div>
              </>}

              {formStep === 2 && <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-6">
                <div className="space-y-3">
                  <div><h4 className="font-bold text-slate-800">جدولة الدرس</h4><p className="text-xs text-slate-500">تُفتح الدروس المجدولة حسب الموعد المحدد. إذا كانت الدورة تمتد 30 يوماً، يمكن ضبط day number والموعد لكل درس.</p></div>
                  {selectedCourse?.startDate && <p className="text-xs text-indigo-800">فترة المقرر: {new Date(selectedCourse.startDate).toLocaleDateString('ar')} {selectedCourse.endDate ? `– ${new Date(selectedCourse.endDate).toLocaleDateString('ar')}` : ''}</p>}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm font-semibold">رقم اليوم<input type="number" min={1} value={form.dayNumber} onChange={e=>setForm(p=>({...p,dayNumber:e.target.value}))} placeholder="1" className="mt-1 w-full rounded-xl border bg-white p-3"/></label>
                    <label className="text-sm font-semibold">وقت بدء الدرس<input type="datetime-local" value={form.scheduledAt} min={selectedCourse?.startDate?.slice(0,16)} max={selectedCourse?.endDate?.slice(0,16)} onChange={e=>setForm(p=>({...p,scheduledAt:e.target.value}))} className="mt-1 w-full rounded-xl border bg-white p-3"/></label>
                    <label className="text-sm font-semibold">المدة بالدقائق<input type="number" min={1} value={form.durationMinutes} onChange={e=>setForm(p=>({...p,durationMinutes:e.target.value}))} placeholder="مثلاً 60" className="mt-1 w-full rounded-xl border bg-white p-3"/></label>
                    <label className="text-sm font-semibold">حالة المحاضرة<select value={form.liveStatus} onChange={e=>setForm(p=>({...p,liveStatus:e.target.value as FormState['liveStatus']}))} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="SCHEDULED">مجدولة</option><option value="LIVE_NOW">مباشرة الآن</option><option value="COMPLETED">انتهت</option></select></label>
                    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isMandatory} onChange={e=>setForm(p=>({...p,isMandatory:e.target.checked}))}/>درس إلزامي للشهادة</label>
                    {isNonModuleCourse && <div className="space-y-2 sm:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white p-3">
                        <div><p className="text-sm font-bold text-slate-800">معاينة مجانية للدرس</p><p className="text-xs text-slate-500">السماح لغير المشتركين بمشاهدة هذا الدرس في المقررات المدفوعة.</p></div>
                        <button type="button" role="switch" aria-checked={form.isFreePreview} onClick={() => setForm(current => ({ ...current, isFreePreview: !current.isFreePreview }))} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${form.isFreePreview ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.isFreePreview ? '-translate-x-6' : 'translate-x-0'}`} />
                          <span className="sr-only">{form.isFreePreview ? 'مفعّلة' : 'غير مفعّلة'}</span>
                        </button>
                        <span className={`text-xs font-bold ${form.isFreePreview ? 'text-emerald-700' : 'text-slate-500'}`}>{form.isFreePreview ? 'مفعّلة' : 'غير مفعّلة'}</span>
                      </div>
                    </div>}
                  </div>
                  {form.scheduledAt && form.durationMinutes && <p className="text-xs font-semibold text-indigo-800">وقت الانتهاء المحسوب: {new Date(new Date(form.scheduledAt).getTime()+Number(form.durationMinutes)*60000).toLocaleString('ar')}</p>}
                </div>
              </div>}

              {formStep === 3 && <>
              {/* Section 3: Knowledge Content */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 relative">
                <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
                  المحتوى المعرفي
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-1">نوع المادة العلمية <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.entries(TYPE_CONFIG) as [LocalContentType, typeof TYPE_CONFIG[LocalContentType]][]).map(([type, cfg]) => {
                      const isActive = form.type === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, type }))}
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${isActive ? 'shadow-sm' : 'hover:bg-slate-50'}`}
                          style={isActive ? { background: cfg.bg, borderColor: cfg.color } : { background: '#FAFAFA', borderColor: '#E2E8F0' }}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-white shadow-sm' : ''}`}>
                            <cfg.icon className="w-5 h-5" style={{ color: isActive ? cfg.color : '#94A3B8' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 600, color: isActive ? cfg.color : '#64748B' }}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(form.type === 'video' || form.type === 'live') && (
                  <Field label={form.type === 'live' ? 'رابط جلسة الفيديو (اختياري)' : 'رابط يوتيوب (YouTube URL)'} required={form.type === 'video'} error={errors.videoUrl}>
                    <input
                      value={form.videoUrl}
                      onChange={e => { setForm(p => ({ ...p, videoUrl: e.target.value })); setErrors(p => { const x = { ...p }; delete x.videoUrl; return x; }); }}
                      placeholder="https://youtube.com/watch?v=..."
                      className={inputCls(!!errors.videoUrl, 'font-mono text-left')}
                      dir="ltr"
                    />
                    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-slate-600">أو ارفع فيديو للمقرر (MP4, MOV, AVI, MKV, WebM · حتى 1 GB)</span><button type="button" disabled={!form.courseId || videoUploadProgress?.percent !== undefined && videoUploadProgress.percent < 100} onClick={()=>videoInputRef.current?.click()} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">اختيار فيديو</button><input ref={videoInputRef} type="file" accept=".mp4,.mov,.avi,.mkv,.webm,video/*" className="hidden" onChange={e=>void uploadLessonVideo(e.target.files?.[0])}/></div>
                      {!form.courseId && <p className="text-xs text-amber-700">اختر المقرر أولاً لرفع الفيديو إلى مجلده.</p>}
                      {videoUploadProgress && <div role="status" aria-live="polite"><div
                        role="progressbar"
                        aria-label="تقدم رفع الفيديو"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={videoUploadProgress.percent}
                        className="h-2 overflow-hidden rounded bg-slate-200"
                      ><div className="h-full rounded bg-indigo-600 transition-[width] duration-200" style={{width:`${videoUploadProgress.percent}%`}}/></div><p className="mt-1 text-xs font-medium text-slate-600">{videoUploadProgress.percent === 100 ? 'اكتمل رفع الفيديو' : 'جارٍ رفع الفيديو'} · {videoUploadProgress.percent}% · {(videoUploadProgress.loaded/1024/1024).toFixed(1)} / {(videoUploadProgress.total/1024/1024).toFixed(1)} MB</p></div>}
                      {videoFileInfo && <p className="break-all text-xs text-emerald-700">{videoFileInfo.name} · {(videoFileInfo.size/1024/1024).toFixed(1)} MB · {form.videoUrl}</p>}
                      {videoUploadError && <p role="alert" className="text-xs font-semibold text-red-600">{videoUploadError}</p>}
                    </div>
                  </Field>
                )}

                {form.type === 'markdown' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Field label="محتوى نصي (Markdown مدعوم)" required error={errors.content}>
                      <textarea
                        value={form.content}
                        onChange={e => { setForm(p => ({ ...p, content: e.target.value })); setErrors(p => { const x = { ...p }; delete x.content; return x; }); }}
                        placeholder="اكتب المحتوى النصي هنا..."
                        rows={6}
                        className={`${inputCls(!!errors.content)} resize-y text-sm leading-relaxed`}
                      />
                    </Field>
                  </div>
                )}

                {(form.type === 'live' || form.type === 'markdown') && form.type === 'live' && (
                  <Field label="موضوعات الجلسة ومحتواها (اختياري)">
                    <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5} placeholder="أضف موضوعات الجلسة أو المحتوى المساند" className={`${inputCls(false)} resize-y`} />
                  </Field>
                )}

                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <h4 className="font-bold text-slate-700">ملفات PDF المرفقة</h4>
                  {pdfManagementLoading && <p className="text-xs text-slate-500">جارٍ تحميل المرفقات…</p>}
                  {pdfListLoadFailed && <button type="button" onClick={async () => { setPdfManagementLoading(true); setPdfListLoadFailed(false); try { setLessonPdfs(await lessonService.getPdfs(editingLessonId!)); setPdfManagementError(''); } catch (err: any) { setPdfManagementError(err?.message || 'تعذر تحميل ملفات PDF'); setPdfListLoadFailed(true); } finally { setPdfManagementLoading(false); } }} className="text-xs font-bold text-blue-700 underline">إعادة تحميل قائمة الملفات</button>}
                  {lessonPdfs.map((pdf, index) => <div key={pdf.id ?? `${pdf.url}-${index}`} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
                    <span className="w-6 text-center">{index + 1}</span><span className="min-w-0 flex-1 truncate">{pdf.title || pdf.url}</span><a href={pdf.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">عرض</a>
                    <button type="button" disabled={index === 0} aria-label="تحريك لأعلى" onClick={() => setLessonPdfs(items => items.map((item, i) => i === index - 1 ? items[index] : i === index ? items[index - 1] : item))} className="px-1 text-slate-600 disabled:opacity-30">↑</button>
                    <button type="button" disabled={index === lessonPdfs.length - 1} aria-label="تحريك لأسفل" onClick={() => setLessonPdfs(items => items.map((item, i) => i === index + 1 ? items[index] : i === index ? items[index + 1] : item))} className="px-1 text-slate-600 disabled:opacity-30">↓</button>
                    {editingLessonId && <button type="button" disabled={!pdf.id || pdfManagementLoading} onClick={async () => { setPdfManagementLoading(true); try { await lessonService.deletePdf(editingLessonId, String(pdf.id)); setLessonPdfs(await lessonService.getPdfs(editingLessonId)); setPdfManagementError(''); } catch (err: any) { setPdfManagementError(err?.message || 'تعذر حذف الملف'); } finally { setPdfManagementLoading(false); } }} className="text-red-600 disabled:opacity-50">حذف</button>}
                  </div>)}
                  {!lessonPdfs.length && <p className="text-xs text-slate-500">لا توجد ملفات PDF مرفقة.</p>}
                  <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                    <input value={newPdfTitle} onChange={e => setNewPdfTitle(e.target.value)} placeholder="اسم ملف PDF المرفوع (اختياري)" aria-label="اسم ملف PDF المرفوع" className={inputCls(false)} />
                    <input value={newPdfUrl} onChange={e => setNewPdfUrl(e.target.value)} placeholder="رابط PDF موجود" className={inputCls(false)} dir="ltr" />
                    <button type="button" disabled={!newPdfUrl.trim() || pdfManagementLoading} onClick={() => void handleAttachPdfUrl()} className="rounded-lg bg-emerald-600 px-3 font-bold text-white disabled:opacity-50">إضافة رابط</button>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{pdfManagementLoading ? 'جارٍ رفع ملف PDF…' : 'رفع ملف PDF'}<input type="file" accept="application/pdf,.pdf" multiple className="hidden" disabled={pdfManagementLoading} onChange={async e => {
                    if (pdfUploadInFlightRef.current) { e.target.value = ''; return; }
                    pdfUploadInFlightRef.current = true;
                    const files = Array.from(e.target.files ?? []); e.target.value = ''; let nextOrder = lessonPdfs.length;
                    const customTitle = newPdfTitle.trim();
                    setPdfManagementProgress(null);
                    const batchKeys = new Set<string>();
                    for (const [fileIndex, file] of files.entries()) {
                      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setPdfManagementError(`الملف ${file.name} ليس بصيغة PDF`); continue; }
                      const fileKey = `${file.name.toLocaleLowerCase()}-${file.size}-${file.lastModified}`;
                      if (batchKeys.has(fileKey) || lessonPdfs.some(pdf => pdf.file && `${pdf.file.name.toLocaleLowerCase()}-${pdf.file.size}-${pdf.file.lastModified}` === fileKey) || (editingLessonId && lessonPdfs.some(pdf => pdf.title?.toLocaleLowerCase() === file.name.toLocaleLowerCase()))) {
                        setPdfManagementError(`الملف ${file.name} مرفق بالفعل.`);
                        continue;
                      }
                      batchKeys.add(fileKey);
                      if (editingLessonId) {
                        setPdfManagementLoading(true);
                        setPdfManagementProgress({ percent: 0, loaded: 0, total: file.size });
                      }
                      try {
                        const title = fileIndex === 0 && customTitle ? customTitle : file.name;
                        if (editingLessonId) { await lessonService.addPdf(editingLessonId, { file, title, order: nextOrder++ }, setPdfManagementProgress); setLessonPdfs(await lessonService.getPdfs(editingLessonId)); }
                        else { setLessonPdfs(p => [...p, { title, file, order: p.length }]); }
                        if (fileIndex === 0 && customTitle) setNewPdfTitle('');
                        setPdfManagementError('');
                      } catch (err: any) {
                        setPdfManagementError(err?.message || `تعذر رفع ${file.name}`);
                        setPdfManagementProgress(null);
                      } finally {
                        if (editingLessonId) setPdfManagementLoading(false);
                      }
                    }
                    pdfUploadInFlightRef.current = false;
                    if (editingLessonId && files.length === 0) setPdfManagementProgress(null);
                  }} /></label>
                  {pdfManagementProgress && <div role="status" aria-live="polite" className="space-y-1">
                    <div role="progressbar" aria-label="تقدم رفع ملف PDF" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pdfManagementProgress.percent} className="h-2 overflow-hidden rounded bg-slate-200">
                      <div className="h-full rounded bg-emerald-600 transition-[width] duration-200" style={{ width: `${pdfManagementProgress.percent}%` }} />
                    </div>
                    <p className="text-xs text-slate-600">{pdfManagementLoading ? 'جارٍ رفع ملف PDF' : 'اكتمل رفع ملف PDF'} · {pdfManagementProgress.percent}% · {(pdfManagementProgress.loaded / 1024 / 1024).toFixed(1)} / {(pdfManagementProgress.total / 1024 / 1024).toFixed(1)} MB</p>
                  </div>}
                  {pdfManagementError && <p role="alert" className="text-xs text-red-600">{pdfManagementError}</p>}
                </div>

              </div>
              </>}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button onClick={closeModal} className="w-full sm:w-auto px-6 py-3 text-slate-600 font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-all focus:ring-2 focus:ring-slate-200 order-2 sm:order-1">
                إلغاء الأمر
              </button>
              <div className="flex w-full gap-2 sm:w-auto">
                {formStep > 1 && <button type="button" onClick={() => setFormStep(current => current === 3 ? 2 : 1)} disabled={saveStatus === 'loading'} className="w-full rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60 sm:w-auto">السابق</button>}
                {formStep < 3 ? <button type="button" onClick={goToNextStep} disabled={saveStatus === 'loading' || saveStatus === 'success'} className="w-full rounded-xl px-8 py-3 font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>التالي</button> : <button onClick={handleSave} disabled={saveStatus === 'loading' || saveStatus === 'success' || pdfManagementLoading || pdfListLoadFailed} className="w-full rounded-xl px-8 py-3 font-bold text-white shadow-md transition-all hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                {saveStatus === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                {saveStatus === 'success' && <CheckCircle className="w-5 h-5 animate-bounce" />}
                {saveStatus === 'loading' ? 'جاري المعالجة...' : saveStatus === 'success' ? 'تم الحفظ!' : editingLessonId ? 'حفظ تعديلات الدرس' : 'حفظ الدرس الجديد'}
                </button>}
              </div>
            </div>

          </div>
        </div>
      )}
      <CascadeDeleteModal
        isOpen={!!deleteTarget}
        targetType={deleteTarget?.type || 'lesson'}
        targetId={deleteTarget?.id || ''}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, required, error, helperText, action, children }: { label: string; required?: boolean; error?: string; helperText?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
            {label}
            {required && <span className="text-red-500 text-lg leading-none mt-1">*</span>}
          </label>
          {action}
        </div>
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
