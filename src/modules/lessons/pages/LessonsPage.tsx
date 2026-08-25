import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, BookMarked, X, Loader2, CheckCircle, AlertCircle, Trash2, Search, Filter, PlayCircle, Clock, Edit3, AlertTriangle, Eye, CheckSquare, Square, Copy, GripVertical, FileWarning, Timer, ChevronDown, FileText, FileType2, Upload, Link
} from 'lucide-react';
import { useCoursesStore, useLessonsStore, useModulesStore } from '../../../store';
import { Loader } from '../../../components/feedback/Loader';
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcuts';
import { BulkActionBar } from '../../../components/ui/BulkActionBar';
import { LessonPreviewModal } from '../../../components/ui/LessonPreviewModal';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { ActivityLog } from '../../../components/ui/ActivityLog';
import { HealthScore } from '../../../components/ui/HealthScore';
import { AIMagicButton } from '../../../components/ui/AIMagicButton';
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
import { ModuleManagerModal } from '../../../components/ui/ModuleManagerModal';
import { PageGuide } from '../../../components/ui/PageGuide';
import { Layers } from 'lucide-react';
import type { BackendModule } from '../../../types/api';
import { createPortal } from 'react-dom';

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

type LocalContentType = 'video' | 'markdown' | 'pdf';
const TYPE_CONFIG: Record<LocalContentType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  video: { label: 'مقطع فيديو', icon: PlayCircle, color: '#3B82F6', bg: '#EFF6FF' },
  markdown: { label: 'محتوى نصي (Markdown)', icon: FileText, color: '#6366F1', bg: '#EEF2FF' },
  pdf: { label: 'مستند PDF', icon: FileType2, color: '#EF4444', bg: '#FEF2F2' },
};

interface FormState {
  courseId: string;
  moduleId: string;
  title: string;
  description: string;
  order: string;
  type: LocalContentType;
  videoUrl: string;
  pdfUrl: string;
  content: string;
}

type FormError = Partial<Record<keyof FormState | 'submit', string>>;
type SaveStatus = 'idle' | 'loading' | 'success' | 'error';

export function LessonsPage() {
  const { courses, fetchCourses } = useCoursesStore();
  const { lessons, addLesson, updateLesson, deleteLesson, fetchLessons, error, isLoading } = useLessonsStore();
  const { modules: allModules, fetchModules, addModule: createModule, updateModule: editModule, deleteModule: removeModule } = useModulesStore();

  const [showModal, setShowModal] = useState(false);
  const [showModuleManager, setShowModuleManager] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'lesson' | 'module'; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrentPage(1); setSelectedLessons([]); }, [searchQuery, courseFilter, activeView, itemsPerPage]);

  useEffect(() => {
    void fetchCourses();
    void fetchLessons();
    void fetchModules();
  }, [fetchCourses, fetchLessons, fetchModules]);

  const [form, setForm] = useState<FormState>({ courseId: '', moduleId: '', title: '', description: '', order: '', type: 'video', videoUrl: '', pdfUrl: '', content: '' });
  const [errors, setErrors] = useState<FormError>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [activeTab, setActiveTab] = useState<'details' | 'content'>('details');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Persist "Create New Lesson" form state
  useEffect(() => {
    if (showModal && !editingLessonId) {
      const timer = setTimeout(() => {
        sessionStorage.setItem('create_lesson_form_state', JSON.stringify(form));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [form, showModal, editingLessonId]);

  const filteredModules = allModules.filter(m => String(m.courseId) === String(form.courseId));
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
    if (showModal && isFormValid && saveStatus !== 'loading' && saveStatus !== 'success') {
      e.preventDefault();
      void handleSave();
    }
  });

  // Inline Module Creation
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleCreateLoading, setModuleCreateLoading] = useState(false);

  const [aiLoading, setAiLoading] = useState<'title' | 'desc' | null>(null);

  const handleGenerateTitle = () => {
    setAiLoading('title');
    setTimeout(() => {
      setForm(p => ({ ...p, title: 'الدرس ' + (form.order || 1) + ': استكشاف متقدم في ' + (courses.find(c => String(c.id) === form.courseId)?.name || 'المادة') }));
      setAiLoading(null);
    }, 800);
  };

  const handleGenerateDesc = () => {
    setAiLoading('desc');
    setTimeout(() => {
      setForm(p => ({ ...p, description: 'ستتعلم في هذا الدرس المفاهيم الأساسية والتطبيق العملي بخطوات واضحة، مع التركيز على المخرجات التعليمية الحديثة لبناء فهم عميق ومستدام.' }));
      setAiLoading(null);
    }, 1000);
  };

  const resetModal = useCallback(() => {
    setForm({ courseId: '', moduleId: '', title: '', description: '', order: '' });
    setErrors({});
    setSaveStatus('idle');
    setModulesError(null);
    setIsCreatingModule(false);
    setNewModuleTitle('');
    setNewModuleDesc('');
    setEditingModuleId(null);
    setEditingLessonId(null);
    setPdfFile(null);
    setActiveTab('details');
  }, []);

  const openModal = () => {
    resetModal();
    const saved = sessionStorage.getItem('create_lesson_form_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore state for new lessons
        setForm(parsed);
      } catch (e) {
        console.error('Failed to parse saved lesson form state', e);
      }
    }
    setShowModal(true);
  };

  const openEdit = (lesson: { id: string; courseId: string; title: string; description: string; order: number }) => {
    resetModal();
    setEditingLessonId(lesson.id);
    setShowModal(true);
    const parentModule = allModules.find(m => String(m.id) === String(lesson.courseId));
    if (parentModule) {
      setForm({
        courseId: String(parentModule.courseId),
        moduleId: lesson.courseId,
        title: lesson.title,
        description: lesson.description || '',
        order: String(lesson.order),
        type: (lesson as any).type || 'video',
        videoUrl: (lesson as any).videoUrl || '',
        pdfUrl: (lesson as any).pdfUrl || '',
        content: (lesson as any).content || '',
      });
    } else {
      setModulesError('تعذر تحميل الوحدة المرتبطة بهذا الدرس.');
      setForm({
        courseId: '',
        moduleId: lesson.courseId,
        title: lesson.title,
        description: lesson.description || '',
        order: String(lesson.order),
        type: (lesson as any).type || 'video',
        videoUrl: (lesson as any).videoUrl || '',
        pdfUrl: (lesson as any).pdfUrl || '',
        content: (lesson as any).content || '',
      });
    }
  };

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
    if (form.moduleId && !filteredModules.some(m => String(m.id) === form.moduleId)) {
      setForm(p => ({ ...p, moduleId: '' }));
    }
  }, [form.courseId]);

  const suggestedOrder = (): number => {
    if (!form.moduleId) return 1;
    return lessons.filter(l => l.courseId === form.moduleId).length + 1; // Backend maps moduleId to courseId temporarily in the list 
  };

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim() || !newModuleDesc.trim() || !form.courseId) return;
    setModuleCreateLoading(true);
    try {
      if (editingModuleId) {
        await editModule(editingModuleId, {
          courseId: form.courseId as any,
          title: newModuleTitle.trim(),
          description: newModuleDesc.trim(),
        });
        setForm(p => ({ ...p, moduleId: String(editingModuleId) }));
      } else {
        const newMod = await createModule({
          courseId: form.courseId as any,
          title: newModuleTitle.trim(),
          description: newModuleDesc.trim(),
        });
        setForm(p => ({ ...p, moduleId: String(newMod.id) }));
      }
      setIsCreatingModule(false);
      setNewModuleTitle('');
      setNewModuleDesc('');
      setEditingModuleId(null);
    } catch (err) {
      setModulesError('فشل حفظ الوحدة. يرجى المحاولة مرة أخرى.');
    } finally {
      setModuleCreateLoading(false);
    }
  };

  const handleDeleteModule = (moduleId: number | string) => {
    setDeleteTarget({ type: 'module', id: String(moduleId) });
  };

  const validate = (): boolean => {
    const e: FormError = {};
    if (!form.courseId) e.courseId = 'يرجى اختيار المقرر المرجعي';
    if (!form.moduleId) e.moduleId = 'يرجى تحديد الوحدة التي ينتمي لها الدرس';
    if (!form.title.trim()) e.title = 'عنوان الدرس مطلوب';
    else if (form.title.trim().length < 2) e.title = 'يجب أن يكون عنوان الدرس حرفين على الأقل';
    if (form.type !== 'markdown' && !form.description.trim()) e.description = 'وصف الدرس مطلوب';
    if (!form.order.trim()) e.order = 'ترتيب الدرس مطلوب داخل الوحدة';
    else if (isNaN(Number(form.order)) || Number(form.order) < 1) e.order = 'يجب أن يكون الترتيب رقماً موجباً';

    if (activeTab === 'content' || editingLessonId) {
      if (form.type === 'video' && !form.videoUrl.trim()) e.videoUrl = 'رابط الفيديو مطلوب';
      if (form.type === 'pdf' && !pdfFile && !form.pdfUrl) e.pdfUrl = 'يرجى اختيار ملف PDF';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };


  const handleSave = async () => {
    if (!validate()) return;
    setSaveStatus('loading');
    const course = courses.find(c => c.id === form.courseId)!;
    try {

      let finalPdfFile: File | undefined = undefined;

      if ((form.type === 'pdf' || form.type === 'video') && pdfFile) {
        // Force .pdf extension to bypass backend Multer validation
        const newFileName = pdfFile.name.toLowerCase().endsWith('.pdf') ? pdfFile.name : `${pdfFile.name}.pdf`;
        finalPdfFile = new File([pdfFile], newFileName, { type: 'application/pdf' });
      }

      const payload = {
        courseId: form.moduleId,
        courseName: course.title,
        title: form.title.trim(),
        description: form.type === 'markdown' ? form.content.trim() : form.description.trim(),
        order: Number(form.order),
        type: form.type, // إرسال النوع الحقيقي للباكاند بدون تحايل
        videoUrl: form.type === 'video' ? form.videoUrl.trim() : undefined,
        content: undefined,
        pdfUrl: (form.type === 'pdf' || form.type === 'video') && !finalPdfFile && form.pdfUrl ? form.pdfUrl.trim() : undefined,
        pdf: (form.type === 'pdf' || form.type === 'video') ? finalPdfFile : undefined,
        // إرسال true بشكل صريح للـ PDF والنص
        isReading: (form.type === 'pdf' || form.type === 'markdown') ? true : false,
      };

      if (editingLessonId) {
        await updateLesson({ id: editingLessonId, ...payload });
      } else {
        await addLesson(payload);
        sessionStorage.removeItem('create_lesson_form_state');
      }
      setSaveStatus('success');
      setTimeout(() => {
        setShowModal(false);
        resetModal();
      }, 1000);
    } catch (err: any) {
      setSaveStatus('error');
      const backendMessage = err?.response?.data?.message || err?.message || 'تعذر حفظ الدرس. تأكد من حجم الملف (أقل من 10MB)';
      const errorMsg = Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage;
      setErrors(prev => ({ ...prev, submit: `خطأ من الخادم: ${errorMsg}` }));
      window.alert(`خطأ: ${errorMsg}`);
    }
  };

  const handleDelete = (lessonId: string) => {
    setDeleteTarget({ type: 'lesson', id: lessonId });
  };

  const isFormValid = form.courseId && form.moduleId && form.title.trim() && (form.type === 'markdown' ? form.content.trim() : form.description.trim()) && form.order.trim();

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
      setSelectedLessons([]);
    } catch {
      alert('حدث خطأ أثناء تنفيذ الإجراء المجمع.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const filteredLessons = lessons.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.courseName && l.courseName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = true;
    const matchesCourse = courseFilter === 'all' || String(l.courseId) === courseFilter || String(allModules.find(m => String(m.id) === String(l.courseId))?.courseId) === courseFilter;

    let matchesView = true;
    if (activeView === 'published') matchesView = !!l.isPublished;
    if (activeView === 'drafts') matchesView = !l.isPublished;
    if (activeView === 'incomplete') matchesView = !l.hasContent;

    return matchesSearch && matchesStatus && matchesCourse && matchesView;
  });

  const stats = {
    total: lessons.length,
    published: lessons.filter(l => l.isPublished).length,
    drafts: lessons.filter(l => !l.isPublished).length,
    missingContent: lessons.filter(l => !l.hasContent).length,
    healthScore: lessons.length ? Math.round((lessons.filter(l => l.hasContent && l.isPublished).length / lessons.length) * 100) : 0
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

  const paginatedLessons = [...filteredLessons]
    .sort((a, b) => a.order - b.order)
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            تصفح، أضف، ونظّم {lessons.length} درس مسجّل. قم ببناء الهيكل التعليمي لمقرراتك.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowModuleManager(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 border-2 border-indigo-100 rounded-xl font-bold text-sm transition-all shadow-sm"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            إدارة الوحدات التعليمية
          </button>
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
      <StickyToolbar position="top">
        <div className="flex flex-col lg:flex-row gap-4 w-full">
          <div className="relative flex-1 group w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث الشامل عن درس أو مقرر... (Ctrl+F)"
              className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <HealthScore score={stats.healthScore} />
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <div className="text-slate-500 text-xs font-bold flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-indigo-500" /> إجمالي الدروس</div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
        </div>
      </div>

      {error && lessons.length === 0 ? (
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
      ) : lessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
          <EmptyState
            icon={BookMarked}
            title="لا توجد دروس حالياً"
            description="قم ببناء المنهج الدراسي عن طريق إضافة دروس تفصيلية داخل الوحدات."
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
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-6">
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
                        <h4 className="text-slate-900 font-extrabold text-sm truncate" title={lesson.title}>{lesson.title}</h4>
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

                    {/* Footer: Health & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1.5">
                        <HealthBadge condition={!lesson.hasContent} label="محتوى مفقود" type="danger" />
                      </div>

                      <div className="flex items-center gap-1 bg-white">
                        <button onClick={() => setPreviewLesson(lesson)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="معاينة">
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
                      <div className="text-slate-800 font-bold mb-1 truncate max-w-xs" title={lesson.title}>{lesson.title}</div>
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
                      {lesson.hasContent ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-sm">
                          <PlayCircle className="w-3.5 h-3.5" /> مادة علمية متوفرة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200">
                          <AlertCircle className="w-3.5 h-3.5" /> قيد الإعداد
                        </span>
                      )}
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
                        <button onClick={() => setPreviewLesson(lesson)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="وضع معاينة الطالب">
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
            currentPage={currentPage}
            totalItems={filteredLessons.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
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
          <div className="bg-white w-full h-full sm:max-h-[92vh] sm:max-w-2xl rounded-none sm:rounded-[2rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
                  <BookMarked className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-slate-800">{editingLessonId ? 'تعديل بيانات الدرس' : 'صياغة درس جديد'}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">أدخل تفاصيل الدرس واربطه بالوحدة التعليمية المناسبة.</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 rounded-xl transition-all border border-slate-100 touch-target shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              {errors.submit && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold">{errors.submit}</span>
                </div>
              )}
              {/* Section 1: Relational Structure */}
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-5 relative">
                <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-100 text-xs font-bold text-emerald-600 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  المسار التنظيمي
                </div>

                <Field label="المقرر المرجعي" required error={errors.courseId} helperText="اختر المقرر الذي سيحتوي على هذا الدرس.">
                  {courses.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 flex items-center gap-2 font-bold text-sm">
                      <AlertCircle className="w-5 h-5" /> لم تقم بإنشاء أي مقررات بعد. يرجى البدء بإنشاء مقرر.
                    </div>
                  ) : (
                    <div className="relative">
                      <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
                      <PortalSelect
                        value={form.courseId}
                        onChange={(val: string) => { setForm(p => ({ ...p, courseId: val })); setErrors(p => { const x = { ...p }; delete x.courseId; return x; }); }}
                        className={`${inputCls(!!errors.courseId)} pr-11 font-medium bg-white`}
                        placeholder="الرجاء اختيار المقرر..."
                        options={courses.map(c => ({ value: c.id, label: c.title }))}
                      />
                    </div>
                  )}
                </Field>

                <Field label="الوحدة التعليمية" required error={errors.moduleId} helperText="تتكون المقررات من وحدات، وكل وحدة تحتوي على دروس.">
                  {!form.courseId ? (
                    <div className="p-4 bg-slate-100/50 border border-slate-200 rounded-xl text-slate-400 text-sm font-medium flex items-center justify-center border-dashed">
                      قم باختيار المقرر أولاً لاستعراض وحداته
                    </div>
                  ) : modulesLoading ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 flex items-center gap-2 text-sm font-bold animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" /> جاري سحب بيانات الوحدات من الخادم...
                    </div>
                  ) : modulesError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {modulesError}
                    </div>
                  ) : isCreatingModule ? (
                    <div className="p-5 border-2 border-emerald-200 bg-emerald-50 rounded-2xl shadow-sm space-y-4 animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold pb-2 border-b border-emerald-200/50">
                        <Plus className="w-4 h-4" /> {editingModuleId ? 'تعديل الوحدة الهيكلية' : 'صياغة وحدة هيكلية جديدة'}
                      </div>
                      <div className="space-y-3">
                        <input value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} placeholder="اسم الوحدة (مثال: الوحدة الأولى: الجبر والمقادير الجبرية)" className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-sm font-semibold bg-white" />
                        <textarea value={newModuleDesc} onChange={e => setNewModuleDesc(e.target.value)} placeholder="شرح مبسط لمخرجات هذه الوحدة..." rows={2} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-sm resize-none bg-white leading-relaxed" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={handleCreateModule} disabled={moduleCreateLoading || !newModuleTitle.trim() || !newModuleDesc.trim()} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                          {moduleCreateLoading && <Loader2 className="w-4 h-4 animate-spin" />} {moduleCreateLoading ? 'جاري الحفظ...' : editingModuleId ? 'حفظ الوحدة' : 'اعتماد الوحدة'}
                        </button>
                        <button type="button" onClick={() => { setIsCreatingModule(false); setEditingModuleId(null); setNewModuleTitle(''); setNewModuleDesc(''); }} className="px-6 py-2 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-xl text-sm font-bold transition-colors">
                          تراجع
                        </button>
                      </div>
                    </div>
                  ) : filteredModules.length === 0 ? (
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-500" /> لم يتم تأسيس أي وحدات بعد تحت هذا المقرر.
                      </div>
                      <button type="button" onClick={() => setIsCreatingModule(true)} className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 hover:shadow-sm text-amber-900 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-amber-200/50">
                        <Plus className="w-4 h-4" strokeWidth={3} /> ابدأ بتأسيس الوحدة الأولى
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 w-full min-w-0">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative flex-1 min-w-0">
                          <select
                            value={form.moduleId}
                            onChange={e => { setForm(p => ({ ...p, moduleId: e.target.value })); setErrors(p => { const x = { ...p }; delete x.moduleId; return x; }); }}
                            className={`w-full ${inputCls(!!errors.moduleId)} pr-11 font-medium appearance-none`}
                            style={{ backgroundPosition: 'left 1rem center', backgroundSize: '1.5em 1.5em', backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat' }}
                          >
                            <option value="" disabled>الرجاء تحديد الوحدة...</option>
                            {filteredModules.map(m => <option key={m.id} value={String(m.id)}>{m.title}</option>)}
                          </select>
                        </div>
                        <button type="button" onClick={() => setShowModuleManager(true)} title="إدارة وتأسيس الوحدات" className="shrink-0 px-4 py-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all border-2 border-indigo-100 shadow-sm flex items-center gap-2 text-sm">
                          <Layers className="w-4 h-4 text-indigo-600" /> إدارة الوحدات
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 w-full min-w-0">
                        {filteredModules.map(module => (
                          <div key={module.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 w-full min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-700 truncate">{module.title}</div>
                              {module.description && <div className="text-xs text-slate-400 truncate">{module.description}</div>}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingModuleId(String(module.id));
                                setNewModuleTitle(module.title);
                                setNewModuleDesc(module.description ?? '');
                                setIsCreatingModule(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Module"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteModule(module.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Module"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Field>
              </div>

              {/* Section 2: Lesson Specifics */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 relative">
                <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
                  تفاصيل المادة المعرفية
                </div>

                <Field
                  label="عنوان الدرس"
                  required
                  error={errors.title}
                  action={<AIMagicButton onClick={handleGenerateTitle} loading={aiLoading === 'title'} label="اقتراح عنوان" />}
                >
                  <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => { const x = { ...p }; delete x.title; return x; }); }} placeholder="مثال: حل المعادلات من الدرجة الأولى" className={inputCls(!!errors.title, 'font-semibold')} />
                </Field>

                {form.type !== 'markdown' && (
                  <Field
                    label="وصف الدرس"
                    required
                    error={errors.description}
                    action={<AIMagicButton onClick={handleGenerateDesc} loading={aiLoading === 'desc'} label="اقتراح وصف" />}
                  >
                    <textarea
                      value={form.description}
                      onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => { const x = { ...p }; delete x.description; return x; }); }}
                      placeholder="اكتب وصفاً موجزاً يوضح ما سيتعلمه الطالب في هذا الدرس..."
                      rows={3}
                      className={`${inputCls(!!errors.description)} resize-none font-medium leading-relaxed`}
                    />
                  </Field>
                )}


                <Field label="ترتيب التشغيل" required error={errors.order} helperText="تُعرض الدروس للمتعلم تصاعدياً بناءً على هذا الرقم.">
                  <div className="flex gap-3 items-stretch">
                    <input type="number" min={1} value={form.order} onChange={e => { setForm(p => ({ ...p, order: e.target.value })); setErrors(p => { const x = { ...p }; delete x.order; return x; }); }} placeholder="مثال: 1" className={`w-32 ${inputCls(!!errors.order, 'font-mono text-center text-lg')}`} dir="ltr" />
                    {form.moduleId && (
                      <button type="button" onClick={() => { setForm(p => ({ ...p, order: String(suggestedOrder()) })); setErrors(p => { const x = { ...p }; delete x.order; return x; }); }} className="px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 rounded-xl transition-all font-bold flex items-center gap-2 shadow-sm shrink-0" title="استخدام الترتيب التلقائي التالي">
                        الترتيب المقترح: {suggestedOrder()}
                      </button>
                    )}
                  </div>
                </Field>
              </div>

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
                          onClick={() => { setForm(p => ({ ...p, type, videoUrl: '', pdfUrl: '', content: '' })); setPdfFile(null); }}
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

                {form.type === 'video' && (
                  <Field label="رابط يوتيوب (YouTube URL)" required error={errors.videoUrl}>
                    <input
                      value={form.videoUrl}
                      onChange={e => { setForm(p => ({ ...p, videoUrl: e.target.value })); setErrors(p => { const x = { ...p }; delete x.videoUrl; return x; }); }}
                      placeholder="https://youtube.com/watch?v=..."
                      className={inputCls(!!errors.videoUrl, 'font-mono text-left')}
                      dir="ltr"
                    />
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

                {(form.type === 'pdf' || form.type === 'video') && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Field label={form.type === 'video' ? "مستند PDF إضافي (اختياري)" : "مستند الدرس (ملف PDF)"} error={errors.pdfUrl} required={form.type === 'pdf'}>
                      <div className="space-y-3">
                        {form.pdfUrl && !pdfFile && (
                          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <FileType2 className="w-5 h-5 text-red-500" />
                            <a href={form.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm font-medium text-red-700 hover:underline truncate dir-ltr text-left">
                              {form.pdfUrl}
                            </a>
                            <button type="button" onClick={() => setForm(p => ({ ...p, pdfUrl: '' }))} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {pdfFile && (
                          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <FileType2 className="w-5 h-5 text-emerald-500" />
                            <div className="flex-1 text-sm font-medium text-emerald-700 truncate dir-ltr text-left">
                              {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                            <button type="button" onClick={() => setPdfFile(null)} className="p-1.5 hover:bg-emerald-100 text-emerald-500 rounded-lg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {!pdfFile && (
                          <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${errors.pdfUrl ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                            }`}>
                            <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
                              <Upload className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold text-slate-700">انقر هنا لرفع ملف PDF من جهازك</p>
                              <p className="text-xs text-slate-500 mt-1">الحد الأقصى 10MB</p>
                            </div>
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    setErrors(p => ({ ...p, pdfUrl: 'حجم الملف يتجاوز 10MB' }));
                                    return;
                                  }
                                  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                    setErrors(p => ({ ...p, pdfUrl: 'يجب أن يكون الملف بصيغة PDF' }));
                                    return;
                                  }
                                  setPdfFile(file);
                                  setErrors(p => { const x = { ...p }; delete x.pdfUrl; return x; });
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </Field>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
              <button onClick={closeModal} className="w-full sm:w-auto px-6 py-3 text-slate-600 font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-all focus:ring-2 focus:ring-slate-200 order-2 sm:order-1">
                إلغاء الأمر
              </button>
              <button onClick={handleSave} disabled={!isFormValid || saveStatus === 'loading' || saveStatus === 'success'} className="w-full sm:w-auto px-8 py-3 text-white rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 order-1 sm:order-2" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                {saveStatus === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                {saveStatus === 'success' && <CheckCircle className="w-5 h-5 animate-bounce" />}
                {saveStatus === 'loading' ? 'جاري المعالجة...' : saveStatus === 'success' ? 'تم الحفظ!' : editingLessonId ? 'حفظ تعديلات الدرس' : 'حفظ الدرس الجديد'}
              </button>
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
      <ModuleManagerModal
        isOpen={showModuleManager}
        onClose={() => setShowModuleManager(false)}
        initialCourseId={form.courseId}
        onModuleSelected={(modId) => setForm(p => ({ ...p, moduleId: modId }))}
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
