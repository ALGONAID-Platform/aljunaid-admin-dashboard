import { useEffect, useState } from 'react';
import { CheckCircle2, Megaphone, Send, Users } from 'lucide-react';
import { useCoursesStore } from '../../../store';
import { notificationsService } from '../../../services/api/notifications.api';
import { resolveErrorMessage } from '../../../lib/errors';

export function NotificationBroadcastPage() {
  const { courses, fetchCourses, isLoading: coursesLoading, error: coursesError } = useCoursesStore();
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'all' | 'course'>('all');
  const [courseId, setCourseId] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => { void fetchCourses(); }, [fetchCourses]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      setFeedback({ kind: 'error', text: 'اكتب نص الإشعار قبل الإرسال.' });
      return;
    }
    if (audience === 'course' && !courseId) {
      setFeedback({ kind: 'error', text: 'اختر مقرراً لإرسال الإشعار إلى طلابه.' });
      return;
    }

    setSending(true);
    setFeedback(null);
    try {
      const selectedCourse = audience === 'course' ? courses.find(course => String(course.id) === courseId) : undefined;
      if (audience === 'course' && !selectedCourse) {
        setFeedback({ kind: 'error', text: 'المقرر المحدد غير متاح. حدّث قائمة المقررات ثم حاول مجدداً.' });
        return;
      }
      const result = await notificationsService.broadcastToMyStudents({
        message: cleanMessage,
        ...(selectedCourse ? { courseId: selectedCourse.id } : {}),
      });
      if (result.status === 201) {
        setFeedback({ kind: 'success', text: `تم إرسال الإشعار بنجاح إلى ${result.recipientsCount} مستلماً.` });
        setMessage('');
      } else if (result.status === 200) {
        setFeedback({ kind: 'info', text: 'لم يتم العثور على طلاب مسجلين ضمن الجمهور المحدد.' });
      } else {
        setFeedback({ kind: 'success', text: result.message || `تم إرسال الإشعار إلى ${result.recipientsCount} مستلماً.` });
      }
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const text = (status === 400 || status === 403) && error?.message
        ? error.message
        : resolveErrorMessage(error);
      setFeedback({ kind: 'error', text });
    } finally {
      setSending(false);
    }
  };

  const feedbackStyles = feedback?.kind === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : feedback?.kind === 'info'
      ? 'border-blue-200 bg-blue-50 text-blue-800'
      : 'border-red-200 bg-red-50 text-red-700';

  return <section dir="rtl" className="mx-auto max-w-4xl space-y-6">
    <header className="flex items-start gap-4">
      <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><Megaphone size={25}/></div>
      <div><h2 className="text-2xl font-black text-slate-900">إرسال إشعار للطلاب</h2><p className="mt-1 text-sm text-slate-500">أرسل رسالة إلى طلابك المسجلين في جميع المقررات أو في مقرر محدد.</p></div>
    </header>

    {feedback && <div role={feedback.kind === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm font-semibold ${feedbackStyles}`}>{feedback.kind === 'success' && <CheckCircle2 className="ml-2 inline" size={17}/ >}{feedback.text}</div>}
    {coursesError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">تعذر تحميل بعض المقررات: {coursesError}</div>}

    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <fieldset disabled={sending} className="space-y-4 disabled:opacity-70">
        <legend className="mb-3 text-sm font-extrabold text-slate-800">الجمهور المستهدف</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${audience === 'all' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
            <input type="radio" name="audience" value="all" checked={audience === 'all'} onChange={() => { setAudience('all'); setFeedback(null); }} className="mt-1 accent-emerald-600"/>
            <span><strong className="block text-sm text-slate-800">جميع الطلاب المسجلين</strong><span className="mt-1 block text-xs text-slate-500">ضمن المقررات المؤهلة لحسابك.</span></span>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${audience === 'course' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
            <input type="radio" name="audience" value="course" checked={audience === 'course'} onChange={() => { setAudience('course'); setFeedback(null); }} className="mt-1 accent-emerald-600"/>
            <span><strong className="block text-sm text-slate-800">طلاب مقرر محدد</strong><span className="mt-1 block text-xs text-slate-500">اختر مقرراً لإرسال الإشعار إلى طلابه.</span></span>
          </label>
        </div>

        {audience === 'course' && <label className="block space-y-2 text-sm font-bold text-slate-700">المقرر
          <select value={courseId} onChange={event => { setCourseId(event.target.value); setFeedback(null); }} disabled={coursesLoading} className="w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100">
            <option value="">{coursesLoading ? 'جارٍ تحميل المقررات…' : 'اختر المقرر'}</option>
            {courses.map(course => <option key={course.id} value={String(course.id)}>{course.title}</option>)}
          </select>
        </label>}

        <label className="block space-y-2 text-sm font-bold text-slate-700">نص الإشعار <span className="text-red-600">*</span>
          <textarea value={message} onChange={event => { setMessage(event.target.value); if (feedback?.kind === 'error') setFeedback(null); }} rows={6} placeholder="اكتب الإشعار الذي سيصل إلى الطلاب…" className="w-full resize-y rounded-xl border border-slate-300 p-3 text-sm font-normal focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" required />
          <span className="block text-left text-xs font-normal text-slate-400">{message.length} حرفاً</span>
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="flex items-center gap-2 text-xs text-slate-500"><Users size={16}/>{audience === 'all' ? 'سيتم إرسال الإشعار إلى طلاب المقررات المؤهلة.' : 'سيتم إرسال الإشعار إلى المسجلين في المقرر المختار.'}</p>
        <button type="submit" disabled={sending || !message.trim() || (audience === 'course' && (!courseId || coursesLoading))} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Send size={16}/>{sending ? 'جارٍ إرسال الإشعار…' : 'إرسال الإشعار'}
        </button>
      </div>
    </form>
  </section>;
}
