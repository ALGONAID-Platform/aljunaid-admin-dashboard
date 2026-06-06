import { useEffect } from 'react';
import { BookOpen, BookMarked, ClipboardList, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { useCoursesStore, useLessonsStore, useContentStore, useQuizzesStore } from '../../../store';
import { Loader } from '../../../components/feedback/Loader';

export function DashboardHome() {
  const courses = useCoursesStore((s) => s.courses);
  const fetchCourses = useCoursesStore((s) => s.fetchCourses);
  const lessons = useLessonsStore((s) => s.lessons);
  const fetchLessons = useLessonsStore((s) => s.fetchLessons);
  const quizzes = useQuizzesStore((s) => s.quizzes);
  const fetchQuizzes = useQuizzesStore((s) => s.fetchQuizzes);
  const isLoading = useCoursesStore((s) => s.isLoading);
  const error = useCoursesStore((s) => s.error);

  useEffect(() => {
    void fetchCourses();
    void fetchLessons();
    void fetchQuizzes();
  }, [fetchCourses, fetchLessons, fetchQuizzes]);

  const publishedLessons = lessons.filter((l) => l.isPublished);
  const unpublishedLessons = lessons.filter((l) => !l.isPublished);

  const recentActivity = [
    ...courses.map((c) => ({ type: 'course' as const, label: `تم إنشاء مقرر: ${c.name}`, date: c.createdAt, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' })),
    ...lessons.map((l) => ({ type: 'lesson' as const, label: `تم إنشاء درس: ${l.title}`, date: l.createdAt, icon: BookMarked, color: 'text-emerald-500', bg: 'bg-emerald-50' })),
    ...quizzes.map((q) => ({ type: 'quiz' as const, label: `تم إنشاء اختبار: ${q.title}`, date: q.createdAt, icon: ClipboardList, color: 'text-purple-500', bg: 'bg-purple-50' })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  if (isLoading) return <Loader fullPage />;
  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl border border-red-200 p-10 text-center shadow-sm flex flex-col items-center max-w-sm w-full">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-slate-800 mb-2" style={{ fontSize: 18, fontWeight: 700 }}>فشل تحميل البيانات</h3>
        <p className="text-slate-500 mb-6" style={{ fontSize: 14 }}>{error}</p>
        <button onClick={() => { fetchCourses(); fetchLessons(); fetchQuizzes(); }} className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
          إعادة المحاولة
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Welcome banner */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 60%, #0D9488 100%)' }}>
        <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-6 left-24 w-28 h-28 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="text-white mb-1" style={{ fontSize: 22, fontWeight: 700 }}>أهلاً، مشرف النظام</h2>
          <p className="text-emerald-100" style={{ fontSize: 14 }}>مرحباً بك في لوحة تحكم منصة الجنيد التعليمية</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
        <StatCard icon={BookOpen} label="إجمالي المقررات" value={courses.length} color="#3B82F6" lightBg="#EFF6FF" sub={`${courses.length} مقرر مسجّل`} />
        <StatCard icon={BookMarked} label="إجمالي الدروس" value={lessons.length} color="#10B981" lightBg="#ECFDF5" sub={`${publishedLessons.length} منشور · ${unpublishedLessons.length} غير منشور`} />
        <StatCard icon={ClipboardList} label="إجمالي الاختبارات" value={quizzes.length} color="#8B5CF6" lightBg="#F5F3FF" sub={`${quizzes.reduce((s, q) => s + q.questions.length, 0)} سؤال إجمالاً`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 sm:gap-5">
        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="text-slate-700" style={{ fontSize: 15, fontWeight: 600 }}>آخر العمليات</h3>
          </div>
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400" style={{ fontSize: 14 }}>لا توجد عمليات حتى الآن</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentActivity.map((item, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="flex-1 text-slate-600" style={{ fontSize: 13 }}>{item.label}</span>
                  <span className="text-slate-400" style={{ fontSize: 12 }}>{item.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Published status */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-slate-700" style={{ fontSize: 15, fontWeight: 600 }}>حالة الدروس</h3>
          </div>

          {lessons.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-400" style={{ fontSize: 14 }}>لا توجد دروس بعد</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-4">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500" style={{ fontSize: 13 }}>نسبة النشر</span>
                  <span className="text-emerald-600" style={{ fontSize: 13, fontWeight: 600 }}>
                    {Math.round((publishedLessons.length / lessons.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round((publishedLessons.length / lessons.length) * 100)}%`, background: 'linear-gradient(90deg, #10B981, #0D9488)' }}
                  />
                </div>
                <div className="flex gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-500" style={{ fontSize: 12 }}>منشور ({publishedLessons.length})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="text-slate-500" style={{ fontSize: 12 }}>غير منشور ({unpublishedLessons.length})</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 divide-y divide-slate-50 max-h-56 overflow-y-auto">
                {lessons.slice(0, 5).map((lesson) => (
                  <div key={lesson.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {lesson.isPublished
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        : <Clock className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      }
                      <span className="text-slate-600 truncate" style={{ fontSize: 13 }}>{lesson.title}</span>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={lesson.isPublished
                        ? { background: '#ECFDF5', color: '#059669' }
                        : { background: '#F8FAFC', color: '#94A3B8' }
                      }
                    >
                      {lesson.isPublished ? 'منشور' : 'مسودة'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, lightBg, sub }: {
  icon: React.ElementType; label: string; value: number; color: string; lightBg: string; sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: lightBg }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <div className="text-slate-400" style={{ fontSize: 13 }}>{label}</div>
        <div className="text-slate-800" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
        <div className="text-slate-400" style={{ fontSize: 12 }}>{sub}</div>
      </div>
    </div>
  );
}
