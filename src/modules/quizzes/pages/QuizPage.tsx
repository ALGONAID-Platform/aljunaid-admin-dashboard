import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, ClipboardList, X, Loader2, CheckCircle, AlertCircle, Trash2, 
  ChevronUp, ChevronDown, GripVertical, Search, Filter, HelpCircle, 
  Settings2, FileEdit
} from 'lucide-react';
import { useCoursesStore, useLessonsStore, useQuizzesStore, useModulesStore } from '../../../store';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Loader } from '../../../components/feedback/Loader';
import { QuestionImageUpload } from '../components/QuestionImageUpload';
import type { BackendModule } from '../../../types/api';
import type { Question, QuestionType } from '../../../types';

const Q_TYPE_LABELS: Record<string, string> = { mcq: 'اختيار متعدد', truefalse: 'صح / خطأ', short: 'إجابة قصيرة' };

function newQuestion(type: 'mcq' | 'truefalse' | 'short' = 'mcq'): Question {
  return {
    id: Date.now().toString() + Math.random(),
    type,
    text: '',
    options: type === 'mcq' ? ['', '', '', ''] : type === 'truefalse' ? ['صح', 'خطأ'] : [],
    correctAnswer: type === 'truefalse' ? 'صح' : '',
  };
}

type SaveStatus = 'idle' | 'loading' | 'success' | 'error';

export function QuizPage() {
  const { courses, fetchCourses } = useCoursesStore();
  const { lessons, fetchLessons } = useLessonsStore();
  const { quizzes, addQuiz, fetchQuizzes, error, isLoading } = useQuizzesStore();
  const { modules, fetchModules } = useModulesStore();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void fetchCourses();
    void fetchLessons();
    void fetchQuizzes();
    void fetchModules();
  }, [fetchCourses, fetchLessons, fetchQuizzes, fetchModules]);
  
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
  
  const closeModal = () => {
    const isDirty = title || description || courseId || lessonId;
    if (isDirty && saveStatus !== 'success' && !confirm('لديك تغييرات غير محفوظة. هل أنت متأكد من الإلغاء؟')) return;
    setShowModal(false); 
    resetModal(); 
  };

  const getCourseIdForLesson = (targetLessonId: string) => {
    const targetLesson = lessons.find(l => l.id === targetLessonId);
    const parentModule = modules.find(m => String(m.id) === targetLesson?.courseId);
    return parentModule ? String(parentModule.courseId) : '';
  };

  const openEditModal = (quiz: any) => {
    setEditingQuizId(quiz.id);
    setStep('info');
    setCourseId(quiz.courseId || getCourseIdForLesson(quiz.lessonId));
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

  const examByLessonId = useMemo(() => {
    return new Map(quizzes.map(quiz => [quiz.lessonId, quiz]));
  }, [quizzes]);

  const availableLessons = useMemo(() => {
    if (!courseId) return lessons;
    const moduleIds = new Set(
      modules
        .filter(module => String(module.courseId) === courseId)
        .map(module => String(module.id))
    );
    return lessons.filter(lesson => moduleIds.has(String(lesson.courseId)));
  }, [courseId, lessons, modules]);

  const validateInfo = (): boolean => {
    const e: Record<string, string> = {};
    if (!courseId) e.courseId = 'يرجى اختيار المقرر';
    if (!lessonId) e.lessonId = 'يرجى تحديد الدرس المرتبط بهذا الاختبار';
    if (lessonId) {
      const existingQuiz = examByLessonId.get(lessonId);
      if (existingQuiz && existingQuiz.id !== editingQuizId) {
        e.lessonId = 'Exam already created for this lesson. Use Edit Exam mode.';
      }
    }
    if (!title.trim()) e.title = 'عنوان الاختبار مطلوب';
    else if (title.trim().length < 3) e.title = 'يجب أن يكون العنوان 3 أحرف على الأقل';
    if (!description.trim()) e.description = 'وصف الاختبار مطلوب';
    if (!instructions.trim()) e.instructions = 'تعليمات الاختبار مطلوبة لإرشاد الطلاب';
    if (!passingScore || isNaN(Number(passingScore)) || Number(passingScore) < 1 || Number(passingScore) > 100) e.passingScore = 'درجة النجاح يجب أن تكون بين 1 و 100';
    if (!timeLimit || isNaN(Number(timeLimit)) || Number(timeLimit) < 1) e.timeLimit = 'الوقت يجب أن يكون أكبر من صفر (بالدقائق)';
    setInfoErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateQuestions = (): boolean => {
    const e: Record<string, string> = {};
    questions.forEach((q, i) => {
      if (!q.text.trim() && !q.imageUrl) e[`q_${i}_text`] = 'أضف نص السؤال أو صورة توضيحية واحدة على الأقل';
      if (q.type === 'mcq') {
        if (q.options.some(o => !o.trim())) e[`q_${i}_opts`] = 'يجب تعبئة جميع خيارات الإجابة';
        if (!q.correctAnswer) e[`q_${i}_ans`] = 'يرجى تحديد الإجابة الصحيحة';
      }
      if (q.type === 'short' && (!q.correctAnswer || !q.correctAnswer.trim())) e[`q_${i}_ans`] = 'يرجى كتابة الإجابة النموذجية';
    });
    setQErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validateQuestions()) return;
    const existingQuiz = examByLessonId.get(lessonId);
    if (!editingQuizId && existingQuiz) {
      openEditModal(existingQuiz);
      setQErrors(prev => ({ ...prev, submit: 'Exam already created for this lesson. Redirected to Edit Exam mode.' }));
      return;
    }
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
          setQErrors(prev => ({ ...prev, submit: 'تنبيه: هذا الدرس يحتوي على اختبار بالفعل. تم تحويلك لوضع التعديل للاختبار الحالي.' }));
          return;
        }
      }
      setQErrors(prev => ({ ...prev, submit: 'فشل حفظ الاختبار. يرجى مراجعة اتصالك بالشبكة والمحاولة مرة أخرى.' }));
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

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (q.courseName && q.courseName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (q.lessonTitle && q.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const lessonExamRows = lessons
    .map(lesson => {
      const quiz = examByLessonId.get(lesson.id);
      return {
        lesson,
        quiz,
        questionsCount: quiz?.questions.length ?? 0,
        lastUpdated: quiz?.createdAt ?? lesson.createdAt,
      };
    })
    .filter(row => {
      const query = searchQuery.toLowerCase();
      if (!query) return true;
      return row.lesson.title.toLowerCase().includes(query)
        || row.lesson.courseName.toLowerCase().includes(query)
        || Boolean(row.quiz?.title.toLowerCase().includes(query));
    });

  if (isLoading && quizzes.length === 0) return <Loader fullPage />;

  return (
    <div className="font-sans antialiased text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1">
            إدارة الاختبارات والتقييم
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            نظرة شاملة على {quizzes.length} اختبار مسجّل. قم بإنشاء وتقييم وتحديث الأسئلة لطلابك.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اختبار أو مقرر..."
              className="w-full sm:w-64 pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
          
          <button
            onClick={openModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            إنشاء اختبار جديد
          </button>
        </div>
      </div>

      {lessons.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-700">Lesson Exam Dashboard</h3>
            <span className="text-xs text-slate-400">{lessonExamRows.length} lessons</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Lesson</th>
                  <th className="px-5 py-3 font-bold">Exam Status</th>
                  <th className="px-5 py-3 font-bold">Questions Count</th>
                  <th className="px-5 py-3 font-bold">Last Updated</th>
                  <th className="px-5 py-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lessonExamRows.slice(0, 8).map(row => (
                  <tr key={row.lesson.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-800">{row.lesson.title}</div>
                      <div className="text-xs text-slate-400">{row.lesson.courseName}</div>
                    </td>
                    <td className="px-5 py-3">
                      {row.quiz ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                          <CheckCircle className="w-3.5 h-3.5" /> Exam Created
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-100">
                          <AlertCircle className="w-3.5 h-3.5" /> Missing Exam
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-700">{row.questionsCount}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{new Date(row.lastUpdated).toLocaleDateString('en-GB')}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-center">
                        {row.quiz ? (
                          <button onClick={() => openEditModal(row.quiz)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors">
                            Edit Exam
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              resetModal();
                              setCourseId(getCourseIdForLesson(row.lesson.id));
                              setLessonId(row.lesson.id);
                              setShowModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
                          >
                            Create Exam
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && quizzes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-red-100 p-12 text-center shadow-xl shadow-red-500/5 flex flex-col items-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-inner">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">فشل تحميل بيانات الاختبارات</h3>
          <p className="text-slate-500 mb-8 max-w-md">{error}</p>
          <button onClick={() => void fetchQuizzes()} className="px-8 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold shadow-md shadow-red-500/20">
            إعادة المحاولة
          </button>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
          <EmptyState 
            icon={ClipboardList} 
            title="لا توجد اختبارات مسجلة بعد" 
            description="ابدأ بإعداد أول اختبار تفاعلي لتقييم فهم الطلاب للدروس المعروضة."
            action={
              <button onClick={openModal} className="px-6 py-3 mt-2 text-white rounded-xl transition-all shadow-md hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 700 }}>
                إعداد أول اختبار
              </button>
            }
          />
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
          <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-400">لم يتم العثور على اختبارات تطابق بحثك "{searchQuery}"</p>
          <button onClick={() => setSearchQuery('')} className="mt-4 text-emerald-600 hover:text-emerald-700 font-semibold text-sm underline underline-offset-4">مسح عوامل التصفية</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredQuizzes.map(quiz => {
            const isDraft = String(quiz.id).startsWith('draft-');
            return (
              <div key={quiz.id} className="bg-white rounded-[20px] border border-slate-100 p-6 flex flex-col h-full hover:shadow-lg transition-all duration-300 group hover:-translate-y-1 relative">
                {isDraft && (
                  <div className="absolute top-4 left-4 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                    <AlertCircle className="w-3 h-3" /> مسودة (غير منشورة)
                  </div>
                )}
                <div className="flex items-start justify-between gap-4 mb-4 pr-12">
                  <div className="flex-1">
                    <h3 className="text-slate-800 font-bold text-lg mb-1 leading-tight group-hover:text-emerald-600 transition-colors">{quiz.title}</h3>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded w-max border border-slate-100">
                        {quiz.courseName || 'مقرر غير محدد'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        الدرس: {quiz.lessonTitle || 'درس غير محدد'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 bg-slate-50 p-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100">
                    <button onClick={() => openEditModal(quiz)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm" title="تعديل الاختبار">
                      <FileEdit className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if(confirm('تنبيه خطير: هل أنت متأكد تماماً من رغبتك في حذف هذا الاختبار بشكل نهائي؟')) useQuizzesStore.getState().deleteQuiz(quiz.id); }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm" title="حذف الاختبار">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-slate-500 text-sm mb-6 flex-1 line-clamp-2 leading-relaxed">
                  {quiz.description}
                </p>
                
                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                  <InfoPill label={`${quiz.questions.length} أسئلة`} color="#2563EB" bg="#EFF6FF" icon={<HelpCircle className="w-3.5 h-3.5" />} />
                  <InfoPill label={`نسبة ${quiz.passingScore}%`} color="#059669" bg="#ECFDF5" icon={<CheckCircle className="w-3.5 h-3.5" />} />
                  <InfoPill label={`${quiz.timeLimit} دقيقة`} color="#7C3AED" bg="#F5F3FF" icon={<Loader2 className="w-3.5 h-3.5" />} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ultra-Modern Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-white rounded-t-[2rem]">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm">
                  <ClipboardList className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {editingQuizId ? 'تحديث وتعديل الاختبار' : 'إعداد اختبار جديد'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <StepDot active={step === 'info'} done={step === 'questions'} label="1. إعدادات الاختبار" onClick={() => setStep('info')} />
                    <div className="w-10 h-0.5 bg-slate-100 rounded-full" />
                    <StepDot active={step === 'questions'} done={false} label="2. بنك الأسئلة" onClick={() => { if(validateInfo()) setStep('questions'); }} />
                  </div>
                </div>
              </div>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 rounded-xl transition-all border border-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
              {step === 'info' ? (
                <div className="p-8 max-w-3xl mx-auto space-y-6">
                  
                  {/* Info Panel: Links */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5 relative">
                    <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-emerald-600 shadow-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      الارتباط التعليمي
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                      <Field label="المقرر" required error={infoErrors.courseId}>
                        <div className="relative">
                          <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                          <select value={courseId} onChange={e => { setCourseId(e.target.value); setLessonId(''); setInfoErrors(p => { const x = { ...p }; delete x.courseId; return x; }); }} className={`${inputCls(!!infoErrors.courseId)} pr-11`}>
                            <option value="" disabled>الرجاء اختيار المقرر...</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </Field>
                      
                      <Field label="الدرس المستهدف" required error={infoErrors.lessonId}>
                        <div className="relative">
                          <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                          <select value={lessonId} onChange={e => { setLessonId(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.lessonId; return x; }); }} className={`${inputCls(!!infoErrors.lessonId)} pr-11`} disabled={!courseId}>
                            <option value="" disabled>{courseId ? 'الرجاء اختيار الدرس...' : 'اختر المقرر أولاً'}</option>
                            {availableLessons.map(l => {
                              const existingQuiz = examByLessonId.get(l.id);
                              const locked = Boolean(existingQuiz && existingQuiz.id !== editingQuizId);
                              return (
                                <option key={l.id} value={l.id} disabled={locked}>
                                  {l.title}{locked ? ' - Exam Already Created' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* Info Panel: Details */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5 relative">
                    <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
                      المحتوى الوصفي
                    </div>
                    <div className="pt-2 space-y-5">
                      <Field label="عنوان الاختبار" required error={infoErrors.title}>
                        <input value={title} onChange={e => { setTitle(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.title; return x; }); }} placeholder="مثال: الاختبار النصفي لوحدة التفاضل والتكامل" className={inputCls(!!infoErrors.title, 'font-bold')} />
                      </Field>
                      <Field label="وصف الاختبار" required error={infoErrors.description}>
                        <textarea value={description} onChange={e => { setDescription(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.description; return x; }); }} rows={2} placeholder="يغطي هذا الاختبار المفاهيم الأساسية المعروضة في الدرس..." className={`${inputCls(!!infoErrors.description)} resize-none text-sm leading-relaxed`} />
                      </Field>
                      <Field label="تعليمات وإرشادات للطلاب" required error={infoErrors.instructions}>
                        <textarea value={instructions} onChange={e => { setInstructions(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.instructions; return x; }); }} rows={2} placeholder="مثال: الرجاء التأكد من استقرار الاتصال بالإنترنت. لا يمكنك التراجع عن الإجابة بعد تأكيدها." className={`${inputCls(!!infoErrors.instructions)} resize-none text-sm leading-relaxed`} />
                      </Field>
                    </div>
                  </div>

                  {/* Info Panel: Settings */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5 relative">
                    <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500 shadow-sm flex items-center gap-1">
                      <Settings2 className="w-3.5 h-3.5" /> إعدادات التقييم
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                      <Field label="نسبة النجاح المطلوبة (%)" required error={infoErrors.passingScore}>
                        <input type="number" min={1} max={100} value={passingScore} onChange={e => { setPassingScore(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.passingScore; return x; }); }} className={inputCls(!!infoErrors.passingScore, 'text-center font-mono text-lg')} dir="ltr" />
                      </Field>
                      <Field label="الوقت المسموح (بالدقائق)" required error={infoErrors.timeLimit}>
                        <input type="number" min={1} value={timeLimit} onChange={e => { setTimeLimit(e.target.value); setInfoErrors(p => { const x = { ...p }; delete x.timeLimit; return x; }); }} className={inputCls(!!infoErrors.timeLimit, 'text-center font-mono text-lg')} dir="ltr" />
                      </Field>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-8 max-w-4xl mx-auto space-y-6">
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 shadow-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-bold">فشل عملية الحفظ. يرجى التأكد من تعبئة جميع الحقول بشكل صحيح.</span>
                    </div>
                  )}
                  {qErrors.submit && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl shadow-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-bold">{qErrors.submit}</span>
                    </div>
                  )}

                  {questions.map((q, idx) => (
                    <div key={q.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all group hover:border-emerald-200 hover:shadow-md">
                      {/* Question Header */}
                      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-5 h-5 text-slate-300 cursor-move" />
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-sm shadow-sm">
                            السؤال {idx + 1}
                          </span>
                        </div>
                        
                        <div className="flex gap-1.5 flex-wrap mx-auto sm:mr-auto sm:ml-0">
                          {(['mcq', 'truefalse', 'short'] as const).map(t => (
                            <button 
                              key={t} 
                              onClick={() => changeQuestionType(idx, t)} 
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${q.type === t ? 'bg-white border-emerald-500 text-emerald-600 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                              {Q_TYPE_LABELS[t]}
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl shadow-sm p-1">
                          <button onClick={() => moveQuestion(idx, 'up')} disabled={idx === 0} className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors" title="نقل لأعلى"><ChevronUp className="w-4 h-4" /></button>
                          <div className="w-px h-4 bg-slate-200"></div>
                          <button onClick={() => moveQuestion(idx, 'down')} disabled={idx === questions.length - 1} className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors" title="نقل لأسفل"><ChevronDown className="w-4 h-4" /></button>
                          <div className="w-px h-4 bg-slate-200"></div>
                          <button onClick={() => removeQuestion(idx)} disabled={questions.length === 1} className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors" title="حذف السؤال"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>

                      {/* Question Body */}
                      <div className="p-6 space-y-5">
                        <div className="relative">
                          {qErrors[`q_${idx}_text`] && <span className="absolute -top-3 right-2 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded shadow-sm z-10">{qErrors[`q_${idx}_text`]}</span>}
                          <textarea 
                            value={q.text} 
                            onChange={e => updateQuestion(idx, { text: e.target.value })} 
                            placeholder="اكتب نص السؤال بدقة ووضوح هنا..." 
                            rows={3} 
                            className={`w-full px-4 py-3.5 rounded-2xl border-2 outline-none resize-none transition-all text-sm leading-relaxed ${qErrors[`q_${idx}_text`] ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white focus:shadow-sm'}`} 
                          />
                        </div>
                        
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                          <QuestionImageUpload
                            imageUrl={q.imageUrl}
                            onImageUploaded={(url) => updateQuestion(idx, { imageUrl: url })}
                            onImageRemoved={() => updateQuestion(idx, { imageUrl: undefined })}
                          />
                        </div>

                        {/* Answers Section */}
                        <div className="pt-2 border-t border-slate-100">
                          {q.type === 'mcq' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-slate-700 font-bold text-sm flex items-center gap-2">
                                  <FileEdit className="w-4 h-4 text-emerald-500" />
                                  خيارات الإجابة المتعددة
                                </p>
                                <span className="text-xs font-semibold text-slate-400">حدد الإجابة الصحيحة عبر الزر الدائري</span>
                              </div>
                              {qErrors[`q_${idx}_opts`] && <p className="text-red-500 text-xs font-bold">{qErrors[`q_${idx}_opts`]}</p>}
                              {qErrors[`q_${idx}_ans`] && <p className="text-red-500 text-xs font-bold">{qErrors[`q_${idx}_ans`]}</p>}
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {q.options.map((opt, oi) => {
                                  const isCorrect = q.correctAnswer === opt && opt !== '';
                                  return (
                                    <label key={oi} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all cursor-text ${isCorrect ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
                                      <input 
                                        type="radio" 
                                        name={`q_${idx}_correct`} 
                                        checked={isCorrect} 
                                        onChange={() => opt.trim() && updateQuestion(idx, { correctAnswer: opt })} 
                                        className="w-5 h-5 accent-emerald-500 cursor-pointer ml-1" 
                                      />
                                      <input 
                                        value={opt} 
                                        onChange={e => { 
                                          const newOpts = [...q.options]; 
                                          newOpts[oi] = e.target.value; 
                                          const newCorrect = q.correctAnswer === q.options[oi] ? e.target.value : q.correctAnswer; 
                                          updateQuestion(idx, { options: newOpts, correctAnswer: newCorrect }); 
                                        }} 
                                        placeholder={`الخيار ${oi + 1}`} 
                                        className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700" 
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {q.type === 'truefalse' && (
                            <div className="space-y-4">
                              <p className="text-slate-700 font-bold text-sm flex items-center gap-2">
                                <FileEdit className="w-4 h-4 text-emerald-500" />
                                اختر الإجابة الصحيحة
                              </p>
                              <div className="flex gap-4">
                                {['صح', 'خطأ'].map(opt => (
                                  <label key={opt} className={`flex-1 flex justify-center items-center gap-3 py-3.5 rounded-xl border-2 cursor-pointer transition-all ${q.correctAnswer === opt ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
                                    <input type="radio" name={`q_${idx}_tf`} checked={q.correctAnswer === opt} onChange={() => updateQuestion(idx, { correctAnswer: opt })} className="w-5 h-5 accent-emerald-500" />
                                    <span className={`font-bold text-base ${q.correctAnswer === opt ? 'text-emerald-700' : 'text-slate-600'}`}>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {q.type === 'short' && (
                            <div className="space-y-4">
                              <p className="text-slate-700 font-bold text-sm flex items-center gap-2">
                                <FileEdit className="w-4 h-4 text-emerald-500" />
                                الإجابة النموذجية المعتمدة
                              </p>
                              {qErrors[`q_${idx}_ans`] && <p className="text-red-500 text-xs font-bold">{qErrors[`q_${idx}_ans`]}</p>}
                              <input 
                                value={q.correctAnswer} 
                                onChange={e => updateQuestion(idx, { correctAnswer: e.target.value })} 
                                placeholder="اكتب الإجابة القصيرة التي ستعتمد كإجابة صحيحة..." 
                                className={`w-full px-4 py-3.5 rounded-xl border-2 outline-none transition-all text-sm font-semibold ${qErrors[`q_${idx}_ans`] ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-slate-200 bg-white focus:border-emerald-400 focus:shadow-sm'}`} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button onClick={() => setQuestions(qs => [...qs, newQuestion('mcq')])} className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all flex items-center justify-center gap-3 font-bold text-base shadow-sm">
                    <Plus className="w-5 h-5" strokeWidth={3} /> أضف سؤالاً جديداً للتقييم
                  </button>
                  
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] flex items-center justify-between shrink-0">
              {step === 'info' ? (
                <>
                  <button onClick={closeModal} className="px-6 py-3 text-slate-600 font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-all focus:ring-2 focus:ring-slate-200">
                    إلغاء الأمر
                  </button>
                  <button onClick={() => { if (validateInfo()) setStep('questions'); }} className="px-8 py-3 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-bold flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    التالي: كتابة الأسئلة 
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-180"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setStep('info')} className="px-6 py-3 text-slate-700 font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    العودة للإعدادات
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={closeModal} className="px-6 py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all">إلغاء</button>
                    <button onClick={handleSave} disabled={saveStatus === 'loading' || saveStatus === 'success'} className="px-8 py-3 text-white rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                      {saveStatus === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                      {saveStatus === 'success' && <CheckCircle className="w-5 h-5 animate-bounce" />}
                      {saveStatus === 'loading' ? 'جاري الاعتماد...' : saveStatus === 'success' ? 'تم الحفظ والاعتماد!' : `حفظ وتوثيق الاختبار (${questions.length} سؤال)`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI Helpers ────────────────────────────────────────────────────────

function InfoPill({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-transparent shadow-sm" style={{ background: bg, color, borderColor: `${color}30`, fontWeight: 700 }}>
      {icon} {label}
    </span>
  );
}

function StepDot({ active, done, label, onClick }: { active: boolean; done: boolean; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all ${onClick ? 'hover:bg-slate-100 cursor-pointer' : 'cursor-default'}`}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-sm transition-all" style={active ? { background: '#10B981', color: 'white', boxShadow: '0 0 0 4px #ECFDF5' } : done ? { background: '#D1FAE5', color: '#059669' } : { background: '#F1F5F9', color: '#94A3B8' }}>
        {done ? '✓' : active ? '●' : '○'}
      </div>
      <span className="transition-colors" style={{ fontSize: 13, color: active ? '#059669' : done ? '#059669' : '#94A3B8', fontWeight: active || done ? 700 : 500 }}>{label}</span>
    </button>
  );
}

function Field({ label, required, error, children, helperText }: { label: string; required?: boolean; error?: string; children: React.ReactNode; helperText?: string }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
          {label} {required && <span className="text-red-500 text-lg leading-none mt-1">*</span>}
        </label>
        {error && <span className="text-[11px] font-bold text-red-500 animate-pulse bg-red-50 px-2 py-0.5 rounded-md">{error}</span>}
      </div>
      {children}
      {helperText && !error && <p className="text-xs text-slate-400 font-medium">{helperText}</p>}
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
