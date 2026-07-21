import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, BookMarked, X, Loader2, CheckCircle, AlertCircle, Trash2, Search, Filter, PlayCircle, Clock, Edit3, AlertTriangle, Eye, CheckSquare, Square, Copy, GripVertical, FileWarning, Timer
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
import { Layers } from 'lucide-react';
import type { BackendModule } from '../../../types/api';

interface FormState {
  courseId: string;
  moduleId: string;
  title: string;
  description: string;
  order: string;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrentPage(1); setSelectedLessons([]); }, [searchQuery, statusFilter, courseFilter, activeView, itemsPerPage]);

  useEffect(() => {
    void fetchCourses();
    void fetchLessons();
    void fetchModules();
  }, [fetchCourses, fetchLessons, fetchModules]);

  const [form, setForm] = useState<FormState>({ courseId: '', moduleId: '', title: '', description: '', order: '' });
  const [errors, setErrors] = useState<FormError>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

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

  const [aiLoading, setAiLoading] = useState<'title'|'desc'|null>(null);

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
  }, []);

  const openModal = () => { resetModal(); setShowModal(true); };

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
        description: lesson.description,
        order: String(lesson.order),
      });
    } else {
      setModulesError('تعذر تحميل الوحدة المرتبطة بهذا الدرس.');
      setForm({
        courseId: '',
        moduleId: lesson.courseId,
        title: lesson.title,
        description: lesson.description,
        order: String(lesson.order),
      });
    }
  };

  const closeModal = () => {
    const isDirty = form.courseId || form.moduleId || form.title || form.description || form.order;
    if (isDirty && saveStatus !== 'success' && !confirm('لديك تغييرات غير محفوظة. هل أنت متأكد من الإلغاء؟')) {
      return;
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
    if (!form.order.trim()) e.order = 'ترتيب الدرس مطلوب داخل الوحدة';
    else if (isNaN(Number(form.order)) || Number(form.order) < 1) e.order = 'يجب أن يكون الترتيب رقماً موجباً';
    setErrors(e);
    return Object.keys(e).length === 0;
  };


  const handleSave = async () => {
    if (!validate()) return;
    setSaveStatus('loading');
    const course = courses.find(c => c.id === form.courseId)!;
    try {
      const payload = {
        courseId: form.moduleId,
        courseName: course.name,
        title: form.title.trim(),
        description: form.description.trim(),
        order: Number(form.order),
      };

      if (editingLessonId) {
        await updateLesson({ id: editingLessonId, ...payload });
      } else {
        await addLesson(payload);
      }
      setSaveStatus('success');
      setTimeout(() => {
        setShowModal(false);
        resetModal();
      }, 1000);
    } catch {
      setSaveStatus('error');
      setErrors(prev => ({ ...prev, submit: 'تعذر الاتصال بالخادم. يرجى التحقق من الشبكة والمحاولة مجدداً' }));
    }
  };

  const handleDelete = (lessonId: string) => {
    setDeleteTarget({ type: 'lesson', id: lessonId });
  };

  const isFormValid = form.courseId && form.moduleId && form.title.trim() && form.description.trim() && form.order.trim();

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
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'published' && l.isPublished) || (statusFilter === 'draft' && !l.isPublished);
    const matchesCourse = courseFilter === 'all' || String(l.courseId) === courseFilter || String(allModules.find(m => String(m.id) === String(l.courseId))?.courseId) === courseFilter;
    
    let matchesView = true;
    if (activeView === 'published') matchesView = !!l.isPublished;
    if (activeView === 'draft') matchesView = !l.isPublished;
    if (activeView === 'no_content') matchesView = !l.hasContent;
    if (activeView === 'no_desc') matchesView = !l.description?.trim();
    if (activeView === 'incomplete') matchesView = !l.hasContent || !l.description?.trim();

    return matchesSearch && matchesStatus && matchesCourse && matchesView;
  });

  const stats = {
    total: lessons.length,
    published: lessons.filter(l => l.isPublished).length,
    drafts: lessons.filter(l => !l.isPublished).length,
    withContent: lessons.filter(l => l.hasContent).length,
    healthScore: lessons.length ? Math.round((lessons.filter(l => l.hasContent && l.description?.trim() && l.isPublished).length / lessons.length) * 100) : 0
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

  if (isLoading && lessons.length === 0) return <Loader fullPage />;

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
                id: 'status',
                value: statusFilter,
                onChange: (v) => setStatusFilter(v as any),
                options: [
                  { label: 'حالة الظهور: الكل', value: 'all' },
                  { label: 'منشور فقط', value: 'published' },
                  { label: 'مسودة فقط', value: 'draft' }
                ]
              },
              {
                id: 'course',
                value: courseFilter,
                onChange: setCourseFilter,
                options: [
                  { label: 'جميع المقررات', value: 'all' },
                  ...courses.map(c => ({ label: c.name, value: String(c.id) }))
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
            { id: 'published', label: 'الدروس المنشورة', icon: CheckCircle },
            { id: 'draft', label: 'مسودات مخفية', icon: Clock },
            { id: 'incomplete', label: 'غير مكتملة', icon: AlertTriangle },
            { id: 'no_content', label: 'بدون محتوى', icon: AlertTriangle },
            { id: 'no_desc', label: 'بدون وصف', icon: FileWarning },
          ]}
        />
      </StickyToolbar>

      {/* Performance Monitoring Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <HealthScore score={stats.healthScore} />
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <div className="text-slate-500 text-xs font-bold flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-indigo-500" /> إجمالي الدروس</div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <div className="text-slate-500 text-xs font-bold flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-500" /> الدروس المنشورة</div>
          <div className="text-2xl font-black text-slate-800">{stats.published}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <div className="text-slate-500 text-xs font-bold flex items-center gap-2 mb-1"><PlayCircle className="w-4 h-4 text-blue-500" /> نسبة الاكتمال</div>
          <div className="text-2xl font-black text-slate-800">{stats.total ? Math.round((stats.withContent / stats.total) * 100) : 0}%</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
          <div className="text-slate-500 text-xs font-bold flex items-center gap-2 mb-1"><Timer className="w-4 h-4 text-amber-500" /> مسودات مجدولة</div>
          <div className="text-2xl font-black text-slate-800">{stats.drafts}</div>
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
          {/* Mobile Stacked Cards Layout */}
          <div className="md:hidden divide-y divide-slate-50/80 bg-slate-50/50">
            {/* Mobile Select All Header */}
            <div className="p-4 flex items-center justify-between bg-white border-b border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedLessons(p => p.length === paginatedLessons.length ? [] : paginatedLessons.map(l => l.id))}
                  className="text-slate-400 hover:text-emerald-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center p-2"
                >
                  {selectedLessons.length > 0 && selectedLessons.length === paginatedLessons.length ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                </button>
                <span className="text-xs font-bold text-slate-500">تحديد الكل</span>
              </div>
            </div>

            {paginatedLessons.map(lesson => (
              <div key={lesson.id} className={`p-4 space-y-4 bg-white transition-colors ${selectedLessons.includes(lesson.id) ? 'bg-emerald-50/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => setSelectedLessons(p => p.includes(lesson.id) ? p.filter(id => id !== lesson.id) : [...p, lesson.id])} className="mt-1 text-slate-400 hover:text-emerald-500 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center -m-2">
                    {selectedLessons.includes(lesson.id) ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 font-bold mb-1 truncate max-w-[200px]" title={lesson.title}>{lesson.title}</div>
                    <div className="text-slate-500 text-xs line-clamp-2 leading-relaxed" title={lesson.description}>
                      {lesson.description}
                    </div>
                  </div>
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                    {lesson.order}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400 font-bold">الارتباط:</div>
                    <Breadcrumbs items={[
                      { label: lesson.courseName || 'مقرر مجهول' },
                      { label: allModules.find(m => String(m.id) === String(lesson.courseId))?.title || 'وحدة مجهولة' },
                      { label: lesson.title }
                    ]} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <HealthBadge condition={!lesson.description?.trim()} label="وصف مفقود" type="warning" />
                      <HealthBadge condition={!lesson.hasContent} label="بدون محتوى" type="error" />
                      <HealthBadge condition={!lesson.isPublished} label="غير منشور" type="info" />
                    </div>
                    {lesson.hasContent ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-sm w-fit">
                        <PlayCircle className="w-3 h-3" /> مادة علمية מתوفرة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200 w-fit">
                        <AlertCircle className="w-3 h-3" /> قيد الإعداد
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <StatusBadge status={lesson.isPublished ? 'published' : 'draft'} />
                    <span className="text-[10px] text-slate-400">تحديث: {new Date(lesson.updatedAt).toLocaleDateString('ar-SA')}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPreviewLesson(lesson)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center" title="وضع معاينة الطالب">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => updateLesson({ id: lesson.id, isPublished: !lesson.isPublished })} className={`p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center ${lesson.isPublished ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={lesson.isPublished ? "إلغاء النشر (مسودة)" : "نشر الدرس"}>
                      {lesson.isPublished ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </button>
                    <button onClick={() => void openEdit(lesson)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center" title="تعديل">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => void handleDelete(lesson.id)} disabled={deleteStatus === 'loading'} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50" title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                      <div className="text-slate-500 text-xs truncate max-w-xs leading-relaxed" title={lesson.description}>
                        {lesson.description}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <HealthBadge condition={!lesson.description?.trim()} label="وصف مفقود" type="warning" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-white rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <BookMarked className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{editingLessonId ? 'تعديل بيانات الدرس' : 'صياغة درس جديد'}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">أدخل تفاصيل الدرس واربطه بالوحدة التعليمية المناسبة.</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 rounded-xl transition-all border border-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
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
                      <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      <select
                        value={form.courseId}
                        onChange={e => { setForm(p => ({ ...p, courseId: e.target.value })); setErrors(p => { const x = { ...p }; delete x.courseId; return x; }); }}
                        className={`${inputCls(!!errors.courseId)} pr-11 font-medium appearance-none`}
                        style={{ backgroundPosition: 'left 1rem center', backgroundSize: '1.5em 1.5em', backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat' }}
                      >
                        <option value="" disabled>الرجاء اختيار المقرر...</option>
                        {courses.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.name}</option>)}
                      </select>
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
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative flex-1">
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
                      <div className="grid gap-2">
                        {filteredModules.map(module => (
                          <div key={module.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
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
                
                <Field 
                  label="وصف الدرس" 
                  required 
                  error={errors.description}
                  action={<AIMagicButton onClick={handleGenerateDesc} loading={aiLoading === 'desc'} label="توليد ملخص" />}
                >
                  <textarea value={form.description} onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => { const x = { ...p }; delete x.description; return x; }); }} placeholder="يغطي هذا الدرس المحاور التالية..." rows={3} className={`${inputCls(!!errors.description)} resize-none leading-relaxed text-sm`} />
                </Field>
                
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
  return `w-full px-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 ${
    hasError 
      ? 'border-red-300 bg-red-50/50 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:bg-white' 
      : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
  } ${extra}`;
}
