import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Edit3, Trash2, X, Loader2, BookOpen, AlertCircle, CheckCircle2, Search, BookMarked, FileText, FileSpreadsheet
} from 'lucide-react';
import { useCoursesStore, useModulesStore, useLessonsStore, useContentStore, useExamModelsStore } from '../../store';
import { CascadeDeleteModal } from './CascadeDeleteModal';
import type { BackendModule } from '../../types/api';

interface ModuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourseId?: string;
  onModuleSelected?: (moduleId: string) => void;
}

export const ModuleManagerModal: React.FC<ModuleManagerModalProps> = ({
  isOpen,
  onClose,
  initialCourseId,
  onModuleSelected,
}) => {
  const { courses, fetchCourses } = useCoursesStore();
  const { modules, fetchModules, addModule, updateModule } = useModulesStore();
  const { lessons } = useLessonsStore();
  const { content } = useContentStore();
  const { examModels, fetchExamModels } = useExamModelsStore();

  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetCourseId, setTargetCourseId] = useState<string>('');
  
  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Cascade Delete State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void fetchCourses();
      void fetchModules();
      void fetchExamModels();
      if (initialCourseId) {
        setSelectedCourseId(initialCourseId);
        setTargetCourseId(initialCourseId);
      } else if (courses.length > 0 && !targetCourseId) {
        setTargetCourseId(String(courses[0].id));
      }
    }
  }, [isOpen, initialCourseId, fetchCourses, fetchModules, fetchExamModels]);

  if (!isOpen) return null;

  const filteredModules = modules.filter(m => {
    const matchesCourse = selectedCourseId === 'all' || String(m.courseId) === String(selectedCourseId);
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCourse && matchesSearch;
  });

  const resetForm = () => {
    setIsEditing(false);
    setEditingModuleId(null);
    setTitle('');
    setDescription('');
    setFormError(null);
    setFormSuccess(null);
    if (selectedCourseId !== 'all') {
      setTargetCourseId(selectedCourseId);
    } else if (courses.length > 0) {
      setTargetCourseId(String(courses[0].id));
    }
  };

  const handleStartEdit = (mod: BackendModule) => {
    setIsEditing(true);
    setEditingModuleId(mod.id);
    setTitle(mod.title);
    setDescription(mod.description || '');
    setTargetCourseId(String(mod.courseId));
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('عنوان الوحدة مطلوب.');
      return;
    }
    if (!targetCourseId) {
      setFormError('يرجى تحديد المقرر التابع للوحدة.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      if (isEditing && editingModuleId) {
        await updateModule(editingModuleId, {
          courseId: Number(targetCourseId) || (targetCourseId as any),
          title: title.trim(),
          description: description.trim(),
        });
        setFormSuccess('تم تحديث الوحدة التعليمية بنجاح');
      } else {
        const newMod = await addModule({
          courseId: Number(targetCourseId) || (targetCourseId as any),
          title: title.trim(),
          description: description.trim(),
        });
        setFormSuccess('تم إنشاء الوحدة التعليمية بنجاح');
        if (onModuleSelected) {
          onModuleSelected(String(newMod.id));
        }
      }
      setTimeout(() => {
        resetForm();
      }, 1200);
    } catch (err: any) {
      setFormError(err?.message || 'تعذر حفظ الوحدة. تحقق من الاتصال بالشبكة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="bg-white w-full h-full sm:max-h-[92vh] sm:max-w-5xl rounded-none sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border-0 sm:border border-indigo-100 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-black text-slate-800">إدارة الوحدات التعليمية</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">إنشاء وتعديل واستعراض وحدات المقررات الدراسية</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 touch-target shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Grid: Left side Form, Right side Modules List */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-12 custom-scrollbar">

          {/* Left Column: Create/Edit Form (5 Cols) */}
          <div className="lg:col-span-5 p-5 sm:p-6 bg-slate-50/80 border-b lg:border-b-0 lg:border-l border-slate-200 lg:overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                {isEditing ? <Edit3 className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                {isEditing ? 'تعديل بيانات الوحدة' : 'إضافة وحدة تعليمية جديدة'}
              </h4>
              {isEditing && (
                <button onClick={resetForm} className="text-xs text-slate-500 hover:text-red-600 font-bold underline">
                  إلغاء التعديل
                </button>
              )}
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المقرر المرجعي <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetCourseId}
                  onChange={e => setTargetCourseId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="" disabled>اختر المقرر...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  عنوان الوحدة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: الوحدة الأولى - أساسيات الجبر"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الوصف والنبذة التعليمية
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="نبذة شاملة عن المحاور المغطاة في هذه الوحدة..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl text-white font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isEditing ? 'حفظ تعديلات الوحدة' : 'إنشاء الوحدة التعليمية'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Modules Listing & Search (7 Cols) */}
          <div className="lg:col-span-7 p-5 sm:p-6 lg:overflow-y-auto space-y-4 flex flex-col min-h-0">
            
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="بحث في الوحدات..."
                  className="w-full pr-9 pl-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-colors"
                >
                  <option value="all">كل المقررات ({modules.length})</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modules List Container */}
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {filteredModules.length === 0 ? (
                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                  <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600 mb-1">لا توجد وحدات تعليمية مسجلة</p>
                  <p className="text-xs text-slate-400">استخدم النموذج المقابل لإضافة أول وحدة تعليمية لهذا المقرر.</p>
                </div>
              ) : (
                filteredModules.map(mod => {
                  const parentCourse = courses.find(c => String(c.id) === String(mod.courseId));
                  const modLessons = lessons.filter(l => String(l.courseId) === String(mod.id));
                  const modLessonIds = modLessons.map(l => String(l.id));
                  const modContent = content.filter(c => modLessonIds.includes(String(c.lessonId)));
                  const modExamModels = examModels.filter(e => String(e.moduleId) === String(mod.id));
                  const isDraft = String(mod.id).startsWith('draft-');

                  return (
                    <div 
                      key={mod.id}
                      className={`p-4 rounded-2xl border transition-all bg-white shadow-sm hover:shadow-md ${
                        editingModuleId === mod.id ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-bold text-slate-800 text-sm">{mod.title}</h5>
                              {isDraft && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                                  مسودة
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mb-2 line-clamp-2 leading-relaxed">
                              {mod.description || 'لا يوجد وصف لهذه الوحدة.'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-400">
                              <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> {parentCourse?.name || 'مقرر دراسي'}
                              </span>
                              <span className="flex items-center gap-1 text-slate-500">
                                <BookMarked className="w-3.5 h-3.5 text-blue-500" /> {modLessons.length} دروس
                              </span>
                              <span className="flex items-center gap-1 text-slate-500">
                                <FileText className="w-3.5 h-3.5 text-emerald-500" /> {modContent.length} عناصر محتوى
                              </span>
                              <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" /> {modExamModels.length} نماذج امتحانات
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleStartEdit(mod)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-100"
                            title="تعديل الوحدة"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(String(mod.id))}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-100"
                            title="حذف الوحدة نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 text-xs font-bold text-slate-500">
          <span>إجمالي الوحدات: {filteredModules.length} وحدة</span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>

      {/* Cascade Delete Modal Integration */}
      <CascadeDeleteModal
        isOpen={!!deleteTargetId}
        targetType="module"
        targetId={deleteTargetId || ''}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
