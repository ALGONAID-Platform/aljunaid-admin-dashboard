import { useState, useEffect, useCallback } from 'react';
import {
  Plus, BookMarked, X, Loader2, CheckCircle, AlertCircle, Trash2, Search, Filter, PlayCircle, Clock, Edit3
} from 'lucide-react';
import { useCoursesStore, useLessonsStore, useModulesStore } from '../../../store';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Loader } from '../../../components/feedback/Loader';
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
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Inline Module Creation
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleCreateLoading, setModuleCreateLoading] = useState(false);

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

  const handleDeleteModule = async (moduleId: number | string) => {
    if (!confirm('تنبيه: حذف الوحدة قد يؤثر على الدروس المرتبطة بها. هل تريد المتابعة؟')) return;
    setModulesError(null);
    try {
      await removeModule(moduleId);
      setForm(prev => ({ ...prev, moduleId: prev.moduleId === String(moduleId) ? '' : prev.moduleId }));
    } catch {
      setModulesError('تعذر حذف الوحدة. تحقق من الصلاحيات أو الارتباطات ثم حاول مجدداً.');
    }
  };

  const validate = (): boolean => {
    const e: FormError = {};
    if (!form.courseId) e.courseId = 'يرجى اختيار المقرر المرجعي';
    if (!form.moduleId) e.moduleId = 'يرجى تحديد الوحدة التي ينتمي لها الدرس';
    if (!form.title.trim()) e.title = 'عنوان الدرس مطلوب';
    else if (form.title.trim().length < 5) e.title = 'يجب أن يكون عنوان الدرس 5 أحرف على الأقل';
    if (!form.description.trim()) e.description = 'نبذة الدرس مطلوبة لتوضيح المحتوى';
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

  const handleDelete = async (lessonId: string) => {
    if (!confirm('تنبيه: هل تريد حذف هذا الدرس نهائياً؟')) return;
    setDeleteStatus('loading');
    try {
      await deleteLesson(lessonId);
      setDeleteStatus('idle');
    } catch {
      setDeleteStatus('error');
    }
  };

  const isFormValid = form.courseId && form.moduleId && form.title.trim() && form.description.trim() && form.order.trim();

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (l.courseName && l.courseName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading && lessons.length === 0) return <Loader fullPage />;

  return (
    <div className="font-sans antialiased text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1">
            إدارة الدروس والمحتوى
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            تصفح، أضف، ونظّم {lessons.length} درس مسجّل. قم ببناء الهيكل التعليمي لمقرراتك.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن درس أو مقرر..."
              className="w-full sm:w-64 pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
          
          <button
            onClick={openModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            إنشاء درس جديد
          </button>
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
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['التسلسل', 'معلومات الدرس', 'الارتباط التعليمي', 'المحتوى المرفق', 'حالة الظهور', 'سجل النشاط', 'الإجراءات'].map((h, i) => (
                    <th key={i} className="px-6 py-4 text-slate-500 font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {[...filteredLessons].sort((a, b) => a.order - b.order).map(lesson => (
                  <tr key={lesson.id} className="hover:bg-slate-50/80 transition-colors group">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg w-max border border-slate-100">
                        <BookMarked className="w-3.5 h-3.5 text-slate-400" />
                        {lesson.courseName || 'غير محدد'}
                      </div>
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
                      {lesson.isPublished ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5" /> منشور متاح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 shadow-sm">
                          <Clock className="w-3.5 h-3.5" /> مسودة مخفية
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                      <div className="flex flex-col gap-1.5">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> إنشـاء: <span className="font-mono">{new Date(lesson.createdAt).toLocaleDateString('en-GB')}</span></span>
                        {lesson.isPublished && lesson.publishedAt && (
                          <span className="flex items-center gap-1.5 text-emerald-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> نـشـر: <span className="font-mono">{new Date(lesson.publishedAt).toLocaleDateString('en-GB')}</span></span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => void openEdit(lesson)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Lesson"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(lesson.id)}
                          disabled={deleteStatus === 'loading'}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Lesson"
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
        </div>
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
                        <button type="button" onClick={() => setIsCreatingModule(true)} title="تأسيس وحدة جديدة" className="shrink-0 px-4 py-3 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 font-bold transition-all border-2 border-emerald-100 shadow-sm flex items-center gap-2 text-sm">
                          <Plus className="w-4 h-4" strokeWidth={3} /> وحدة جديدة
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

                <Field label="عنوان الدرس" required error={errors.title}>
                  <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => { const x = { ...p }; delete x.title; return x; }); }} placeholder="مثال: حل المعادلات من الدرجة الأولى" className={inputCls(!!errors.title, 'font-semibold')} />
                </Field>
                
                <Field label="وصف الدرس" required error={errors.description}>
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
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] flex items-center justify-end gap-3 shrink-0">
              <button onClick={closeModal} className="px-6 py-3 text-slate-600 font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-all focus:ring-2 focus:ring-slate-200">
                إلغاء الأمر
              </button>
              <button onClick={handleSave} disabled={!isFormValid || saveStatus === 'loading' || saveStatus === 'success'} className="px-8 py-3 text-white rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                {saveStatus === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                {saveStatus === 'success' && <CheckCircle className="w-5 h-5 animate-bounce" />}
                {saveStatus === 'loading' ? 'جاري المعالجة...' : saveStatus === 'success' ? 'تم الحفظ!' : editingLessonId ? 'حفظ تعديلات الدرس' : 'حفظ الدرس الجديد'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
