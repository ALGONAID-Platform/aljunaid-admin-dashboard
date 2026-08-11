import { useEffect, useState } from 'react';
import { 
  BookOpen, BookMarked, ClipboardList, CheckCircle2, Clock, 
  AlertCircle, TrendingUp, Sparkles, GraduationCap, ArrowUpRight
} from 'lucide-react';
import { useCoursesStore, useLessonsStore, useQuizzesStore } from '../../../store';
import { Loader } from '../../../components/feedback/Loader';
import { QuickCourseBuilderModal } from '../../../components/ui/QuickCourseBuilderModal';

export function DashboardHome() {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
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
  const completionPercentage = lessons.length > 0 ? Math.round((publishedLessons.length / lessons.length) * 100) : 0;

  const recentActivity = [
    ...courses.map((c) => ({ type: 'course' as const, label: `تم تأسيس المقرر: ${c.name}`, date: c.createdAt, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' })),
    ...lessons.map((l) => ({ type: 'lesson' as const, label: `تمت صياغة الدرس: ${l.title}`, date: l.createdAt, icon: BookMarked, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' })),
    ...quizzes.map((q) => ({ type: 'quiz' as const, label: `تم إعداد الاختبار: ${q.title}`, date: q.createdAt, icon: ClipboardList, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  if (isLoading && courses.length === 0) return <Loader fullPage />;
  
  if (error && courses.length === 0) return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white rounded-[2rem] border border-red-100 p-12 text-center shadow-xl shadow-red-500/5 flex flex-col items-center max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-inner">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">فشل تحميل بيانات لوحة القيادة</h3>
        <p className="text-slate-500 mb-8">{error}</p>
        <button onClick={() => { fetchCourses(); fetchLessons(); fetchQuizzes(); }} className="px-8 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 active:scale-95 transition-all font-bold shadow-md shadow-red-500/20 w-full">
          إعادة الاتصال بالخادم
        </button>
      </div>
    </div>
  );

  return (
    <div className="font-sans antialiased space-y-4 sm:space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Dynamic Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] p-5 sm:p-10 shadow-lg" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 60%, #047857 100%)' }}>
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-900/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-5">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/30 shrink-0">
              <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-md" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-emerald-100 font-bold tracking-wider text-[11px] uppercase">النظام النشط</span>
              </div>
              <h2 className="text-xl sm:text-3xl text-white font-extrabold tracking-tight drop-shadow-xs mb-1">
                أهلاً بك، مشرف المنصة
              </h2>
              <p className="text-emerald-50 text-xs sm:text-base font-medium opacity-90">
                أنت الآن تتصفح وتدير منصة الجنيد التعليمية. إليك ملخص الإحصائيات.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Course Builder Modal Integration */}
      <QuickCourseBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
      />

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard 
          icon={BookOpen} 
          label="المقررات الدراسية" 
          value={courses.length} 
          color="#2563EB" 
          lightBg="#EFF6FF" 
          sub="إجمالي المقررات المعتمدة" 
        />
        <StatCard 
          icon={BookMarked} 
          label="الدروس المضافة" 
          value={lessons.length} 
          color="#059669" 
          lightBg="#ECFDF5" 
          sub={`${publishedLessons.length} متاح للطلاب`} 
        />
        <StatCard 
          icon={ClipboardList} 
          label="الاختبارات والتقييمات" 
          value={quizzes.length} 
          color="#7C3AED" 
          lightBg="#F5F3FF" 
          sub={`بإجمالي ${quizzes.reduce((s, q) => s + q.questions.length, 0)} سؤال`} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Activity Feed Section */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shadow-sm border border-emerald-100">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-slate-800 font-bold text-base">سجل العمليات الأخيرة</h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">أحدث التغييرات التي تمت على المنصة</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[450px] custom-scrollbar p-2">
            {recentActivity.length === 0 ? (
              <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="text-slate-700 font-bold mb-1">لا يوجد نشاط مسجل</h4>
                <p className="text-slate-400 text-sm">ستظهر العمليات الجديدة هنا فور حدوثها.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50/80">
                {recentActivity.map((item, i) => (
                  <div key={i} className="px-4 py-4 flex items-start sm:items-center gap-4 hover:bg-slate-50/80 transition-colors rounded-xl mx-2 my-1 group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${item.bg} ${item.border} group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 font-bold text-sm truncate mb-1">{item.label}</p>
                      <p className="text-slate-400 text-xs font-medium font-mono">{new Date(item.date).toLocaleString('ar-SA')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Publishing Progress */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shadow-sm border border-blue-100">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-slate-800 font-bold text-base">حالة نشر المحتوى</h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">متابعة جاهزية الدروس للطلاب</p>
            </div>
          </div>

          {lessons.length === 0 ? (
            <div className="p-10 text-center flex-1 flex flex-col items-center justify-center">
              <BookMarked className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium">لم يتم إضافة دروس بعد لتقييم النشر</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Progress Chart Widget */}
              <div className="p-6 pb-4 border-b border-slate-100">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">معدل الإنجاز العام</span>
                    <span className="text-slate-800 text-2xl font-black">{completionPercentage}%</span>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 flex items-center justify-center border-slate-100 relative">
                     <svg viewBox="0 0 36 36" className="w-full h-full absolute -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray={`${completionPercentage}, 100`} />
                    </svg>
                  </div>
                </div>
                
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4 shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${completionPercentage}%`, background: 'linear-gradient(90deg, #10B981, #059669)' }}
                  />
                </div>
                
                <div className="flex gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                      <span className="text-slate-500 text-xs font-bold">متاح للطلاب</span>
                    </div>
                    <span className="text-slate-800 font-black pl-4">{publishedLessons.length} درس</span>
                  </div>
                  <div className="w-px bg-slate-200"></div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shadow-sm" />
                      <span className="text-slate-500 text-xs font-bold">قيد المراجعة</span>
                    </div>
                    <span className="text-slate-800 font-black pl-4">{unpublishedLessons.length} مسودة</span>
                  </div>
                </div>
              </div>

              {/* Mini List */}
              <div className="p-2 flex-1 overflow-y-auto max-h-[220px] custom-scrollbar">
                {lessons.slice(0, 5).map((lesson) => (
                  <div key={lesson.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors mx-2 my-1 group">
                    <div className="flex items-center gap-3 min-w-0">
                      {lesson.isPublished
                        ? <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100"><CheckCircle2 className="w-4 h-4" /></div>
                        : <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200"><Clock className="w-4 h-4" /></div>
                      }
                      <span className="text-slate-700 font-bold text-sm truncate group-hover:text-emerald-600 transition-colors">{lesson.title}</span>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-md flex-shrink-0 ml-2"
                      style={lesson.isPublished
                        ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
                        : { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }
                      }
                    >
                      {lesson.isPublished ? 'نشط' : 'مسودة'}
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

// ─── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, lightBg, sub }: {
  icon: React.ElementType; label: string; value: number; color: string; lightBg: string; sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 p-4 sm:p-6 flex items-start gap-3 sm:gap-4 shadow-xs hover:shadow-md transition-all group">
      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300 shadow-inner" style={{ background: lightBg, border: `1px solid ${color}20` }}>
        <Icon className="w-5 h-5 sm:w-7 sm:h-7" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-slate-500 font-bold text-xs sm:text-sm mb-1 truncate">{label}</h3>
        <div className="text-slate-800 text-2xl sm:text-3xl font-black tracking-tight mb-1 flex items-baseline gap-2">
          {value}
        </div>
        <p className="text-slate-400 text-[11px] sm:text-xs font-semibold truncate">{sub}</p>
      </div>
    </div>
  );
}
