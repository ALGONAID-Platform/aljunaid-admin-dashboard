import { useEffect, useMemo, useState } from 'react';
import { Search, Save, Users, GraduationCap, AlertCircle, BookOpen, ClipboardList } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useLessonsStore } from '../../../store/lessons.store';
import { StudentLessonGrades } from '../components/StudentLessonGrades';

type Student = { id: string; name: string; email?: string };
type Assessment = { id: string; lessonId: string; lessonTitle: string; title: string; kind: 'assignment' | 'exam'; maxScore: number };
type GradeRow = { studentId: string; assessmentId: string; score: number | null; note?: string };
const unwrap = (v: any): any => {
  let value = v?.data ?? v;
  // Some API deployments wrap responses as { success, data: { ... } }.
  for (let i = 0; i < 3 && value && !Array.isArray(value) && !value.course && value.data; i += 1) value = value.data;
  return value;
};

export function CourseGradesPage({ courseId }: { courseId: string }) {
  const { lessons, fetchLessons } = useLessonsStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentEdits, setStudentEdits] = useState<Record<string, { score: string; note: string }>>({});
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'overview' | 'students' | 'assessments'>('overview');
  const [selected, setSelected] = useState<string>('');
  const [assessmentId, setAssessmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => { void fetchLessons(courseId); }, [courseId, fetchLessons]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    api.get(`/grades/courses/${courseId}`).then(({ data: gradeResponse }) => {
      if (!active) return;
      const data = unwrap(gradeResponse);
      if (!data || !Array.isArray(data.students) || !Array.isArray(data.assessments)) throw new Error('استجابة واجهة الدرجات لا تحتوي بيانات الطلاب والتقييمات المتوقعة.');
      setStudents((data.students ?? []).map((x: any) => { const s = x.student ?? x; return { id: String(s.id), name: s.name ?? s.user?.name ?? s.email ?? `طالب ${s.id}`, email: s.email ?? s.user?.email, summary: x.summary }; }));
      setAssignments(data.assessments ?? []);
      setGrades((data.gradeRecords ?? []).map((x: any) => ({ studentId: String(x.studentId), assessmentId: String(x.assessmentId), score: x.score == null ? null : Number(x.score), note: x.note ?? '' })));
    }).catch(async (error: any) => {
      if (!active) return;
      const message = error?.message ?? 'تعذر تحميل بيانات الدرجات';
      // Keep the course roster visible when the grades summary fails for one
      // student record; the existing subscribers endpoint can still provide it.
      try {
        const { data: rosterResponse } = await api.get(`/payments/admin/enrollments/${courseId}`, { params: { page: 1, limit: 100 } });
        if (!active) return;
        const roster = unwrap(rosterResponse);
        const entries = Array.isArray(roster) ? roster : roster?.enrollments ?? roster?.items ?? roster?.data?.enrollments ?? roster?.data?.items ?? [];
        setStudents(entries.map((entry: any) => { const student = entry.student ?? entry.user ?? entry; return { id: String(student.id ?? entry.studentId ?? entry.userId), name: student.name ?? student.user?.name ?? student.email ?? `طالب ${student.id ?? entry.studentId ?? ''}`, email: student.email ?? student.user?.email }; }).filter((student: Student) => student.id && student.id !== 'undefined'));
        setAssignments([]); setGrades([]);
        setLoadError(`تعذر تحميل الدرجات: ${message}`);
      } catch {
        setLoadError(message);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId]);

  const courseLessons = useMemo(() => lessons.filter(l => String(l.courseId) === String(courseId) || l.courseName === courseId), [lessons, courseId]);
  const assessments = useMemo<Assessment[]>(() => {
    return assignments.map(a => ({ id: String(a.assessmentId ?? a.id), lessonId: String(a.lessonId), lessonTitle: a.lessonTitle ?? '', title: a.title, kind: String(a.type).toUpperCase().includes('EXAM') ? 'exam' : 'assignment', maxScore: Number(a.maxScore ?? 100) }));
  }, [assignments]);
  const visibleStudents = students.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.email?.toLowerCase().includes(query.toLowerCase()));
  const scored = grades.filter(g => g.score !== null);
  const avg = scored.length ? scored.reduce((sum, g) => sum + (g.score ?? 0), 0) / scored.length : null;
  const incomplete = students.filter(s => assessments.some(a => !grades.some(g => g.studentId === s.id && g.assessmentId === a.id && g.score !== null))).length;
  const activeAssessment = assessments.find(a => a.id === assessmentId);

  const updateScore = (studentId: string, score: string) => setGrades(current => {
    const value = score === '' ? null : Number(score);
    const found = current.some(g => g.studentId === studentId && g.assessmentId === assessmentId);
    return found ? current.map(g => g.studentId === studentId && g.assessmentId === assessmentId ? { ...g, score: value } : g) : [...current, { studentId, assessmentId, score: value }];
  });
  const save = async (rows: GradeRow[]) => {
    if (rows.some(g => assessments.find(a => a.id === g.assessmentId)?.kind === 'exam')) { toast.error('الحفظ الجماعي في الخادم يدعم التكاليف فقط.'); return; }
    const valid = rows.filter(g => g.score !== null);
    if (valid.some(g => { const a = assessments.find(x => x.id === g.assessmentId); return !a || g.score! < 0 || g.score! > a.maxScore; })) { toast.error('تحقق من الدرجات؛ لا يجوز تجاوز الدرجة القصوى.'); return; }
    setSaving(true);
    try { const response = await api.post(`/grades/courses/${courseId}/bulk`, { grades: valid.map(g => ({ studentId: Number(g.studentId), assessmentId: Number(g.assessmentId), score: g.score, note: g.note })) }); const payload = unwrap(response); const saved = payload.records ?? payload.savedRecords ?? []; setGrades(current => { const next = [...current]; for (const record of saved) { const studentId = String(record.studentId); const assessmentId = String(record.assignmentId ?? record.assessmentId); const existing = next.findIndex(g => g.studentId === studentId && g.assessmentId === assessmentId); const row = { studentId, assessmentId, score: record.score == null ? null : Number(record.score), note: record.feedback ?? record.note ?? '' }; if (existing >= 0) next[existing] = row; else next.push(row); } return next; }); toast.success(payload.message ?? 'تم حفظ الدرجات'); }
    catch (e: any) { toast.error(e?.message ?? 'تعذر حفظ الدرجات'); }
    finally { setSaving(false); }
  };

  const openStudent = async (studentId: string) => {
    setSelected(studentId); setTab('students'); localStorage.setItem(`course-grades-selected-student:${courseId}`, studentId); setStudentLoading(true); setStudentRecord(null); setSelectedLessonId('');
    try { const { data } = await api.get(`/grades/courses/${courseId}/students/${studentId}`); const record = unwrap(data); setStudentRecord(record); setSelectedLessonId(String(record.lessons?.[0]?.lessonId ?? '')); }
    catch { /* Keep the page open if student details cannot load. */ }
    finally { setStudentLoading(false); }
  };
  useEffect(() => {
    const rememberedStudent = localStorage.getItem(`course-grades-selected-student:${courseId}`);
    if (rememberedStudent) void openStudent(rememberedStudent);
  }, [courseId]);
  const saveStudentGrade = async (assessment: Assessment) => {
    if (!selected || assessment.kind !== 'assignment') return;
    const edit = studentEdits[assessment.id]; if (!edit || edit.score === '') { toast.error('أدخل درجة صحيحة أولاً'); return; }
    const score = Number(edit.score); if (!Number.isFinite(score) || score < 0 || score > assessment.maxScore) { toast.error(`الدرجة يجب أن تكون بين 0 و${assessment.maxScore}`); return; }
    try { const { data } = await api.patch(`/grades/courses/${courseId}/students/${selected}/assignments/${assessment.id}`, { score, feedback: edit.note }); const payload = unwrap(data); const row = payload.submission ?? payload; setGrades(current => { const found = current.some(g => g.studentId === selected && g.assessmentId === assessment.id); const updated = { studentId: selected, assessmentId: assessment.id, score: Number(row.score ?? score), note: row.feedback ?? edit.note }; return found ? current.map(g => g.studentId === selected && g.assessmentId === assessment.id ? updated : g) : [...current, updated]; }); toast.success(payload.message ?? 'تم حفظ الدرجة'); }
    catch (e: any) { toast.error(e?.message ?? 'تعذر حفظ الدرجة'); }
  };

  return <main dir="rtl" className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-black text-slate-900">إدارة الدرجات</h1><p className="mt-1 text-sm text-slate-500">السجلات الأكاديمية والتقييمات المسجلة للمقرر.</p></div><div className="flex gap-2">{(['overview', 'students', 'assessments'] as const).map((key, i) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === key ? 'bg-emerald-600 text-white' : 'border bg-white text-slate-600'}`}>{['نظرة عامة', 'درجات الطلاب', 'التقييمات'][i]}</button>)}</div></header>
    {loading ? <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">جارٍ تحميل بيانات المقرر…</div> : <>
      {tab !== 'assessments' && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[Users, 'الطلاب المسجلون', students.length], [GraduationCap, 'متوسط الدرجات المسجلة', avg === null ? '—' : `${avg.toFixed(1)}%`], [AlertCircle, 'درجات غير مكتملة', incomplete], [BookOpen, 'التقييمات الفعلية', assessments.length]].map(([Icon, label, value]: any) => <div key={label} className="rounded-2xl border bg-white p-4"><div className="flex items-center gap-2 text-sm text-slate-500"><Icon size={17}/>{label}</div><div className="mt-2 text-2xl font-black text-slate-900">{value}</div></div>)}</div>}
      {tab === 'assessments' ? <section className="space-y-4 rounded-2xl border bg-white p-4"><div className="flex items-center gap-2"><ClipboardList size={18}/><h2 className="font-black">التصحيح الجماعي</h2></div><select className="w-full rounded-xl border p-3 sm:max-w-xl" value={assessmentId} onChange={e => setAssessmentId(e.target.value)}><option value="">اختر اختباراً أو واجباً</option>{assessments.map(a => <option key={`${a.kind}-${a.id}`} value={a.id}>{a.lessonTitle} — {a.title} ({a.kind === 'exam' ? 'اختبار' : 'واجب'})</option>)}</select>{activeAssessment && <><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-right text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">الطالب</th><th className="p-3">البريد</th><th className="p-3">الدرجة من {activeAssessment.maxScore}</th><th className="p-3">الحالة</th></tr></thead><tbody>{students.map(s => { const g = grades.find(x => x.studentId === s.id && x.assessmentId === activeAssessment.id); return <tr key={s.id} className="border-b last:border-0"><td className="p-3 font-bold">{s.name}</td><td className="p-3 text-slate-500">{s.email ?? '—'}</td><td className="p-3"><input type="number" min="0" max={activeAssessment.maxScore} step="0.1" value={g?.score ?? ''} onChange={e => updateScore(s.id, e.target.value)} className="w-28 rounded-lg border p-2" aria-label={`درجة ${s.name}`} /></td><td className="p-3">{g?.score == null ? <span className="text-amber-700">غير مرصودة</span> : 'مرصودة'}</td></tr>; })}</tbody></table></div><button disabled={saving || activeAssessment.kind === 'exam'} onClick={() => void save(grades.filter(g => g.assessmentId === activeAssessment.id))} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white disabled:opacity-50"><Save size={16}/>{activeAssessment.kind === 'exam' ? 'عرض فقط: تحديث الاختبارات غير مدعوم من API' : saving ? 'جارٍ الحفظ…' : 'حفظ الدرجات'}</button></>}</section> : <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><h2 className="font-black">{tab === 'overview' ? 'الطلاب المسجلون' : selected ? `السجل الأكاديمي — ${students.find(s => s.id === selected)?.name ?? ''}` : 'اختر طالباً لعرض درجاته'}</h2><label className="relative"><Search className="absolute right-3 top-3 text-slate-400" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن طالب" className="rounded-xl border py-2.5 pr-9 pl-3 text-sm"/></label></div>{tab !== 'students' && <div className="divide-y">{visibleStudents.map(s => <button key={s.id} onClick={() => void openStudent(s.id)} className="flex w-full items-center justify-between p-4 text-right hover:bg-slate-50"><span><b>{s.name}</b><small className="block text-slate-500">{s.email}</small></span><span className="text-sm text-slate-500">{grades.filter(g => g.studentId === s.id && g.score !== null).length} درجة مسجلة</span></button>)}{visibleStudents.length === 0 && <p className="p-8 text-center text-slate-500">لا يوجد طلاب مطابقون للبحث.</p>}</div>}{tab === 'students' && selected && <div className="border-t p-4">{studentLoading ? <p className="p-5 text-center text-slate-500">جارٍ تحميل السجل الأكاديمي…</p> : studentRecord && <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['الحضور', `${studentRecord.summary?.attendance?.attendancePercentage ?? 0}%`], ['الواجبات', `${studentRecord.summary?.assignments?.totalEarnedScore ?? 0} / ${studentRecord.summary?.assignments?.totalMaxScore ?? 0}`], ['الاختبارات', `${studentRecord.summary?.exams?.totalEarnedPoints ?? 0} / ${studentRecord.summary?.exams?.totalMaxPoints ?? 0}`], ['المعدل', `${studentRecord.summary?.overall?.cumulativeGpa ?? 0}% · ${studentRecord.summary?.overall?.gradeLetter ?? '—'}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><b>{value}</b></div>)}</div>}{studentRecord && <><section className="mb-4 rounded-xl border p-4"><h3 className="font-black">{studentRecord.student?.name ?? students.find(s => s.id === selected)?.name} · {studentRecord.course?.title}</h3><p className="mt-1 text-sm text-slate-500">{studentRecord.student?.email ?? students.find(s => s.id === selected)?.email ?? ""} · {studentRecord.enrollment?.status ?? ""}</p></section><section className="hidden"><h3>دروس المقرر ودرجات الطالب</h3>{(studentRecord.lessons ?? []).map((lesson: any) => <div key={lesson.lessonId}>{lesson.lessonTitle}</div>)}</section></>}<StudentLessonGrades courseId={courseId} studentId={selected} record={studentRecord} onSaved={setStudentRecord}/></div>}</section>}
    </>}
  </main>;
}
