import { useEffect } from 'react';
import {
  BookOpen, BookMarked, ClipboardList, AlertCircle
} from 'lucide-react';
import { useCoursesStore, useLessonsStore, useQuizzesStore } from '../../../store';
import { Loader } from '../../../components/feedback/Loader';
import { PageGuide } from '../../../components/ui/PageGuide';
import { DashboardInteractionsCard } from '../components/DashboardInteractionsCard';
export function DashboardHome() {
  const courses = useCoursesStore((s) => s.courses);
  const fetchCourses = useCoursesStore((s) => s.fetchCourses);
  const lessons = useLessonsStore((s) => s.lessons);
  const fetchLessons = useLessonsStore((s) => s.fetchLessons);
  const lessonsError = useLessonsStore((s) => s.error);
  const lessonsLoading = useLessonsStore((s) => s.isLoading);
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

      <PageGuide
        title="دليل مسار العمل الشامل للمنصة"
        description="دليلك خطوة بخطوة للبدء في بناء المحتوى التعليمي والانتقال بين أقسام المنصة بتسلسل منطقي وصحيح."
        steps={[
          {
            title: "الخطوة الأولى: المقررات الدراسية",
            description: "انتقل إلى قسم 'المقررات' من الشريط الجانبي. قم بتأسيس المقررات الرئيسية أولاً، فهي الحاضن الأساسي. تأكد من وضع صورة توضيحية ووصف دقيق لكل مقرر."
          },
          {
            title: "الخطوة الثانية: إدارة الدروس والمحتوى",
            description: "توجه لقسم 'الدروس'. ابدأ أولاً بـ 'إدارة الوحدات التعليمية' لترتيب الفصول، ثم أنشئ الدروس وحدد نوع المحتوى (فيديو، نص، مستند) واربطه بالمقرر والوحدة المناسبة."
          },
          {
            title: "الخطوة الثالثة: الاختبارات والتقييم",
            description: "من قسم 'الاختبارات'، يمكنك إضافة تقييم واحد لكل درس تم إنشاؤه. لن تستطيع إنشاء اختبار إذا لم تكن هناك دروس متاحة. اتبع خطوات إضافة الأسئلة وحدد الإجابة الصحيحة."
          },
          {
            title: "الخطوة الرابعة: النماذج الامتحانية",
            description: "لإثراء المادة، توجه لقسم 'نماذج الامتحانات' لرفع نماذج واختبارات سابقة بصيغة PDF وربطها بالمقرر ككل كمرجع إضافي للطلاب."
          }
        ]}
        tips={[
          "التسلسل المنطقي ضروري: لا تنشئ درساً قبل تأسيس مقره، ولا اختباراً قبل وجود درسه.",
          "لا تنسَ النقر على حالة الدرس وتغييرها إلى 'منشور' لكي يظهر للطلاب بعد الانتهاء من إعداده."
        ]}
      />
      
      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
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

      {lessonsError && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-red-800">تعذر تحميل الدروس</p>
              <p className="text-sm text-red-700">{lessonsError}</p>
            </div>
          </div>
          <button disabled={lessonsLoading} onClick={() => void fetchLessons()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
            {lessonsLoading ? 'جارٍ إعادة المحاولة…' : 'إعادة المحاولة'}
          </button>
        </div>
      )}

      {/* Interactions, Mentions & Reviews Section (Replaces Activity Feed) */}
      <DashboardInteractionsCard courses={courses} />
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, lightBg, sub }: {
  icon: React.ElementType; label: string; value: number; color: string; lightBg: string; sub: string;
}) {
  return (
    <div className="interactive-surface bg-white rounded-2xl border border-slate-100 p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-all group">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300" style={{ background: lightBg, border: `1px solid ${color}20` }}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-slate-500 font-bold text-[11px] sm:text-xs mb-0.5 truncate">{label}</h3>
        <div className="text-slate-800 text-lg sm:text-xl font-black tracking-tight flex items-baseline gap-2">
          {value}
        </div>
        <p className="text-slate-400 text-[10px] sm:text-[11px] font-semibold truncate mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
