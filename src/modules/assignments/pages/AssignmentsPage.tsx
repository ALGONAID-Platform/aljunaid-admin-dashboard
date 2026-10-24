import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, ClipboardCheck, Save } from 'lucide-react';
import { api } from '../../../lib/api';
import { lessonService } from '../../../services/api/lessons.api';
import { modulesService } from '../../../services/api/modules.api';
import { courseService } from '../../../services/api/courses.api';

type Assignment = { id: number; lessonId: number; title: string; description?: string; type: 'TASK' | 'QUIZ'; maxScore: number; lesson?: any; _count?: { submissions: number } };
type Submission = { id: number; status: string; score?: number; content?: string; fileUrl?: string; submittedAt?: string; feedback?: string; feedbackImageUrl?: string; student?: any };
type ReviewRow = { assignment: Assignment; lessonTitle: string; courseTitle: string; courseId: string; submissions: Submission[] };
const resultOf = (d: any) => d?.data ?? d;
const errorOf = (e: any) => e?.response?.data?.message ?? e?.message ?? 'تعذر تحميل التسليمات.';

export function AssignmentsPage({ scopedCourseId, scopedLessonId }: { scopedCourseId?: string; scopedLessonId?: string } = {}) {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const [loadedLessonCount, setLoadedLessonCount] = useState(0);
  const [grades, setGrades] = useState<Record<number, {score: string; feedback: string; feedbackImageUrl: string; status: string}>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(''); setLoadWarning('');
    try {
      const [lessons, modules, courses] = await Promise.all([lessonService.getAll(), modulesService.getAll(), courseService.getAll()]);
      setLoadedLessonCount(lessons.length);
      const requestErrors: string[] = [];
      const relevantLessons = lessons.filter(lesson => !scopedLessonId || String(lesson.id) === String(scopedLessonId));
      const results = await Promise.all(relevantLessons.map(async lesson => {
        try {
          const response = await api.get(`/assignments/lesson/${lesson.id}`);
          const assignment = resultOf(response.data) as Assignment | null;
          if (!assignment) return null;
          let submissions: Submission[] = [];
          if (assignment.type !== 'QUIZ') {
            const { data } = await api.get(`/assignments/${assignment.id}/submissions`, { params: { page: 1, limit: 100, status: status || undefined } });
            const payload = resultOf(data);
            submissions = Array.isArray(payload) ? payload : payload?.data ?? [];
          }
          const module = modules.find(m => String(m.id) === String(lesson.courseId));
          const course = module && courses.find(c => String(c.id) === String(module.courseId));
          return { assignment, lessonTitle: lesson.title, courseTitle: course?.title ?? lesson.courseName, courseId: String(module?.courseId ?? ''), submissions } as ReviewRow;
        } catch (e) { requestErrors.push(`${lesson.title}: ${errorOf(e)}`); return null; }
      }));
      const finalRows = results.filter((row): row is ReviewRow => row !== null && (!scopedCourseId || row.courseId === String(scopedCourseId)));
      setRows(finalRows);
      if (requestErrors.length) setLoadWarning(`تعذر تحميل بعض الواجبات أو التسليمات (${requestErrors.length}). ${requestErrors[0]}`);
      setGrades(Object.fromEntries(finalRows.flatMap(row => row.submissions.map(sub => [sub.id, { score: String(sub.score ?? ''), feedback: sub.feedback ?? '', feedbackImageUrl: sub.feedbackImageUrl ?? '', status: sub.status === 'RESUBMISSION_REQUESTED' ? 'RESUBMISSION_REQUESTED' : 'GRADED' }]))));
    } catch (e) { setError(errorOf(e)); }
    finally { setLoading(false); }
  }, [status, scopedCourseId, scopedLessonId]);

  useEffect(() => { void load(); }, [load]);

  const gradeSubmission = async (submission: Submission, assignment: Assignment) => {
    const form = grades[submission.id];
    const score = Number(form?.score);
    if (!Number.isInteger(score) || score < 0 || score > assignment.maxScore) { setNotice(`أدخل درجة صحيحة بين 0 و ${assignment.maxScore}.`); return; }
    setSaving(submission.id); setNotice('');
    try {
      await api.post(`/assignments/submissions/${submission.id}/grade`, { score, feedback: form.feedback || undefined, feedbackImageUrl: form.feedbackImageUrl || undefined, status: form.status });
      setNotice('تم حفظ التقييم.'); await load();
    } catch (e) { setNotice(errorOf(e)); }
    finally { setSaving(null); }
  };

  const filtered = rows.filter(row => `${row.assignment.title} ${row.lessonTitle} ${row.courseTitle}`.toLowerCase().includes(query.toLowerCase()));
  const patchGrade = (id: number, patch: Partial<{score: string; feedback: string; feedbackImageUrl: string; status: string}>) => setGrades(current => ({...current, [id]: {...current[id], ...patch}}));

  return <section dir="rtl" className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-slate-900">مراجعة الواجبات والتسليمات</h2><p className="mt-1 text-sm text-slate-500">عرض ملفات الطلاب والروابط وتصحيح المهام العملية. الاختبارات القصيرة تبقى مصححة آلياً.</p></div><button onClick={()=>void load()} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold"><RefreshCw className="inline ml-2" size={16}/>تحديث</button></header>
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}
    <div className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث باسم الواجب أو الدرس" className="min-w-48 flex-1 rounded-lg border px-3 py-2 text-sm"/><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">كل الحالات</option><option value="SUBMITTED">مسلّم</option><option value="GRADED">مقيّم</option><option value="RESUBMISSION_REQUESTED">إعادة تسليم مطلوبة</option></select></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
    {loadWarning && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{loadWarning}</div>}
    {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل الواجبات والتسليمات…</div> : filtered.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">{loadedLessonCount === 0 ? 'لا توجد دروس منشورة متاحة لاستكشاف واجباتها. واجهة API الحالية لا تعرض المسودات.' : 'لم يُعثر على واجب أو تسليم مطابق ضمن الدروس المنشورة.'}</div> : <div className="space-y-5">{filtered.map(({assignment,lessonTitle,courseTitle,submissions})=><article key={assignment.id} className="overflow-hidden rounded-2xl border bg-white"><header className="flex flex-wrap items-center gap-2 border-b bg-slate-50 p-4"><ClipboardCheck className="text-emerald-600" size={19}/><h3 className="font-extrabold">{assignment.title}</h3><span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-800">{assignment.type}</span><span className="text-xs text-slate-500">{courseTitle} · {lessonTitle}</span><span className="mr-auto text-xs text-slate-500">الدرجة القصوى: {assignment.maxScore}</span></header>{assignment.type === 'QUIZ' ? <p className="p-4 text-sm text-slate-500">اختبار آلي · لا يتطلب تصحيحاً يدوياً. إجمالي التسليمات: {assignment._count?.submissions ?? 0}.</p> : submissions.length === 0 ? <p className="p-5 text-center text-sm text-slate-500">لا توجد تسليمات بهذه الحالة.</p> : <div className="divide-y">{submissions.map(sub=>{const student=sub.student?.user??sub.student;const form=grades[sub.id]??{score:'',feedback:'',feedbackImageUrl:'',status:'GRADED'};return <div key={sub.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_1fr]"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><strong>{student?.name??'طالب'}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{sub.status}</span><span className="text-xs text-slate-500">{sub.submittedAt?new Date(sub.submittedAt).toLocaleString('ar'):'—'}</span></div>{sub.content&&<p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{sub.content}</p>}{sub.fileUrl&&<a className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 underline" href={sub.fileUrl} target="_blank" rel="noreferrer">فتح الملف أو الرابط<ExternalLink size={14}/></a>}{sub.score!=null&&<p className="text-sm font-bold">الدرجة المحفوظة: {sub.score} / {assignment.maxScore}</p>}</div><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold">الدرجة<input type="number" min={0} max={assignment.maxScore} value={form.score} onChange={e=>patchGrade(sub.id,{score:e.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-bold">حالة المراجعة<select value={form.status} onChange={e=>patchGrade(sub.id,{status:e.target.value})} className="mt-1 w-full rounded-lg border p-2"><option value="GRADED">تم التقييم</option><option value="RESUBMISSION_REQUESTED">طلب إعادة التسليم</option></select></label><label className="text-xs font-bold sm:col-span-2">ملاحظات التصحيح<textarea rows={2} value={form.feedback} onChange={e=>patchGrade(sub.id,{feedback:e.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-bold sm:col-span-2">رابط صورة التصحيح<input type="url" value={form.feedbackImageUrl} onChange={e=>patchGrade(sub.id,{feedbackImageUrl:e.target.value})} className="mt-1 w-full rounded-lg border p-2" dir="ltr"/></label><button disabled={saving===sub.id} onClick={()=>void gradeSubmission(sub,assignment)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2"><Save className="inline ml-2" size={15}/>{saving===sub.id?'جارٍ الحفظ…':'حفظ التقييم'}</button></div></div>;})}</div>}</article>)}</div>}
  </section>;
}
