import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Check, ExternalLink, FileImage, Loader2, Medal, Pencil, Plus, RefreshCw, Search, Trash2, Trophy, X } from 'lucide-react';
import { useCoursesStore, useLessonsStore, useModulesStore } from '../../store';
import { examManagementService } from '../../services/api/examManagement.api';
import { resolveErrorMessage } from '../../lib/errors';
import { getImageUrl } from '../../utils/helpers';
import { Loader } from '../../components/feedback/Loader';
import { EmptyState } from '../../components/feedback/EmptyState';
import type { AdminExam, ExamLeaderboard, ExamPayload, ExamQuestion, ExamStats, ExamType, RankingCriteria } from '../../types/exam.types';
import { toast } from 'react-hot-toast';

type DraftQuestion = Omit<ExamQuestion, 'id'> & { id?: number; correctIndex: number };
type ExamForm = {
  examType: ExamType;
  courseId: string;
  lessonId: string;
  title: string;
  description: string;
  passingScore: string;
  maxAttempts: string;
  timeLimit: string;
  rankingCriteria: RankingCriteria;
  startTime: string;
  endTime: string;
  asAssignment: boolean;
};

const newQuestion = (): DraftQuestion => ({
  text: '', type: 'MULTIPLE_CHOICE', points: 1, imageUrl: '',
  options: ['', '', '', ''].map((text, index) => ({ text, isCorrect: index === 0 })), correctIndex: 0,
});

const emptyForm = (): ExamForm => ({
  examType: 'LESSON_QUIZ', courseId: '', lessonId: '', title: '', description: '',
  passingScore: '50', maxAttempts: '1', timeLimit: '', rankingCriteria: 'BOTH',
  startTime: '', endTime: '', asAssignment: false,
});

const examTypeLabel: Record<ExamType, string> = {
  LESSON_QUIZ: 'اختبار درس', COURSE_QUIZ: 'اختبار نهائي للمقرر', CHALLENGE: 'تحدي', FINAL_EXAM: 'اختبار نهائي مدفوع',
};

function localDateValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function examStatus(exam: AdminExam) {
  const now = Date.now();
  if (exam.startTime && new Date(exam.startTime).getTime() > now) return 'قادم';
  if (exam.endTime && new Date(exam.endTime).getTime() < now) return 'منتهٍ';
  return exam.examType === 'CHALLENGE' ? 'جاري' : 'نشط';
}

export function ExamsDashboardPage({ scopedCourseId, scopedLessonId }: { scopedCourseId?: string; scopedLessonId?: string } = {}) {
  const { courses, fetchCourses } = useCoursesStore();
  const { lessons, fetchLessons } = useLessonsStore();
  const { modules, fetchModules } = useModulesStore();
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExamType | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminExam | null>(null);
  const [form, setForm] = useState<ExamForm>(emptyForm);
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [recentlySavedExamId, setRecentlySavedExamId] = useState<string | null>(null);
  const [assignmentLoaded, setAssignmentLoaded] = useState(true);
  const [uploadingQuestionIds, setUploadingQuestionIds] = useState<Set<string>>(() => new Set());
  const [insightExam, setInsightExam] = useState<AdminExam | null>(null);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<ExamLeaderboard | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState('');

  const reload = async () => {
    setError('');
    try { setExams(await examManagementService.getAll()); }
    catch (err) { setError(resolveErrorMessage(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void fetchCourses(); void fetchLessons(); void fetchModules(); void reload();
  }, [fetchCourses, fetchLessons, fetchModules]);

  const filteredLessons = useMemo(() => {
    if (!form.courseId) return [];
    const moduleIds = new Set(modules.filter((module) => String(module.courseId) === form.courseId).map((module) => String(module.id)));
    return lessons.filter((lesson) => moduleIds.has(String(lesson.courseId)));
  }, [form.courseId, lessons, modules]);

  const filteredExams = useMemo(() => exams.filter((exam) => {
    const searchMatch = !search || [exam.title, exam.courseTitle, exam.lessonTitle].some((value) => value?.toLowerCase().includes(search.toLowerCase()));
    return searchMatch && (!typeFilter || exam.examType === typeFilter) && (!scopedCourseId || String(exam.courseId) === String(scopedCourseId)) && (!scopedLessonId || String(exam.lessonId) === String(scopedLessonId));
  }), [exams, search, typeFilter, scopedCourseId, scopedLessonId]);

  const openCreate = () => {
    setEditing(null); setForm({ ...emptyForm(), courseId: scopedCourseId ?? '', lessonId: scopedLessonId ?? '' }); setQuestions([newQuestion()]); setAssignmentLoaded(true); setFormError(''); setFormOpen(true);
  };

  const openEdit = async (exam: AdminExam) => {
    setEditing(exam); setFormError(''); setQuestions([]); setQuestionsLoading(true);
    setAssignmentLoaded(exam.examType !== 'LESSON_QUIZ' || !exam.lessonId);
    setForm({
      examType: exam.examType, courseId: exam.courseId ?? '', lessonId: exam.lessonId ?? '',
      title: exam.title, description: exam.description ?? '',
      passingScore: String(exam.passingScore), maxAttempts: String(exam.maxAttempts),
      timeLimit: exam.timeLimit ? String(exam.timeLimit) : '', rankingCriteria: exam.rankingCriteria,
      startTime: localDateValue(exam.startTime), endTime: localDateValue(exam.endTime), asAssignment: false,
    });
    setFormOpen(true);
    try {
      const details = await examManagementService.getById(exam.id);
      setForm((current) => ({
        ...current,
        title: details.title, description: details.description ?? '',
        passingScore: String(details.passingScore), maxAttempts: String(details.maxAttempts),
        timeLimit: details.timeLimit ? String(details.timeLimit) : '', rankingCriteria: details.rankingCriteria,
        startTime: localDateValue(details.startTime), endTime: localDateValue(details.endTime),
      }));
      setQuestions(details.questions.map((question) => {
        const correctIndex = Math.max(0, question.options.findIndex((option) => option.isCorrect));
        return {
          ...question,
          imageUrl: question.imageUrl || '',
          correctIndex,
        };
      }));
    } catch (err) {
      setFormError(resolveErrorMessage(err));
    } finally { setQuestionsLoading(false); }
    if (exam.examType === 'LESSON_QUIZ' && exam.lessonId) {
      void examManagementService.getLessonAssignment(exam.lessonId)
        .then((asAssignment) => { setForm((current) => ({ ...current, asAssignment })); setAssignmentLoaded(true); })
        .catch(() => setFormError('تعذر قراءة حالة التكليف الحالية؛ لن أغيرها دون اختيارك.'));
    }
  };

  const openInsights = async (exam: AdminExam) => {
    setInsightExam(exam); setInsightLoading(true); setInsightError(''); setStats(null); setLeaderboard(null);
    const [statsResult, leaderboardResult] = await Promise.allSettled([
      examManagementService.getStats(exam.id), examManagementService.getLeaderboard(exam.id),
    ]);
    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    if (leaderboardResult.status === 'fulfilled') setLeaderboard(leaderboardResult.value);
    if (statsResult.status === 'rejected' && leaderboardResult.status === 'rejected') setInsightError(resolveErrorMessage(statsResult.reason));
    setInsightLoading(false);
  };

  const setExamType = (examType: ExamType) => setForm((current) => ({
    ...current, examType, lessonId: examType === 'LESSON_QUIZ' ? current.lessonId : '',
    asAssignment: examType === 'LESSON_QUIZ' ? current.asAssignment : false,
  }));

  const validate = () => {
    if (!form.title.trim()) return 'عنوان الاختبار مطلوب.';
    if (!form.courseId) return 'اختر المقرر المرتبط بالاختبار.';
    if (form.examType === 'LESSON_QUIZ' && !form.lessonId && !scopedLessonId) return 'اختر الدرس المرتبط بالاختبار.';
    if (editing && form.examType === 'LESSON_QUIZ' && !assignmentLoaded) return 'انتظر حتى يتم تحميل حالة التكليف الحالية قبل الحفظ.';
    if (form.examType === 'CHALLENGE') {
      if (!form.startTime || !form.endTime) return 'التحدي يتطلب وقت بداية ونهاية.';
      if (new Date(form.startTime).getTime() >= new Date(form.endTime).getTime()) return 'وقت النهاية يجب أن يكون بعد وقت البداية.';
    }
    if (!Number.isInteger(Number(form.passingScore)) || Number(form.passingScore) < 0 || Number(form.passingScore) > 100) return 'درجة النجاح يجب أن تكون عدداً صحيحاً بين 0 و100.';
    if (!Number.isInteger(Number(form.maxAttempts)) || Number(form.maxAttempts) < 1) return 'عدد المحاولات يجب أن يكون عدداً صحيحاً لا يقل عن 1.';
    if (form.timeLimit && (!Number.isInteger(Number(form.timeLimit)) || Number(form.timeLimit) < 1)) return 'الوقت المحدد يجب أن يكون عدداً صحيحاً موجباً.';
    if (questions.some((q) => q.imageUrl?.startsWith('blob:'))) {
      return 'يرجى الانتظار حتى يكتمل رفع جميع صور الأسئلة قبل الحفظ.';
    }
    const invalidQuestionIndex = questions.findIndex((question) =>
      !question.text.trim()
      || !Number.isInteger(question.points)
      || question.points < 1
      || question.options.length < 2
      || question.options.some((option) => !option.text.trim())
      || question.correctIndex < 0
      || question.correctIndex >= question.options.length
    );
    if (invalidQuestionIndex !== -1) {
      return `راجع السؤال ${invalidQuestionIndex + 1}: أكمل نصه وخيارين على الأقل، وحدد الإجابة الصحيحة والنقاط.`;
    }
    if (!editing && questions.length === 0) return 'أضف سؤالاً واحداً على الأقل.';
    return '';
  };

  const handleQuestionImageUpload = async (file: File, qIndex: number, question: DraftQuestion) => {
    const uploadKey = String(question.id ?? `new-${qIndex}`);
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFormError('الصورة يجب أن تكون JPG أو JPEG أو PNG أو WEBP أو GIF وبحجم لا يتجاوز 5 ميجابايت.');
      return;
    }

    const localBlob = URL.createObjectURL(file);
    // Display image immediately so the user can see it right away
    setQuestions((current) => current.map((item, index) => index === qIndex ? { ...item, imageUrl: localBlob } : item));
    setUploadingQuestionIds((current) => new Set(current).add(uploadKey));
    setFormError('');

    try {
      const serverUrl = await examManagementService.uploadImage(file);
      setQuestions((current) => current.map((item, index) => index === qIndex ? { ...item, imageUrl: serverUrl } : item));
      toast.success('تم رفع وحفظ صورة السؤال بنجاح');
    } catch (err) {
      setFormError(resolveErrorMessage(err));
      toast.error(resolveErrorMessage(err));
      setQuestions((current) => current.map((item, index) => index === qIndex ? { ...item, imageUrl: question.imageUrl || '' } : item));
    } finally {
      URL.revokeObjectURL(localBlob);
      setUploadingQuestionIds((current) => {
        const next = new Set(current);
        next.delete(uploadKey);
        return next;
      });
    }
  };

  const handleRemoveQuestionImage = (qIndex: number) => {
    setQuestions((current) => current.map((item, index) => index === qIndex ? { ...item, imageUrl: '' } : item));
  };

  const saveExam = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }
    const payload: ExamPayload = {
      title: form.title.trim(), description: form.description.trim() || undefined,
      examType: form.examType, rankingCriteria: form.rankingCriteria,
      passingScore: Number(form.passingScore), maxAttempts: Number(form.maxAttempts),
      timeLimit: form.timeLimit ? Number(form.timeLimit) : null,
      ...(!editing && form.examType === 'LESSON_QUIZ' ? { lessonId: Number(form.lessonId), asAssignment: form.asAssignment } : {}),
      ...(!editing && form.examType !== 'LESSON_QUIZ' ? { courseId: Number(form.courseId) } : {}),
      ...(editing && assignmentLoaded && form.examType === 'LESSON_QUIZ' ? { asAssignment: form.asAssignment } : {}),
      ...(form.examType === 'CHALLENGE' ? {
        startTime: new Date(form.startTime).toISOString(), endTime: new Date(form.endTime).toISOString(),
      } : {}),
      ...(!editing ? { questions: questions.map(({ correctIndex, ...question }) => ({
        ...question,
        imageUrl: question.imageUrl || undefined,
        questionImageUrl: question.imageUrl || undefined,
        options: question.options.map((option, index) => ({ ...option, isCorrect: index === correctIndex })),
      })) } : {}),
    };

    setSaving(true); setFormError('');
    try {
      const savedExam = editing
        ? await examManagementService.update(editing.id, payload)
        : await examManagementService.create(payload);
      const questionPayload = (question: DraftQuestion): Omit<ExamQuestion, 'id'> & { questionImageUrl?: string } => ({
        text: question.text.trim(), type: question.type, points: question.points,
        imageUrl: question.imageUrl || undefined,
        questionImageUrl: question.imageUrl || undefined,
        // Persist only fields accepted by CreateOptionDto; loaded option IDs
        // and relation metadata must not be sent back as input fields.
        options: question.options.map((option, index) => ({ text: option.text.trim(), isCorrect: index === question.correctIndex })),
      });
      if (editing) {
        await Promise.all(questions.map((question) => question.id
          ? examManagementService.updateQuestion(question.id, questionPayload(question))
          : examManagementService.addQuestion(savedExam.id, questionPayload(question))));
      }
      const selectedCourse = courses.find((course) => String(course.id) === form.courseId);
      const selectedLesson = lessons.find((lesson) => String(lesson.id) === form.lessonId);
      const examForList: AdminExam = {
        ...savedExam,
        imageUrl: savedExam.imageUrl ?? editing?.imageUrl,
        courseId: savedExam.courseId ?? form.courseId,
        lessonId: savedExam.lessonId ?? (form.examType === 'LESSON_QUIZ' ? form.lessonId : null),
        courseTitle: savedExam.courseTitle ?? selectedCourse?.title,
        lessonTitle: savedExam.lessonTitle ?? selectedLesson?.title,
        totalQuestions: questions.length,
      };

      setExams((current) => editing
        ? current.map((exam) => exam.id === savedExam.id ? examForList : exam)
        : [examForList, ...current.filter((exam) => exam.id !== savedExam.id)]
      );
      setRecentlySavedExamId(savedExam.id);
      setSearch('');
      setTypeFilter('');
      setFormOpen(false);
      toast.success(editing ? 'تم تحديث الاختبار بنجاح' : 'تم إنشاء الاختبار بنجاح');
    } catch (err) { setFormError(resolveErrorMessage(err)); toast.error(resolveErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const deleteExam = async (exam: AdminExam) => {
    if (!window.confirm(`حذف «${exam.title}» نهائياً مع محاولات الطلاب؟`)) return;
    try { await examManagementService.delete(exam.id); await reload(); toast.success('تم حذف الاختبار'); }
    catch (err) { setError(resolveErrorMessage(err)); toast.error(resolveErrorMessage(err)); }
  };

  const removeQuestion = async (question: DraftQuestion, index: number) => {
    if (question.id != null) {
      if (!window.confirm('هل تريد حذف هذا السؤال نهائياً؟')) return;
      setDeletingQuestionId(question.id);
      try { await examManagementService.deleteQuestion(question.id); }
      catch (err) { setFormError(resolveErrorMessage(err)); return; }
      finally { setDeletingQuestionId(null); }
      if (editing) setExams((current) => current.map((exam) => exam.id === editing.id
        ? { ...exam, totalQuestions: Math.max(0, (exam.totalQuestions ?? questions.length) - 1) }
        : exam));
    }
    setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  if (loading && exams.length === 0) return <Loader fullPage />;

  return <div className="space-y-6 text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-extrabold">إدارة الاختبارات</h1><p className="mt-1 text-sm text-slate-500">اختبارات الدروس والاختبارات النهائية للمقررات والتحديات، مع الإحصاءات ولوحة الشرف.</p></div>
      <button onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700"><Plus size={18} /> إنشاء اختبار</button>
    </header>

    {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} />{error}<button className="mr-auto underline" onClick={() => void reload()}>إعادة المحاولة</button></div>}

    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
      <label className="relative flex-1"><Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالعنوان أو المقرر أو الدرس" className="w-full rounded-xl border border-slate-200 py-2.5 pl-3 pr-10 outline-none focus:border-emerald-500" /></label>
      <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ExamType | '')} className="rounded-xl border border-slate-200 px-3 py-2.5">
        <option value="">كل الأنواع</option><option value="LESSON_QUIZ">اختبار درس</option><option value="COURSE_QUIZ">اختبار نهائي للمقرر</option><option value="CHALLENGE">تحدي</option>
      </select>
    </div>

    {filteredExams.length === 0 ? <EmptyState icon={Trophy} title="لا توجد اختبارات" description={search || typeFilter ? 'غيّر البحث أو عامل التصفية.' : 'أنشئ اختبار درس أو مقرر أو تحدياً جديداً.'} action={!search && !typeFilter ? <button onClick={openCreate} className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white">إنشاء اختبار</button> : undefined} /> :
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-3">{filteredExams.map((exam) => <article key={exam.id} className={`min-w-0 w-full rounded-2xl border bg-white p-4 shadow-sm transition-all sm:p-5 ${recentlySavedExamId === exam.id ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          {exam.imageUrl ? <img src={getImageUrl(exam.imageUrl)} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover sm:h-14 sm:w-14" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-14 sm:w-14"><Trophy /></div>}
          <div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2"><h2 className="min-w-0 break-words font-bold [overflow-wrap:anywhere]">{exam.title}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{examTypeLabel[exam.examType]}</span></div>
            <p className="mt-1 truncate text-sm text-slate-500">{exam.courseTitle || 'مقرر'}{exam.lessonTitle ? ` · ${exam.lessonTitle}` : ''}</p>
          </div>
          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 sm:px-2.5">{examStatus(exam)}</span>
        </div>
        {exam.description && <p className="mt-4 line-clamp-2 text-sm text-slate-600">{exam.description}</p>}
        <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
          <span className="min-w-0 break-words">نجاح: <b>{exam.passingScore}%</b></span><span className="min-w-0 break-words">محاولات: <b>{exam.maxAttempts}</b></span><span className="min-w-0 break-words">أسئلة: <b>{exam.totalQuestions ?? '—'}</b></span><span className="min-w-0 break-words">طلاب: <b>{exam.participantsCount ?? 0}</b></span>
        </div>
        <div className="mt-4 flex min-w-0 flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button onClick={() => void openInsights(exam)} className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 sm:px-3 sm:text-sm"><BarChart3 size={16} className="shrink-0" />الإحصاءات والمتصدرون</button>
          <button onClick={() => void openEdit(exam)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-xs font-semibold sm:px-3 sm:text-sm"><Pencil size={15} className="shrink-0" />تعديل</button>
          <button onClick={() => void deleteExam(exam)} className="mr-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-red-50 px-2.5 text-xs font-semibold text-red-700 sm:px-3 sm:text-sm"><Trash2 size={15} className="shrink-0" />حذف</button>
        </div>
      </article>)}</div>
    }

    {formOpen && <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-5">
      <form onSubmit={saveExam} className="flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white sm:max-h-[96vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b p-4 sm:px-6"><div><h2 className="text-lg font-extrabold">{editing ? 'تعديل الاختبار' : 'إنشاء اختبار جديد'}</h2><p className="text-xs text-slate-500">بيانات الاختبار والأسئلة تُحفظ عبر واجهة الاختبارات.</p></div><button type="button" onClick={() => setFormOpen(false)} aria-label="إغلاق"><X /></button></div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {formError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <section className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">نوع الاختبار<select disabled={Boolean(editing || scopedLessonId)} value={form.examType} onChange={(event) => setExamType(event.target.value as ExamType)} className="mt-1.5 w-full rounded-xl border p-3 font-normal disabled:bg-slate-100"><option value="LESSON_QUIZ">اختبار درس</option><option value="COURSE_QUIZ">اختبار نهائي للمقرر</option><option value="CHALLENGE">تحدي</option><option value="FINAL_EXAM">اختبار نهائي مدفوع</option></select></label>
            {scopedCourseId ? (
              <label className="text-sm font-semibold">المقرر<div className="mt-1.5 rounded-xl border bg-slate-50 p-3 font-normal text-slate-700">{courses.find((course) => String(course.id) === String(scopedCourseId))?.title ?? 'المقرر الحالي'}</div></label>
            ) : (
              <label className="text-sm font-semibold">المقرر<select required disabled={Boolean(editing || scopedLessonId)} value={form.courseId} onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value, lessonId: '' }))} className="mt-1.5 w-full rounded-xl border p-3 font-normal disabled:bg-slate-100"><option value="">اختر المقرر</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            )}
            {form.examType === 'LESSON_QUIZ' && <label className="text-sm font-semibold">الدرس<select required disabled={Boolean(editing || scopedLessonId)} value={form.lessonId} onChange={(event) => setForm((current) => ({ ...current, lessonId: event.target.value }))} className="mt-1.5 w-full rounded-xl border p-3 font-normal disabled:bg-slate-100"><option value="">اختر الدرس</option>{filteredLessons.filter(lesson => !scopedLessonId || String(lesson.id) === String(scopedLessonId)).map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>}
            <label className="text-sm font-semibold">عنوان الاختبار<input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-1.5 w-full rounded-xl border p-3 font-normal" /></label>
            <label className="text-sm font-semibold sm:col-span-2">الوصف<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={2} className="mt-1.5 w-full rounded-xl border p-3 font-normal" /></label>
            <label className="text-sm font-semibold">معيار الترتيب<select value={form.rankingCriteria} onChange={(event) => setForm((current) => ({ ...current, rankingCriteria: event.target.value as RankingCriteria }))} className="mt-1.5 w-full rounded-xl border p-3 font-normal"><option value="BOTH">الدرجة ثم السرعة</option><option value="SCORE">الدرجة</option><option value="SPEED">السرعة</option></select></label>
            <label className="text-sm font-semibold">درجة النجاح (%)<input type="number" min={0} max={100} step={1} value={form.passingScore} onChange={(event) => setForm((current) => ({ ...current, passingScore: event.target.value }))} className="mt-1.5 w-full rounded-xl border p-3 font-normal" /></label>
            <label className="text-sm font-semibold">المحاولات المسموحة<input type="number" min={1} step={1} value={form.maxAttempts} onChange={(event) => setForm((current) => ({ ...current, maxAttempts: event.target.value }))} className="mt-1.5 w-full rounded-xl border p-3 font-normal" /></label>
            <label className="text-sm font-semibold">الوقت بالدقائق (اختياري)<input type="number" min={1} step={1} value={form.timeLimit} onChange={(event) => setForm((current) => ({ ...current, timeLimit: event.target.value }))} className="mt-1.5 w-full rounded-xl border p-3 font-normal" placeholder="بلا حد زمني" /></label>
            {form.examType === 'CHALLENGE' && <><label className="text-sm font-semibold">بداية التحدي<input type="datetime-local" required value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className="mt-1.5 w-full rounded-xl border p-3 font-normal" /></label><label className="text-sm font-semibold">نهاية التحدي<input type="datetime-local" required value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className="mt-1.5 w-full rounded-xl border p-3 font-normal" /></label></>}
            {form.examType === 'LESSON_QUIZ' && <label className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 sm:col-span-2"><input type="checkbox" checked={form.asAssignment} onChange={(event) => setForm((current) => ({ ...current, asAssignment: event.target.checked }))} className="h-4 w-4 accent-emerald-600"/>تعيين كتكليف تلقائي للدرس</label>}
          </section>

          <section className="space-y-4 border-t pt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">الأسئلة</h3>
              <span className="text-xs font-semibold text-slate-500">
                إجمالي الأسئلة: {questions.length}
              </span>
            </div>
            {questionsLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin text-emerald-600" />
                <span>جارٍ تحميل الأسئلة مع الصور…</span>
              </div>
            ) : questions.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">لا توجد أسئلة. أضف سؤالاً للبدء.</p>
            ) : (
              questions.map((question, qIndex) => {
                const uploadKey = String(question.id ?? `new-${qIndex}`);
                const isUploadingThis = uploadingQuestionIds.has(uploadKey);

                return (
                  <div key={question.id ?? `new-${qIndex}`} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    {/* Header: Question Number & Actions */}
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-800">
                          {qIndex + 1}
                        </span>
                        <b className="text-sm">السؤال {qIndex + 1}</b>
                      </div>
                      <div className="flex items-center gap-2">
                        {!question.imageUrl && (
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100">
                            <FileImage size={14} />
                            {isUploadingThis ? 'جارٍ الرفع…' : 'إرفاق صورة للسؤال'}
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                              disabled={isUploadingThis}
                              onChange={(e) => {
                                const file = e.currentTarget.files?.[0];
                                if (file) void handleQuestionImageUpload(file, qIndex, question);
                                e.currentTarget.value = '';
                              }}
                              className="sr-only"
                            />
                          </label>
                        )}
                        <button
                          type="button"
                          disabled={question.id != null && deletingQuestionId === question.id}
                          onClick={() => void removeQuestion(question, qIndex)}
                          className="text-red-500 hover:text-red-700 disabled:opacity-40"
                          title="حذف السؤال"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Question Image Preview Card (when imageUrl exists) */}
                    {question.imageUrl && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:h-28 sm:w-44">
                              <img
                                src={getImageUrl(question.imageUrl)}
                                alt={`صورة السؤال ${qIndex + 1}`}
                                referrerPolicy="no-referrer"
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.onerror = null;
                                  target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" fill="%23f8fafc"%3E%3Crect width="300" height="200" fill="%23f8fafc"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8"%3E%D8%AA%D8%B9%D8%B0%D8%B1+%D8%AA%D8%AD%D9%85%D9%8A%D9%84+%D8%A7%D9%84%D8%B5%D9%88%D8%B1%D8%A9%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            </div>
                            <div className="min-w-0 space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                <Check size={14} className="text-emerald-600 shrink-0" />
                                <span>صورة السؤال مرفقة ومعروضة</span>
                              </div>
                              <p className="max-w-xs truncate text-[11px] text-slate-500 font-mono dir-ltr text-left" title={question.imageUrl}>
                                {question.imageUrl}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <a
                                  href={getImageUrl(question.imageUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                                >
                                  <ExternalLink size={12} /> فتح الرابط بالحجم الكامل
                                </a>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 sm:self-center">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                              <RefreshCw size={13} className={isUploadingThis ? 'animate-spin' : ''} />
                              {isUploadingThis ? 'جارٍ الرفع…' : 'تغيير الصورة'}
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                disabled={isUploadingThis}
                                onChange={(e) => {
                                  const file = e.currentTarget.files?.[0];
                                  if (file) void handleQuestionImageUpload(file, qIndex, question);
                                  e.currentTarget.value = '';
                                }}
                                className="sr-only"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionImage(qIndex)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 size={13} /> إزالة الصورة
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Question Controls (Type & Points) */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold">نوع السؤال
                        <select
                          value={question.type}
                          onChange={(event) => setQuestions((current) => current.map((item, index) => index === qIndex ? {
                            ...item,
                            type: event.target.value as DraftQuestion['type'],
                            options: event.target.value === 'TRUE_FALSE'
                              ? [{ text: 'صح', isCorrect: true }, { text: 'خطأ', isCorrect: false }]
                              : ['', '', '', ''].map((text, optionIndex) => ({ text, isCorrect: optionIndex === 0 })),
                            correctIndex: 0,
                          } : item))}
                          className="mt-1 block w-full rounded-lg border p-2"
                        >
                          <option value="MULTIPLE_CHOICE">اختيار متعدد</option>
                          <option value="TRUE_FALSE">صح / خطأ</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold">النقاط
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={question.points}
                          onChange={(event) => setQuestions((current) => current.map((item, index) => index === qIndex ? { ...item, points: Number(event.target.value) } : item))}
                          className="mt-1 block w-full rounded-lg border p-2"
                        />
                      </label>
                    </div>

                    {/* Question Text */}
                    <label className="block text-xs font-semibold">
                      نص السؤال
                      <textarea
                        value={question.text}
                        onChange={(event) => setQuestions((current) => current.map((item, index) => index === qIndex ? { ...item, text: event.target.value } : item))}
                        placeholder="اكتب نص السؤال هنا..."
                        rows={3}
                        className="mt-1 w-full resize-y rounded-lg border p-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </label>

                    {/* Options */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-600">خيارات الإجابة (حدد الخيار الصحيح):</span>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={question.correctIndex === optionIndex}
                            onChange={() => setQuestions((current) => current.map((item, index) => index === qIndex ? {
                              ...item,
                              correctIndex: optionIndex,
                              options: item.options.map((entry, i) => ({ ...entry, isCorrect: i === optionIndex })),
                            } : item))}
                            className="accent-emerald-600"
                          />
                          <input
                            disabled={question.type === 'TRUE_FALSE'}
                            value={option.text}
                            onChange={(event) => setQuestions((current) => current.map((item, index) => index === qIndex ? {
                              ...item,
                              options: item.options.map((entry, i) => i === optionIndex ? { ...entry, text: event.target.value } : entry),
                            } : item))}
                            placeholder={`الخيار ${optionIndex + 1}`}
                            className="flex-1 rounded-lg border p-2 text-sm disabled:bg-slate-50"
                          />
                          {question.type === 'MULTIPLE_CHOICE' && question.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setQuestions((current) => current.map((item, index) => {
                                if (index !== qIndex) return item;
                                const options = item.options.filter((_, i) => i !== optionIndex);
                                const correctIndex = item.correctIndex === optionIndex ? 0 : item.correctIndex > optionIndex ? item.correctIndex - 1 : item.correctIndex;
                                return { ...item, options, correctIndex };
                              }))}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <X size={16}/>
                            </button>
                          )}
                        </div>
                      ))}
                      {question.type === 'MULTIPLE_CHOICE' && (
                        <button
                          type="button"
                          onClick={() => setQuestions((current) => current.map((item, index) => index === qIndex ? { ...item, options: [...item.options, { text: '', isCorrect: false }] } : item))}
                          className="text-sm font-semibold text-emerald-700 hover:underline"
                        >
                          + إضافة خيار
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {!questionsLoading && (
              <button
                type="button"
                onClick={() => setQuestions((current) => [...current, newQuestion()])}
                className="w-full rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <Plus size={15} className="ml-1 inline"/> أضف سؤالاً
              </button>
            )}
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t bg-slate-50 p-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border bg-white px-4 py-2.5 font-semibold">إلغاء</button><button disabled={saving || uploadingQuestionIds.size > 0 || questionsLoading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white disabled:opacity-60">{saving && <Loader2 size={16} className="animate-spin"/>}{editing ? 'حفظ التغييرات' : 'إنشاء الاختبار'}</button></div>
      </form>
    </div>}

    {insightExam && <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-5"><section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"><header className="sticky top-0 flex items-center justify-between border-b bg-white p-4 sm:px-6"><div><h2 className="font-extrabold">{insightExam.title}</h2><p className="text-xs text-slate-500">الإحصاءات ولوحة المتصدرين</p></div><button onClick={() => setInsightExam(null)} aria-label="إغلاق"><X/></button></header><div className="space-y-6 p-4 sm:p-6">
      {insightLoading && <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600"/></div>}
      {insightError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{insightError}</p>}
      {!insightLoading && <>
        {stats && <><h3 className="font-bold">ملخص الأداء</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[['المشاركون', stats.overview.totalParticipants], ['المكتمل', stats.overview.completed], ['غير المكتمل', stats.overview.notCompleted], ['متوسط الدرجة', stats.overview.averageScore], ['الناجحون', stats.overview.gradeDistribution.excellent + stats.overview.gradeDistribution.veryGood + stats.overview.gradeDistribution.good + stats.overview.gradeDistribution.acceptable]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p></div>)}</div><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[550px] text-right text-sm"><thead className="bg-slate-50"><tr><th className="p-3">السؤال</th><th className="p-3">المجاب عنه</th><th className="p-3">صحيح</th><th className="p-3">خطأ</th><th className="p-3">نسبة الصحة</th></tr></thead><tbody>{stats.questions.map((item) => <tr key={item.questionId} className="border-t"><td className="max-w-md p-3">{item.text}</td><td className="p-3">{item.totalAnswered}</td><td className="p-3">{item.correctCount}</td><td className="p-3">{item.wrongCount}</td><td className="p-3">{item.correctPercentage}%</td></tr>)}</tbody></table></div></>}
        {leaderboard && <><h3 className="flex items-center gap-2 font-bold"><Medal size={18} className="text-amber-500"/>لوحة الشرف <span className="text-xs font-normal text-slate-500">({leaderboard.participantsCount} مشارك)</span></h3><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[500px] text-right text-sm"><thead className="bg-slate-50"><tr><th className="p-3">الترتيب</th><th className="p-3">الطالب</th><th className="p-3">الدرجة</th><th className="p-3">الوقت</th><th className="p-3">تاريخ الإكمال</th></tr></thead><tbody>{leaderboard.leaderboard.map((item, index) => <tr key={item.studentId} className="border-t"><td className="p-3">{item.rank ?? (leaderboard.isEnded ? index + 1 : '—')}</td><td className="p-3">{item.name}</td><td className="p-3">{item.score ?? '—'}</td><td className="p-3">{item.timeTakenMs == null ? '—' : `${Math.round(item.timeTakenMs / 1000)} ث`}</td><td className="p-3">{(item.completedAt || item.participatedAt) ? new Date(item.completedAt || item.participatedAt!).toLocaleString() : '—'}</td></tr>)}</tbody></table>{leaderboard.leaderboard.length === 0 && <p className="p-5 text-center text-sm text-slate-500">لا توجد مشاركات حتى الآن.</p>}</div></>}
      </>}
    </div></section></div>}
  </div>;
}
