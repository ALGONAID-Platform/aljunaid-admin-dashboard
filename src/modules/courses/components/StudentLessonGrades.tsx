import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../../lib/api';

type Props = { courseId: string; studentId: string; record: any; onSaved: (record: any) => void };
export function StudentLessonGrades({ courseId, studentId, record, onSaved }: Props) {
  const lessons = record?.lessons ?? [];
  const attendanceKey = `course-grades-attendance:${courseId}:${studentId}`;
  const gradeDraftKey = `course-grades-drafts:${courseId}:${studentId}`;
  const [edits, setEdits] = useState<Record<string, { score: string; note: string }>>(() => {
    try { return JSON.parse(localStorage.getItem(gradeDraftKey) ?? '{}'); } catch { return {}; }
  });
  const [attendanceEdits, setAttendanceEdits] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(attendanceKey) ?? '{}'); } catch { return {}; }
  });
  useEffect(() => {
    try { setAttendanceEdits(JSON.parse(localStorage.getItem(attendanceKey) ?? '{}')); } catch { setAttendanceEdits({}); }
  }, [attendanceKey]);
  useEffect(() => {
    try { setEdits(JSON.parse(localStorage.getItem(gradeDraftKey) ?? '{}')); } catch { setEdits({}); }
  }, [gradeDraftKey]);
  useEffect(() => {
    if (Object.keys(edits).length) localStorage.setItem(gradeDraftKey, JSON.stringify(edits));
  }, [edits, gradeDraftKey]);
  const updateEdit = (id: string, edit: { score: string; note: string }) => setEdits(current => {
    const next = { ...current, [id]: edit };
    localStorage.setItem(gradeDraftKey, JSON.stringify(next));
    return next;
  });
  const [saving, setSaving] = useState(false);
  const changed = useMemo(() => lessons.flatMap((lesson: any) => {
    const assignment = lesson.assignment;
    if (!assignment) return [];
    const edit = edits[String(assignment.id)];
    return edit ? [{ assignmentId: Number(assignment.id), score: edit.score === '' ? null : Number(edit.score), note: edit.note }] : [];
  }), [lessons, edits]);
  const save = async () => {
    if (!changed.length) return;
    if (changed.some(row => row.score === null || !Number.isFinite(row.score) || row.score < 0)) { toast.error('أدخل درجة صحيحة لكل واجب تم تعديله.'); return; }
    for (const row of changed) {
      const assignment = lessons.find((l: any) => Number(l.assignment?.id) === row.assignmentId)?.assignment;
      if (row.score! > Number(assignment?.maxScore ?? 0)) { toast.error(`الدرجة تتجاوز الحد الأعلى للتكليف ${assignment?.title ?? ''}`); return; }
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/grades/courses/${courseId}/bulk`, { grades: changed.map(row => ({ studentId: Number(studentId), assignmentId: row.assignmentId, score: row.score, note: row.note })) });
      const fresh = await api.get(`/grades/courses/${courseId}/students/${studentId}`);
      onSaved(fresh.data);
      setEdits({});
      localStorage.removeItem(gradeDraftKey);
      toast.success(data?.message ?? 'تم حفظ تعديلات الدرجات.');
    } catch (error: any) { toast.error(error?.message ?? 'تعذر حفظ الدرجات.'); }
    finally { setSaving(false); }
  };
  if (!lessons.length) return <p className="rounded-xl border bg-white p-6 text-center text-slate-500">لا توجد دروس في سجل الطالب الذي أعاده الخادم.</p>;
  return <section className="space-y-3 rounded-2xl border bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">درجات الطالب في دروس المقرر</h3><p className="mt-1 text-xs text-slate-500">الاختبارات للعرض، وتعديلات التكليفات تحفظ دفعة واحدة.</p></div><button type="button" disabled={saving || !changed.length} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white disabled:opacity-50"><Save size={16}/>{saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</button></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-right text-sm"><thead><tr className="border-b bg-slate-50 text-slate-600"><th className="p-3">الدرس</th><th className="p-3">الحضور</th><th className="p-3">درجة التكليف</th><th className="p-3">ملاحظة المعلم</th><th className="p-3">درجة الاختبار</th><th className="p-3">مجموع الدرس</th></tr></thead><tbody>{lessons.map((lesson: any, index: number) => {
      const assignment = lesson.assignment;
      const edit = assignment ? edits[String(assignment.id)] : undefined;
      const attendance = attendanceEdits[String(lesson.lessonId)] ?? lesson.attendance?.status ?? (lesson.attendance?.isAttended ? 'PRESENT' : 'ABSENT');
      return <tr key={lesson.lessonId ?? index} className="border-b align-top last:border-0"><td className="p-3"><button type="button" className="text-right font-bold text-emerald-800" title="بيانات الدرس" onClick={() => toast(lesson.lessonTitle)}>{lesson.order ?? index + 1}. {lesson.lessonTitle}</button><small className="block text-slate-500">{lesson.moduleTitle ?? ''}</small></td><td className="p-3"><select aria-label={`الحضور: ${lesson.lessonTitle}`} value={attendance} onChange={e => setAttendanceEdits(current => { const next = { ...current, [String(lesson.lessonId)]: e.target.value }; localStorage.setItem(attendanceKey, JSON.stringify(next)); return next; })} className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${attendance === 'PRESENT' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}><option value="PRESENT">حاضر</option><option value="ABSENT">غائب</option></select></td><td className="p-3">{assignment ? <label className="flex items-center gap-2"><input type="number" min="0" max={assignment.maxScore} step="0.1" value={edit?.score ?? (assignment.score == null ? '' : String(assignment.score))} onChange={e => setEdits(current => ({ ...current, [String(assignment.id)]: { score: e.target.value, note: current[String(assignment.id)]?.note ?? assignment.feedback ?? '' } }))} className="w-24 rounded-lg border p-2"/><span>/ {assignment.maxScore}</span></label> : <span className="text-slate-400">لا يوجد تكليف</span>}</td><td className="p-3">{assignment ? <input value={edit?.note ?? assignment.feedback ?? ''} onChange={e => setEdits(current => ({ ...current, [String(assignment.id)]: { score: current[String(assignment.id)]?.score ?? (assignment.score == null ? '' : String(assignment.score)), note: e.target.value } }))} className="w-56 rounded-lg border p-2" placeholder="ملاحظة المعلم"/> : '—'}</td><td className="p-3">{lesson.exam ? <span>{lesson.exam.score ?? 'لم يؤد'} / {lesson.exam.maxPoints} {lesson.exam.isPassed === true ? '✓' : ''}</span> : <span className="text-slate-400">لا يوجد اختبار</span>}</td><td className="p-3 font-bold">{lesson.lessonTotalEarned ?? 0} / {lesson.lessonTotalMax ?? 0}</td></tr>;
    })}</tbody></table></div>
  </section>;
}
