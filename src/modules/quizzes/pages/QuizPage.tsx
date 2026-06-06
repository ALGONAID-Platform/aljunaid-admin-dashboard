import { useState, useEffect } from 'react';
import { Plus, ClipboardList, X, Loader2, CheckCircle, AlertCircle, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { useCoursesStore, useLessonsStore, useQuizzesStore } from '../../../store';
import { EmptyState } from '../../../components/feedback/EmptyState';
import type { Question, QuestionType } from '../../../types';

const Q_TYPE_LABELS: Record<string, string> = { mcq: 'اختيار متعدد', truefalse: 'صح / خطأ' };

function newQuestion(type: 'mcq' | 'truefalse' = 'mcq'): Question {
  return {
    id: Date.now().toString() + Math.random(),
    type,
    text: '',
    options: type === 'mcq' ? ['', '', '', ''] : ['صح', 'خطأ'],
    correctAnswer: type === 'truefalse' ? 'صح' : '',
  };
}

type SaveStatus = 'idle' | 'loading' | 'success' | 'error';

export function QuizPage() {
  const { courses, fetchCourses } = useCoursesStore();
  const { lessons, fetchLessons } = useLessonsStore();
  const { quizzes, addQuiz, fetchQuizzes, error } = useQuizzesStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    void fetchCourses();
    void fetchLessons();
    void fetchQuizzes();
  }, [fetchCourses, fetchLessons, fetchQuizzes]);
  const [step, setStep] = useState<'info' | 'questions'>('info');

  const [courseId, setCourseId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [passingScore, setPassingScore] = useState('60');
  const [timeLimit, setTimeLimit] = useState('30');
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});

  const [questions, setQuestions] = useState<Question[]>([newQuestion('mcq')]);
  const [qErrors, setQErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  const resetModal = () => {
    setStep('info'); setCourseId(''); setLessonId(''); setTitle(''); setDescription('');
    setInstructions(''); setPassingScore('60'); setTimeLimit('30');
    setInfoErrors({}); setQuestions([newQuestion('mcq')]); setQErrors({}); setSaveStatus('idle');
    setEditingQuizId(null);
  };

  const openModal = () => { resetModal(); setShowModal(true); };
  const closeModal = () => { setShowModal(false); resetModal(); };

  const openEditModal = (quiz: any) => {
    setEditingQuizId(quiz.id);
    setStep('info');
    setCourseId(quiz.courseId || '');
    setLessonId(quiz.lessonId);
    setTitle(quiz.title);
    setDescription(quiz.description);
    setInstructions(quiz.instructions || '');
    setPassingScore(String(quiz.passingScore));
    setTimeLimit(String(quiz.timeLimit));
    setQuestions(quiz.questions);
    setInfoErrors({});
    setQErrors({});
    setSaveStatus('idle');
    setShowModal(true);
  };

  // lesson.courseId actually stores moduleId (due to backend hierarchy adaptation)
  // Filter: no direct course→lesson mapping possible without going through modules
  // We show ALL lessons and let the user pick (lessons belong to modules, not courses directly)
  const availableLessons = courseId
    ? lessons.filter(l => l.courseId === courseId) // courseId here is the moduleId in the backend
    : lessons;

  const validateInfo = (): boolean => {
    const e: Record<string, string> = {};
    if (!courseId) e.courseId = 'يرجى اختيار المقرر';
    if (!lessonId) e.lessonId = 'يرجى اختيار الدرس';
    if (!title.trim()) e.title = 'عنوان الاختبار مطلوب';
    if (!description.trim()) e.description = 'وصف الاختبار مطلوب';
    if (!instructions.trim()) e.instructions = 'تعليمات الاختبار مطلوبة';
    if (!passingScore || isNaN(Number(passingScore)) || Number(passingScore) < 1 || Number(passingScore) > 100) e.passingScore = 'درجة النجاح يجب أن تكون بين 1 و 100';
    if (!timeLimit || isNaN(Number(timeLimit)) || Number(timeLimit) < 1) e.timeLimit = 'الوقت يجب أن يكون أكبر من صفر';
    setInfoErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateQuestions = (): boolean => {
    const e: Record<string, string> = {};
    questions.forEach((q, i) => {
      if (!q.text.trim()) e[`q_${i}_text`] = 'نص السؤال مطلوب';
      if (q.type === 'mcq') {
        if (q.options.some(o => !o.trim())) e[`q_${i}_opts`] = 'يجب تعبئة جميع خيارات الإجابة';
        if (!q.correctAnswer) e[`q_${i}_ans`] = 'يرجى تحديد الإجابة الصحيحة';
      }
      if (q.type === 'short' && !q.correctAnswer.trim()) e[`q_${i}_ans`] = 'يرجى كتابة الإجابة النموذجية';
    });
    setQErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validateQuestions()) return;
    setSaveStatus('loading');
    const course = courses.find(c => c.id === courseId)!;
    const lesson = lessons.find(l => l.id === lessonId)!;
    try {
      if (editingQuizId) {
        await useQuizzesStore.getState().updateQuiz({
          id: editingQuizId,
          courseId, lessonId,
          title: title.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          passingScore: Number(passingScore),
          timeLimit: Number(timeLimit),
          questions,
        });
      } else {
        await addQuiz({
          courseId, lessonId,
          courseName: course?.name || '',
          lessonTitle: lesson?.title || '',
          title: title.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          passingScore: Number(passingScore),
          timeLimit: Number(timeLimit),
          questions,
        });
      }
      setSaveStatus('success');
      setTimeout(closeModal, 1200);
    } catch (err: any) {
      setSaveStatus('error');
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.includes('Exam already exists') || msg.includes('يوجد اختبار مسبقاً')) {
        const existing = quizzes.find(q => q.lessonId === lessonId);
        if (existing) {
          openEditModal(existing);
          setQErrors(prev => ({ ...prev, submit: 'هذا الدرس يحتوي على اختبار بالفعل. تم تحويلك لوضع التعديل.' }));
          return;
        }
      }
      setQErrors(prev => ({ ...prev, submit: 'فشل حفظ الاختبار. يرجى المحاولة مرة أخرى.' }));
    }
  };

  const updateQuestion = (idx: number, patch: Partial<Question>) => setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q));
  const removeQuestion = (idx: number) => { if (questions.length === 1) return; setQuestions(qs => qs.filter((_, i) => i !== idx)); };
  const moveQuestion = (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= questions.length) return;
    setQuestions(qs => { const arr = [...qs]; [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]; return arr; });
  };
  const changeQuestionType = (idx: number, type: QuestionType) => {
    const q = questions[idx];
    updateQuestion(idx, { type, options: type === 'mcq' ? ['', '', '', ''] : type === 'truefalse' ? ['صح', 'خطأ'] : [], correctAnswer: type === 'truefalse' ? 'صح' : '', text: q.text });
  };

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-800" style={{ fontSize: 20, fontWeight: 700 }}>إدارة الاختبارات</h2>
          <p className="text-slate-400" style={{ fontSize: 13 }}>{quizzes.length} اختبار في المنصة</p>
        </div>
        <button onClick={openModal} className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', fontSize: 14, fontWeight: 600 }}>
          <Plus className="w-4 h-4" />إنشاء اختبار جديد
        </button>
      </div>

      {error && quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center shadow-sm flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-slate-800 mb-2" style={{ fontSize: 18, fontWeight: 700 }}>فشل تحميل الاختبارات</h3>
          <p className="text-slate-500 mb-6" style={{ fontSize: 14 }}>{error}</p>
          <button onClick={() => void fetchQuizzes()} className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
            إعادة المحاولة
          </button>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={ClipboardList} title="لا توجد اختبارات بعد" description="ابدأ بإنشاء أول اختبار"
            action={<button onClick={openModal} className="px-5 py-2.5 text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14, fontWeight: 600 }}>إنشاء اختبار</button>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-slate-800" style={{ fontSize: 16, fontWeight: 600 }}>{quiz.title}</h3>
                  <p className="text-slate-400" style={{ fontSize: 13 }}>{quiz.courseName} · {quiz.lessonTitle}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <InfoPill label={`${quiz.questions.length} سؤال`} color="#3B82F6" bg="#EFF6FF" />
                  <InfoPill label={`${quiz.passingScore}% نجاح`} color="#10B981" bg="#ECFDF5" />
                  <InfoPill label={`${quiz.timeLimit} دقيقة`} color="#8B5CF6" bg="#F5F3FF" />
                </div>
              </div>
              <p className="text-slate-500" style={{ fontSize: 13 }}>{quiz.description}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-slate-800" style={{ fontSize: 17, fontWeight: 700 }}>إنشاء اختبار جديد</h3>
                <div className="flex items-center gap-2 mt-1">
                  <StepDot active={step === 'info'} done={step === 'questions'} label="1. معلومات الاختبار" />
                  <div className="w-8 h-px bg-slate-200" />
                  <StepDot active={step === 'questions'} done={false} label="2. الأسئلة" />
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {step === 'info' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="المقرر" required error={infoErrors.courseId}>
                      <select value={courseId} onChange={e => { setCourseId(e.target.value); setLessonId(''); setInfoErrors(p => { const x = { ...p }; delete x.courseId; return x; }); }} className={ic(!!infoErrors.courseId)}>
                        <option value="">اختر المقرر...</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="الدرس" required error={infoErrors.lessonId}>
                      <select value={lessonId} onChange={e => { setLessonId(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.lessonId; return x; }); }} className={ic(!!infoErrors.lessonId)} disabled={!courseId}>
                        <option value="">اختر الدرس...</option>
                        {availableLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="عنوان الاختبار" required error={infoErrors.title}>
                    <input value={title} onChange={e => { setTitle(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.title; return x; }); }} placeholder="مثال: اختبار الوحدة الأولى" className={ic(!!infoErrors.title)} />
                  </Field>
                  <Field label="وصف الاختبار" required error={infoErrors.description}>
                    <textarea value={description} onChange={e => { setDescription(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.description; return x; }); }} rows={2} placeholder="وصف مختصر للاختبار..." className={`${ic(!!infoErrors.description)} resize-none`} />
                  </Field>
                  <Field label="تعليمات الاختبار" required error={infoErrors.instructions}>
                    <textarea value={instructions} onChange={e => { setInstructions(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.instructions; return x; }); }} rows={2} placeholder="مثال: أجب على جميع الأسئلة بعناية..." className={`${ic(!!infoErrors.instructions)} resize-none`} />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="درجة النجاح (%)" required error={infoErrors.passingScore}>
                      <input type="number" min={1} max={100} value={passingScore} onChange={e => { setPassingScore(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.passingScore; return x; }); }} className={ic(!!infoErrors.passingScore)} style={{ direction: 'ltr', textAlign: 'center' }} />
                    </Field>
                    <Field label="الوقت المسموح (دقيقة)" required error={infoErrors.timeLimit}>
                      <input type="number" min={1} value={timeLimit} onChange={e => { setTimeLimit(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.timeLimit; return x; }); }} className={ic(!!infoErrors.timeLimit)} style={{ direction: 'ltr', textAlign: 'center' }} />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700">
                      <AlertCircle className="w-4 h-4" /><span style={{ fontSize: 13 }}>فشل الحفظ. يرجى المحاولة مجدداً</span>
                    </div>
                  )}
                  {questions.map((q, idx) => (
                    <div key={q.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <GripVertical className="w-4 h-4 text-slate-300" />
                        <span className="text-slate-500" style={{ fontSize: 12, fontWeight: 600 }}>السؤال {idx + 1}</span>
                        <div className="flex gap-1 mr-auto">
                          {(['mcq', 'truefalse'] as const).map(t => (
                            <button key={t} onClick={() => changeQuestionType(idx, t)} className="px-2 py-1 rounded-lg border transition-all" style={q.type === t ? { background: '#ECFDF5', borderColor: '#10B981', color: '#059669', fontSize: 11, fontWeight: 600 } : { background: 'white', borderColor: '#E2E8F0', color: '#64748B', fontSize: 11 }}>
                              {Q_TYPE_LABELS[t]}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => moveQuestion(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp className="w-4 h-4" /></button>
                          <button onClick={() => moveQuestion(idx, 'down')} disabled={idx === questions.length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown className="w-4 h-4" /></button>
                          <button onClick={() => removeQuestion(idx)} disabled={questions.length === 1} className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <textarea value={q.text} onChange={e => updateQuestion(idx, { text: e.target.value })} placeholder="اكتب نص السؤال هنا..." rows={2} className={`w-full px-3 py-2.5 rounded-xl border outline-none resize-none transition-all mb-2 ${qErrors[`q_${idx}_text`] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white focus:border-emerald-400'}`} style={{ fontSize: 14 }} />
                      {qErrors[`q_${idx}_text`] && <p className="text-red-500 mb-2" style={{ fontSize: 12 }}>{qErrors[`q_${idx}_text`]}</p>}
                      {q.type === 'mcq' && (
                        <div className="space-y-2">
                          <p className="text-slate-500" style={{ fontSize: 12, fontWeight: 500 }}>خيارات الإجابة (حدد الإجابة الصحيحة)</p>
                          {qErrors[`q_${idx}_opts`] && <p className="text-red-500" style={{ fontSize: 12 }}>{qErrors[`q_${idx}_opts`]}</p>}
                          {qErrors[`q_${idx}_ans`] && <p className="text-red-500" style={{ fontSize: 12 }}>{qErrors[`q_${idx}_ans`]}</p>}
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input type="radio" name={`q_${idx}_correct`} checked={q.correctAnswer === opt && opt !== ''} onChange={() => updateQuestion(idx, { correctAnswer: opt })} className="w-4 h-4 accent-emerald-500" />
                              <input value={opt} onChange={e => { const newOpts = [...q.options]; newOpts[oi] = e.target.value; const newCorrect = q.correctAnswer === q.options[oi] ? e.target.value : q.correctAnswer; updateQuestion(idx, { options: newOpts, correctAnswer: newCorrect }); }} placeholder={`الخيار ${oi + 1}`} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-emerald-400 transition-all" style={{ fontSize: 13 }} />
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'truefalse' && (
                        <div>
                          <p className="text-slate-500 mb-2" style={{ fontSize: 12, fontWeight: 500 }}>الإجابة الصحيحة</p>
                          <div className="flex gap-3">
                            {['صح', 'خطأ'].map(opt => (
                              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name={`q_${idx}_tf`} checked={q.correctAnswer === opt} onChange={() => updateQuestion(idx, { correctAnswer: opt })} className="w-4 h-4 accent-emerald-500" />
                                <span style={{ fontSize: 14 }}>{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      {q.type === 'short' && (
                        <div>
                          <p className="text-slate-500 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>الإجابة النموذجية</p>
                          {qErrors[`q_${idx}_ans`] && <p className="text-red-500 mb-1" style={{ fontSize: 12 }}>{qErrors[`q_${idx}_ans`]}</p>}
                          <input value={q.correctAnswer} onChange={e => updateQuestion(idx, { correctAnswer: e.target.value })} placeholder="اكتب الإجابة النموذجية..." className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-400 transition-all" style={{ fontSize: 13 }} />
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setQuestions(qs => [...qs, newQuestion('mcq')])} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center justify-center gap-2" style={{ fontSize: 14 }}>
                    <Plus className="w-4 h-4" />إضافة سؤال جديد
                  </button>
                  {qErrors.submit && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl mt-4">
                      <AlertCircle className="w-5 h-5" />
                      <span style={{ fontSize: 13 }}>{qErrors.submit}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
              {step === 'info' ? (
                <>
                  <button onClick={() => { if (validateInfo()) setStep('questions'); }} className="flex-1 py-3 text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14, fontWeight: 600 }}>التالي: إضافة الأسئلة ←</button>
                  <button onClick={closeModal} className="px-4 py-3 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" style={{ fontSize: 14 }}>إلغاء</button>
                </>
              ) : (
                <>
                  <button onClick={handleSave} disabled={saveStatus === 'loading' || saveStatus === 'success'} className="flex-1 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14, fontWeight: 600 }}>
                    {saveStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saveStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                    {saveStatus === 'loading' ? 'جارٍ الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : `حفظ الاختبار (${questions.length} سؤال)`}
                  </button>
                  <button onClick={() => setStep('info')} className="px-4 py-3 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" style={{ fontSize: 14 }}>→ السابق</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span className="px-2.5 py-1 rounded-lg text-xs" style={{ background: bg, color, fontWeight: 500 }}>{label}</span>;
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={active ? { background: '#10B981', color: 'white' } : done ? { background: '#D1FAE5', color: '#059669' } : { background: '#F1F5F9', color: '#94A3B8' }}>
        {done ? '✓' : active ? '●' : '○'}
      </div>
      <span style={{ fontSize: 12, color: active ? '#059669' : '#94A3B8', fontWeight: active ? 600 : 400 }}>{label}</span>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-slate-700 mb-1.5" style={{ fontSize: 14, fontWeight: 500 }}>{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
      {error && <p className="text-red-500 mt-1" style={{ fontSize: 12 }}>{error}</p>}
    </div>
  );
}

function ic(hasError: boolean) {
  return `w-full px-3.5 py-2.5 rounded-xl border outline-none transition-all ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'}`;
}
