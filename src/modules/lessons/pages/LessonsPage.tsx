import { useState, useEffect } from 'react';
import { Plus, BookMarked, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useCoursesStore, useLessonsStore } from '../../../store';
import { modulesService } from '../../../services/api/modules.api';
import { EmptyState } from '../../../components/feedback/EmptyState';
import type { Lesson } from '../../../types';
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
  const { lessons, addLesson, fetchLessons, error } = useLessonsStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    void fetchCourses();
    void fetchLessons();
  }, [fetchCourses, fetchLessons]);
  const [form, setForm] = useState<FormState>({ courseId: '', moduleId: '', title: '', description: '', order: '' });
  const [errors, setErrors] = useState<FormError>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [modules, setModules] = useState<BackendModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);

  // Inline Module Creation
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [moduleCreateLoading, setModuleCreateLoading] = useState(false);

  const resetModal = () => {
    setForm({ courseId: '', moduleId: '', title: '', description: '', order: '' });
    setErrors({});
    setSaveStatus('idle');
    setModules([]);
    setModulesError(null);
    setIsCreatingModule(false);
    setNewModuleTitle('');
    setNewModuleDesc('');
  };
  const openModal = () => { resetModal(); setShowModal(true); };
  const closeModal = () => { setShowModal(false); resetModal(); };

  // Fetch modules when course is selected
  useEffect(() => {
    if (!form.courseId) { setModules([]); return; }
    setModulesLoading(true);
    setModulesError(null);
    setForm(p => ({ ...p, moduleId: '' }));
    modulesService.getByCourse(form.courseId)
      .then(mods => { setModules(mods); setModulesLoading(false); })
      .catch(() => { setModulesError('فشل تحميل الوحدات. تحقق من الاتصال.'); setModulesLoading(false); });
  }, [form.courseId]);

  const suggestedOrder = (): number => {
    if (!form.moduleId) return 1;
    return lessons.filter(l => l.courseId === form.moduleId).length + 1;
  };

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim() || !newModuleDesc.trim() || !form.courseId) return;
    setModuleCreateLoading(true);
    try {
      const newMod = await modulesService.create({
        courseId: Number(form.courseId),
        title: newModuleTitle.trim(),
        description: newModuleDesc.trim(),
      } as any);
      setModules(prev => [...prev, newMod]);
      setForm(p => ({ ...p, moduleId: String(newMod.id) }));
      setIsCreatingModule(false);
      setNewModuleTitle('');
      setNewModuleDesc('');
    } catch (err) {
      setModulesError('فشل إنشاء الوحدة. يرجى المحاولة مرة أخرى.');
    } finally {
      setModuleCreateLoading(false);
    }
  };

  const validate = (): boolean => {
    const e: FormError = {};
    if (!form.courseId) e.courseId = 'يرجى اختيار المقرر';
    if (!form.moduleId) e.moduleId = 'يرجى اختيار الوحدة';
    if (!form.title.trim()) e.title = 'عنوان الدرس مطلوب';
    if (!form.description.trim()) e.description = 'وصف الدرس مطلوب';
    if (!form.order.trim()) e.order = 'ترتيب الدرس مطلوب';
    else if (isNaN(Number(form.order)) || Number(form.order) < 1) e.order = 'يجب أن يكون الترتيب رقماً موجباً';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveStatus('loading');
    const course = courses.find(c => c.id === form.courseId)!;
    try {
      await addLesson({
        courseId: form.moduleId, // Backend expects moduleId — we pass moduleId as courseId
        courseName: course.name,
        title: form.title.trim(),
        description: form.description.trim(),
        order: Number(form.order),
      });
      setSaveStatus('success');
      setTimeout(closeModal, 1200);
    } catch {
      setSaveStatus('error');
      setErrors(prev => ({ ...prev, submit: 'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى' }));
    }
  };

  const isFormValid = form.courseId && form.moduleId && form.title.trim() && form.description.trim() && form.order.trim();

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-800" style={{ fontSize: 20, fontWeight: 700 }}>إدارة الدروس</h2>
          <p className="text-slate-400" style={{ fontSize: 13 }}>{lessons.length} درس في المنصة</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all shadow-md"
          style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', fontSize: 14, fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          إنشاء درس جديد
        </button>
      </div>

      {error && lessons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center shadow-sm flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-slate-800 mb-2" style={{ fontSize: 18, fontWeight: 700 }}>فشل تحميل الدروس</h3>
          <p className="text-slate-500 mb-6" style={{ fontSize: 14 }}>{error}</p>
          <button onClick={() => void fetchLessons()} className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
            إعادة المحاولة
          </button>
        </div>
      ) : lessons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={BookMarked} title="لا توجد دروس بعد" description="ابدأ بإنشاء أول درس في مقرراتك"
            action={<button onClick={openModal} className="px-5 py-2.5 text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14, fontWeight: 600 }}>إنشاء درس</button>}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['الترتيب', 'عنوان الدرس', 'الوحدة/المقرر', 'المحتوى', 'الحالة', 'تاريخ الإنشاء'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-slate-500 border-b border-slate-100 whitespace-nowrap" style={{ fontWeight: 600, fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...lessons].sort((a, b) => a.order - b.order).map(lesson => (
                  <tr key={lesson.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500" style={{ fontSize: 13, fontWeight: 600 }}>{lesson.order}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700" style={{ fontWeight: 500 }}>{lesson.title}</div>
                      <div className="text-slate-400" style={{ fontSize: 12 }}>{lesson.description.slice(0, 50)}{lesson.description.length > 50 ? '...' : ''}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="text-slate-600" style={{ fontSize: 13 }}>{lesson.courseName}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${lesson.hasContent ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {lesson.hasContent ? 'يحتوي محتوى' : 'بدون محتوى'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs px-2.5 py-1 rounded-full" style={lesson.isPublished ? { background: '#ECFDF5', color: '#059669' } : { background: '#FFF7ED', color: '#B45309' }}>
                        {lesson.isPublished ? 'منشور' : 'مسودة'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap" style={{ fontSize: 12 }}>{lesson.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-slate-800" style={{ fontSize: 17, fontWeight: 700 }}>إنشاء درس جديد</h3>
              <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {errors.submit && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /><span style={{ fontSize: 13 }}>{errors.submit}</span>
                </div>
              )}

              {/* Step 1: Select Course */}
              <Field label="المقرر" required error={errors.courseId}>
                {courses.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /><span style={{ fontSize: 13 }}>لا توجد مقررات. قم بإنشاء مقرر أولاً</span>
                  </div>
                ) : (
                  <select
                    value={form.courseId}
                    onChange={e => { setForm(p => ({ ...p, courseId: e.target.value })); setErrors(p => { const x = { ...p }; delete x.courseId; return x; }); }}
                    className={inputCls(!!errors.courseId)}
                  >
                    <option value="">اختر المقرر...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </Field>

              {/* Step 2: Select Module */}
              <Field label="الوحدة" required error={errors.moduleId}>
                {!form.courseId ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400" style={{ fontSize: 13 }}>
                    اختر المقرر أولاً لعرض وحداته
                  </div>
                ) : modulesLoading ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /><span style={{ fontSize: 13 }}>جارٍ تحميل الوحدات...</span>
                  </div>
                ) : modulesError ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600" style={{ fontSize: 13 }}>{modulesError}</div>
                ) : isCreatingModule ? (
                  <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl space-y-3">
                    <h4 className="text-emerald-800 text-sm font-semibold">إنشاء وحدة جديدة</h4>
                    <input value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} placeholder="اسم الوحدة..." className="w-full px-3 py-2 rounded-lg border border-emerald-200 outline-none focus:border-emerald-500 text-sm" />
                    <textarea value={newModuleDesc} onChange={e => setNewModuleDesc(e.target.value)} placeholder="وصف الوحدة..." rows={2} className="w-full px-3 py-2 rounded-lg border border-emerald-200 outline-none focus:border-emerald-500 text-sm resize-none" />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleCreateModule} disabled={moduleCreateLoading || !newModuleTitle.trim() || !newModuleDesc.trim()} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1">
                        {moduleCreateLoading && <Loader2 className="w-3 h-3 animate-spin" />} إنشاء الوحدة
                      </button>
                      <button type="button" onClick={() => setIsCreatingModule(false)} className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors">
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : modules.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4" /><span style={{ fontSize: 13 }}>لا توجد وحدات لهذا المقرر.</span>
                    </div>
                    <button type="button" onClick={() => setIsCreatingModule(true)} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 w-max">
                      <Plus className="w-3 h-3" /> إنشاء وحدة جديدة
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={form.moduleId}
                      onChange={e => { setForm(p => ({ ...p, moduleId: e.target.value })); setErrors(p => { const x = { ...p }; delete x.moduleId; return x; }); }}
                      className={`flex-1 ${inputCls(!!errors.moduleId)}`}
                    >
                      <option value="">اختر الوحدة...</option>
                      {modules.map(m => <option key={m.id} value={String(m.id)}>{m.title}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsCreatingModule(true)} title="إنشاء وحدة جديدة" className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </Field>

              <Field label="عنوان الدرس" required error={errors.title}>
                <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => { const x = { ...p }; delete x.title; return x; }); }} placeholder="مثال: مقدمة في أنظمة التشغيل" className={inputCls(!!errors.title)} />
              </Field>
              <Field label="وصف الدرس" required error={errors.description}>
                <textarea value={form.description} onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => { const x = { ...p }; delete x.description; return x; }); }} placeholder="اكتب وصفاً مختصراً لمحتوى الدرس..." rows={3} className={`${inputCls(!!errors.description)} resize-none`} />
              </Field>
              <Field label="ترتيب الدرس" required error={errors.order}>
                <div className="flex gap-2 items-end">
                  <input type="number" min={1} value={form.order} onChange={e => { setForm(p => ({ ...p, order: e.target.value })); setErrors(p => { const x = { ...p }; delete x.order; return x; }); }} placeholder="رقم الترتيب" className={`flex-1 ${inputCls(!!errors.order)}`} style={{ direction: 'ltr', textAlign: 'center' }} />
                  {form.moduleId && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, order: String(suggestedOrder()) }))} className="px-3 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all whitespace-nowrap" style={{ fontSize: 12, fontWeight: 500, background: '#F0FDF4' }}>
                      اقتراح: {suggestedOrder()}
                    </button>
                  )}
                </div>
              </Field>
            </div>
            {errors.submit && (
              <div className="px-5">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span style={{ fontSize: 13 }}>{errors.submit}</span>
                </div>
              </div>
            )}
            <div className="p-5 border-t border-slate-100 flex gap-3 mt-4">
              <button onClick={handleSave} disabled={!isFormValid || saveStatus === 'loading' || saveStatus === 'success'} className="flex-1 py-3 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14, fontWeight: 600 }}>
                {saveStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                {saveStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                {saveStatus === 'loading' ? 'جارٍ الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : 'حفظ الدرس'}
              </button>
              <button onClick={closeModal} className="px-4 py-3 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" style={{ fontSize: 14 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
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
