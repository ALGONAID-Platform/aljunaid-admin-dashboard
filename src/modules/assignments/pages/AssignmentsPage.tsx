import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ExternalLink, RefreshCw, ClipboardCheck, Save, Plus, X, Paperclip } from 'lucide-react';
import { api } from '../../../lib/api';
import { lessonService } from '../../../services/api/lessons.api';
import { modulesService } from '../../../services/api/modules.api';
import { courseService } from '../../../services/api/courses.api';

type Assignment = { id: number; lessonId: number; title: string; description?: string; type: 'TASK' | 'QUIZ'; maxScore: number; dueDate?: string | null; attachmentUrl?: string | null; lesson?: any; _count?: { submissions: number } };
type Submission = { id: number; status: string; score?: number; content?: string; fileUrl?: string; submittedAt?: string; feedback?: string; feedbackImageUrl?: string; student?: any };
type ReviewRow = { assignment: Assignment; lessonTitle: string; courseTitle: string; courseId: string; submissions: Submission[] };
const resultOf = (d: any) => d?.data ?? d;
const listOf = (value: any): any[] => {
  let body = value;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(body)) return body;
    if (!body || typeof body !== 'object') return [];
    body = body.items ?? body.results ?? body.submissions ?? body.data;
  }
  return [];
};
const submissionPage = (response: any) => {
  let body = response;
  let meta: any;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) break;
    meta ??= body.meta ?? body.pagination;
    if (Array.isArray(body.items) || Array.isArray(body.results) || Array.isArray(body.submissions)) break;
    body = body.data;
  }
  return { items: listOf(response), totalPages: Number(meta?.totalPages ?? meta?.lastPage ?? meta?.pages) || null };
};
async function getAllSubmissions(assignmentId: number, status?: string): Promise<Submission[]> {
  const items: Submission[] = [];
  const limit = 100;
  let page = 1;
  let totalPages: number | null = null;
  const seenPages = new Set<string>();
  do {
    const { data } = await api.get(`/assignments/${assignmentId}/submissions`, { params: { page, limit, status: status || undefined } });
    const result = submissionPage(data);
    items.push(...result.items);
    const signature = result.items.map(item => String(item.id)).join(',');
    if (page > 1 && signature && seenPages.has(signature)) break;
    if (signature) seenPages.add(signature);
    totalPages = result.totalPages ?? (result.items.length === limit ? page + 1 : page);
    page += 1;
  } while (page <= totalPages);
  return [...new Map(items.map(item => [String(item.id), item])).values()];
}
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
  const [lessonOptions, setLessonOptions] = useState<Array<{ id: string; title: string; courseTitle: string }>>([]);
  const [assignmentForm, setAssignmentForm] = useState({ lessonId: scopedLessonId ?? '', title: '', description: '', maxScore: '100', dueDate: '' });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [grades, setGrades] = useState<Record<number, {score: string; feedback: string; feedbackImageUrl: string; status: string}>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(''); setLoadWarning('');
    try {
      const [lessons, modules, courses] = await Promise.all([lessonService.getAll(), modulesService.getAll(), courseService.getAll()]);
      setLoadedLessonCount(lessons.length);
      const requestErrors: string[] = [];
      const relevantLessons = lessons.filter(lesson => !scopedLessonId || String(lesson.id) === String(scopedLessonId));
      const availableLessons = relevantLessons.flatMap(lesson => {
        const module = modules.find(item => String(item.id) === String(lesson.courseId));
        const courseId = String(module?.courseId ?? '');
        const course = courses.find(item => String(item.id) === courseId);
        if (scopedCourseId && courseId !== String(scopedCourseId)) return [];
        return [{ id: String(lesson.id), title: lesson.title, courseTitle: course?.title ?? lesson.courseName }];
      });
      const results = await Promise.all(relevantLessons.map(async lesson => {
        try {
          const response = await api.get(`/assignments/lesson/${lesson.id}`);
          const assignment = resultOf(response.data) as Assignment | null;
          if (!assignment) return null;
          let submissions: Submission[] = [];
          if (assignment.type !== 'QUIZ') {
            submissions = await getAllSubmissions(assignment.id, status);
          }
          const module = modules.find(m => String(m.id) === String(lesson.courseId));
          const course = module && courses.find(c => String(c.id) === String(module.courseId));
          return { assignment, lessonTitle: lesson.title, courseTitle: course?.title ?? lesson.courseName, courseId: String(module?.courseId ?? ''), submissions } as ReviewRow;
        } catch (e: any) {
          // A lesson without an assignment is expected and the API reports it as 404.
          if (e?.response?.status !== 404) requestErrors.push(`${lesson.title}: ${errorOf(e)}`);
          return null;
        }
      }));
      const finalRows = results.filter((row): row is ReviewRow => row !== null && (!scopedCourseId || row.courseId === String(scopedCourseId)));
      setRows(finalRows);
      const lessonsWithoutAssignment = availableLessons.filter(lesson => !finalRows.some(row => String(row.assignment.lessonId) === lesson.id));
      setLessonOptions(lessonsWithoutAssignment);
      setAssignmentForm(current => ({ ...current, lessonId: scopedLessonId ?? (lessonsWithoutAssignment.some(item => item.id === current.lessonId) ? current.lessonId : lessonsWithoutAssignment[0]?.id ?? '') }));
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

  const createAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const maxScore = Number(assignmentForm.maxScore);
    if (!assignmentForm.lessonId || !assignmentForm.title.trim() || !Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) {
      setCreateError('اختر درساً واكتب عنوان الواجب ودرجة قصوى صحيحة.');
      return;
    }
    setCreating(true); setCreateError(''); setNotice('');
    try {
      const body = new FormData();
      body.append('lessonId', assignmentForm.lessonId);
      body.append('title', assignmentForm.title.trim());
      body.append('type', 'TASK');
      body.append('maxScore', String(maxScore));
      if (assignmentForm.description.trim()) body.append('description', assignmentForm.description.trim());
      if (assignmentForm.dueDate) body.append('dueDate', new Date(assignmentForm.dueDate).toISOString());
      if (attachmentFile) body.append('attachment', attachmentFile);
      await api.post('/assignments', body, { timeout: 0 });
      setNotice('تم إنشاء الواجب وربطه بالدرس.');
      setShowCreateModal(false);
      setAssignmentForm(current => ({ ...current, title: '', description: '', dueDate: '' }));
      setAttachmentFile(null);
      await load();
    } catch (e) {
      setCreateError(errorOf(e));
    } finally {
      setCreating(false);
    }
  };

  const filtered = rows.filter(row => `${row.assignment.title} ${row.lessonTitle} ${row.courseTitle}`.toLowerCase().includes(query.toLowerCase()));
  const patchGrade = (id: number, patch: Partial<{score: string; feedback: string; feedbackImageUrl: string; status: string}>) => setGrades(current => ({...current, [id]: {...current[id], ...patch}}));

  return <section dir="rtl" className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-slate-900">مراجعة الواجبات والتسليمات</h2><p className="mt-1 text-sm text-slate-500">عرض ملفات الطلاب والروابط وتصحيح المهام العملية. الاختبارات القصيرة تبقى مصححة آلياً.</p></div><div className="flex gap-2"><button onClick={()=>{setCreateError('');setShowCreateModal(true);}} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><Plus className="inline ml-2" size={16}/>إضافة واجب</button><button onClick={()=>void load()} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold"><RefreshCw className="inline ml-2" size={16}/>تحديث</button></div></header>
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}
    {showCreateModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={event=>{if(event.target===event.currentTarget&&!creating)setShowCreateModal(false);}}>
      <form onSubmit={createAssignment} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="create-assignment-title">
        <header className="flex items-center justify-between"><h3 id="create-assignment-title" className="text-lg font-black text-slate-900">إضافة واجب لدرس</h3><button type="button" onClick={()=>setShowCreateModal(false)} disabled={creating} aria-label="إغلاق" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></header>
        <label className="block text-sm font-bold text-slate-700">الدرس
          <select required value={assignmentForm.lessonId} onChange={e=>setAssignmentForm(current=>({...current,lessonId:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2" disabled={!!scopedLessonId}>
            <option value="">اختر الدرس</option>{lessonOptions.map(lesson=><option key={lesson.id} value={lesson.id}>{lesson.courseTitle} · {lesson.title}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-700">عنوان الواجب
          <input required maxLength={200} value={assignmentForm.title} onChange={e=>setAssignmentForm(current=>({...current,title:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="مثال: حل تمارين الدرس"/>
        </label>
        <label className="block text-sm font-bold text-slate-700">الدرجة القصوى
          <input required type="number" min={1} max={1000} step={1} value={assignmentForm.maxScore} onChange={e=>setAssignmentForm(current=>({...current,maxScore:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2"/>
        </label>
        <label className="block text-sm font-bold text-slate-700">موعد التسليم (اختياري)
          <input type="datetime-local" value={assignmentForm.dueDate} onChange={e=>setAssignmentForm(current=>({...current,dueDate:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2"/>
        </label>
        <label className="block text-sm font-bold text-slate-700">التعليمات
          <textarea rows={3} value={assignmentForm.description} onChange={e=>setAssignmentForm(current=>({...current,description:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="اشرح المطلوب من الطالب وطريقة التسليم"/>
        </label>
        <label className="block text-sm font-bold text-slate-700">ملف مرفق للطلاب (اختياري · PDF أو صورة)
          <span className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><Paperclip size={16}/>{attachmentFile?.name ?? 'اختر ملفاً'}<input type="file" accept="application/pdf,.pdf,image/*" className="sr-only" onChange={event=>setAttachmentFile(event.target.files?.[0] ?? null)}/></span>
        </label>
        {lessonOptions.length === 0 && <p className="text-sm text-slate-500">لا توجد دروس متاحة لإضافة واجب إليها.</p>}
        {createError && <p role="alert" className="text-sm font-semibold text-red-700">{createError}</p>}
        <button disabled={creating || lessonOptions.length === 0} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{creating?'جارٍ إنشاء الواجب…':'إنشاء الواجب'}</button>
      </form>
    </div>}
    <div className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث باسم الواجب أو الدرس" className="min-w-48 flex-1 rounded-lg border px-3 py-2 text-sm"/><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">كل الحالات</option><option value="SUBMITTED">مسلّم</option><option value="GRADED">مقيّم</option><option value="RESUBMISSION_REQUESTED">إعادة تسليم مطلوبة</option></select></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
    {loadWarning && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{loadWarning}</div>}
    {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل الواجبات والتسليمات…</div> : filtered.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">{loadedLessonCount === 0 ? 'لا توجد دروس متاحة ضمن النطاق المحدد.' : 'لم يُعثر على واجب أو تسليم مطابق ضمن الدروس المحددة.'}</div> : <div className="space-y-5">{filtered.map(({assignment,lessonTitle,courseTitle,submissions})=><article key={assignment.id} className="overflow-hidden rounded-2xl border bg-white"><header className="flex flex-wrap items-center gap-2 border-b bg-slate-50 p-4"><ClipboardCheck className="text-emerald-600" size={19}/><h3 className="font-extrabold">{assignment.title}</h3><span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-800">{assignment.type}</span><span className="text-xs text-slate-500">{courseTitle} · {lessonTitle}</span><span className="mr-auto text-xs text-slate-500">الدرجة القصوى: {assignment.maxScore}</span></header>{(assignment.description || assignment.dueDate || assignment.attachmentUrl) && <div className="space-y-2 border-b px-4 py-3 text-sm text-slate-600">{assignment.description && <p className="whitespace-pre-wrap">{assignment.description}</p>}{assignment.dueDate && <p>موعد التسليم: {new Date(assignment.dueDate).toLocaleString('ar')}</p>}{assignment.attachmentUrl && <a className="inline-flex items-center gap-1 font-bold text-blue-700 underline" href={assignment.attachmentUrl} target="_blank" rel="noreferrer">فتح الملف المرفق<ExternalLink size={14}/></a>}</div>}{assignment.type === 'QUIZ' ? <p className="p-4 text-sm text-slate-500">اختبار آلي · لا يتطلب تصحيحاً يدوياً. إجمالي التسليمات: {assignment._count?.submissions ?? 0}.</p> : submissions.length === 0 ? <p className="p-5 text-center text-sm text-slate-500">لا توجد تسليمات بهذه الحالة.</p> : <div className="divide-y">{submissions.map(sub=>{const student=sub.student?.user??sub.student;const form=grades[sub.id]??{score:'',feedback:'',feedbackImageUrl:'',status:'GRADED'};return <div key={sub.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_1fr]"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><strong>{student?.name??'طالب'}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{sub.status}</span><span className="text-xs text-slate-500">{sub.submittedAt?new Date(sub.submittedAt).toLocaleString('ar'):'—'}</span></div>{sub.content&&<p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{sub.content}</p>}{sub.fileUrl&&<a className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 underline" href={sub.fileUrl} target="_blank" rel="noreferrer">فتح الملف أو الرابط<ExternalLink size={14}/></a>}{sub.score!=null&&<p className="text-sm font-bold">الدرجة المحفوظة: {sub.score} / {assignment.maxScore}</p>}</div><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold">الدرجة<input type="number" min={0} max={assignment.maxScore} value={form.score} onChange={e=>patchGrade(sub.id,{score:e.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-bold">حالة المراجعة<select value={form.status} onChange={e=>patchGrade(sub.id,{status:e.target.value})} className="mt-1 w-full rounded-lg border p-2"><option value="GRADED">تم التقييم</option><option value="RESUBMISSION_REQUESTED">طلب إعادة التسليم</option></select></label><label className="text-xs font-bold sm:col-span-2">ملاحظات التصحيح<textarea rows={2} value={form.feedback} onChange={e=>patchGrade(sub.id,{feedback:e.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-bold sm:col-span-2">رابط صورة التصحيح<input type="url" value={form.feedbackImageUrl} onChange={e=>patchGrade(sub.id,{feedbackImageUrl:e.target.value})} className="mt-1 w-full rounded-lg border p-2" dir="ltr"/></label><button disabled={saving===sub.id} onClick={()=>void gradeSubmission(sub,assignment)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2"><Save className="inline ml-2" size={15}/>{saving===sub.id?'جارٍ الحفظ…':'حفظ التقييم'}</button></div></div>;})}</div>}</article>)}</div>}
  </section>;
}
