import { useState, useEffect, useMemo } from 'react';
import { 
  Activity, BookOpen, BookMarked, AlertCircle, FileText, 
  ClipboardList, CheckCircle2, Send, XCircle, Search, Filter, PlayCircle
} from 'lucide-react';
import { useCoursesStore, useLessonsStore, useContentStore, useQuizzesStore, useModulesStore } from '../../../store';
import type { BackendModule } from '../../../types/api';
import { useNavigate } from 'react-router';
import { ROUTES } from '../../../routes/routes.config';
import { Loader } from '../../../components/feedback/Loader';

type FilterType = 'all' | 'needs_action' | 'ready' | 'published';
type SortOption = 'title_asc' | 'title_desc';

export function AcademicProgressPage() {
  const navigate = useNavigate();
  const { courses, fetchCourses } = useCoursesStore();
  const { lessons, fetchLessons } = useLessonsStore();
  const { content, fetchContent } = useContentStore();
  const { quizzes, fetchQuizzes } = useQuizzesStore();
  const { modules, fetchModules } = useModulesStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('title_asc');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchCourses(),
        fetchLessons(),
        fetchContent(),
        fetchQuizzes(),
        fetchModules()
      ]);
      setIsLoading(false);
    };
    void loadData();
  }, [fetchCourses, fetchLessons, fetchContent, fetchQuizzes, fetchModules]);

  // Derived Data
  const coursesWithoutModules = useMemo(() => {
    return courses.filter(c => !modules.some(m => m.courseId === Number(c.id)));
  }, [courses, modules]);

  const coursesWithoutLessons = useMemo(() => {
    return courses.filter(c => {
      const courseModules = modules.filter(m => m.courseId === Number(c.id));
      if (courseModules.length === 0) return false;
      return !courseModules.some(m => lessons.some(l => Number(l.courseId) === m.id));
    });
  }, [courses, modules, lessons]);

  const modulesWithoutLessons = useMemo(() => {
    return modules.filter(module => !lessons.some(lesson => Number(lesson.courseId) === module.id));
  }, [modules, lessons]);

  const lessonsWithoutContent = useMemo(() => {
    return lessons.filter(l => !content.some(c => c.lessonId === l.id) && !l.hasContent);
  }, [lessons, content]);

  const lessonsWithoutExams = useMemo(() => {
    return lessons.filter(l => !quizzes.some(q => q.lessonId === l.id));
  }, [lessons, quizzes]);

  const draftLessons = useMemo(() => {
    return lessons.filter(l => !l.isPublished);
  }, [lessons]);

  const readyToPublishLessons = useMemo(() => {
    return lessons.filter(l => 
      !l.isPublished && 
      (l.hasContent || content.some(c => c.lessonId === l.id)) && 
      quizzes.some(q => q.lessonId === l.id) &&
      l.title.trim() && 
      l.description.trim()
    );
  }, [lessons, content, quizzes]);

  const publishedLessons = useMemo(() => {
    return lessons.filter(l => l.isPublished);
  }, [lessons]);

  const completedCourses = useMemo(() => {
    return courses.filter(course => {
      const courseModules = modules.filter(module => module.courseId === Number(course.id));
      if (courseModules.length === 0) return false;

      return courseModules.every(module => {
        const moduleLessons = lessons.filter(lesson => Number(lesson.courseId) === module.id);
        if (moduleLessons.length === 0) return false;

        return moduleLessons.every(lesson => {
          const hasContent = lesson.hasContent || content.some(item => item.lessonId === lesson.id);
          const hasExam = quizzes.some(quiz => quiz.lessonId === lesson.id);
          return hasContent && hasExam && lesson.isPublished;
        });
      });
    });
  }, [courses, modules, lessons, content, quizzes]);

  const incompleteCourses = useMemo(() => {
    const completedIds = new Set(completedCourses.map(course => course.id));
    return courses.filter(course => !completedIds.has(course.id));
  }, [courses, completedCourses]);

  // Overall Completion Calculation
  const progressPercentage = courses.length === 0 ? 0 : Math.round((completedCourses.length / courses.length) * 100);

  if (isLoading) return <Loader fullPage />;

  return (
    <div className="font-sans antialiased text-slate-800 space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1 flex items-center gap-2">
            التقدم الأكاديمي الشامل
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            تتبع حالة المحتوى التعليمي للمقررات والدروس وتحديد النواقص لضمان الجاهزية.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-full md:w-auto px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 transition-all hover:shadow-md">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-bold tracking-wider uppercase">معدل الإنجاز العام</span>
              <span className="text-xl font-black text-slate-800 flex items-center gap-1">
                {progressPercentage}%
              </span>
            </div>
            <div className="w-14 h-14 rounded-full border-[5px] flex items-center justify-center relative overflow-hidden bg-slate-50 shadow-inner" style={{ borderColor: progressPercentage > 80 ? '#10B981' : progressPercentage > 40 ? '#F59E0B' : '#EF4444' }}>
              <Activity className="w-5 h-5" style={{ color: progressPercentage > 80 ? '#059669' : progressPercentage > 40 ? '#D97706' : '#DC2626' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5">
        <StatCard title="إجمالي المقررات" value={courses.length} icon={BookOpen} color="blue" />
        <StatCard title="مقررات مكتملة" value={completedCourses.length} icon={CheckCircle2} color="emerald" />
        <StatCard title="مقررات غير مكتملة" value={incompleteCourses.length} icon={AlertCircle} color="red" isAlert />
        <StatCard title="دروس بلا محتوى" value={lessonsWithoutContent.length} icon={PlayCircle} color="red" isAlert />
        <StatCard title="دروس بلا اختبارات" value={lessonsWithoutExams.length} icon={ClipboardList} color="amber" />
        <StatCard title="دروس بانتظار النشر" value={draftLessons.length} icon={Send} color="blue" />
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث في القوائم والتقارير..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-11 py-3 rounded-xl border-2 border-slate-100 focus:border-emerald-500 bg-slate-50 focus:bg-white outline-none transition-all text-sm font-medium"
          />
        </div>
        <div className="relative min-w-[200px] shrink-0">
          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <select 
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as FilterType)}
            className="w-full pl-4 pr-11 py-3 rounded-xl border-2 border-slate-100 focus:border-emerald-500 outline-none appearance-none bg-slate-50 focus:bg-white text-sm font-bold text-slate-700 cursor-pointer transition-all shadow-sm"
          >
            <option value="all">جميع الحالات (الكل)</option>
            <option value="needs_action">يتطلب إجراء وإصلاح</option>
            <option value="ready">مكتمل وجاهز للنشر</option>
            <option value="published">منشور للطلاب مسبقاً</option>
          </select>
        </div>
        <div className="relative min-w-[180px] shrink-0">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-emerald-500 outline-none appearance-none bg-slate-50 focus:bg-white text-sm font-bold text-slate-700 cursor-pointer transition-all shadow-sm"
          >
            <option value="title_asc">ترتيب: أ-ي</option>
            <option value="title_desc">ترتيب: ي-أ</option>
          </select>
        </div>
      </div>

      {/* Grid Layout for Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Needs Action */}
        {(activeFilter === 'all' || activeFilter === 'needs_action') && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4 bg-red-50 p-3 rounded-xl w-max border border-red-100">
              <AlertCircle className="w-6 h-6 text-red-500" />
              تتطلب إجراء سريع
            </h3>
            
            <ProgressList 
              title="مقررات بدون وحدات تنظيمية" 
              items={coursesWithoutModules.map(c => ({ id: c.id, title: c.title, type: 'course', error: 'تفتقر للهيكل. أضف وحدات.' }))} 
              icon={BookOpen} 
              searchQuery={searchQuery}
              sortOption={sortOption}
              onNavigate={() => navigate(ROUTES.courses)} 
              theme="red"
            />

            <ProgressList
              title="مقررات غير مكتملة"
              items={incompleteCourses.map(c => ({ id: c.id, title: c.title, type: 'course', warning: 'ينقصها جزء من المسار الأكاديمي.' }))}
              icon={AlertCircle}
              searchQuery={searchQuery}
              sortOption={sortOption}
              onNavigate={() => navigate(ROUTES.progress)}
              theme="amber"
            />
            
            <ProgressList 
              title="وحدات خالية من الدروس" 
              items={modulesWithoutLessons.map(module => ({
                id: String(module.id),
                title: module.title,
                subtitle: courses.find(course => Number(course.id) === module.courseId)?.name,
                type: 'module',
                error: 'هذه الوحدة لا تحتوي على أي دروس.'
              }))} 
              icon={BookMarked} 
              searchQuery={searchQuery}
              sortOption={sortOption}
              onNavigate={() => navigate(ROUTES.lessons)} 
              theme="red"
            />

            <ProgressList 
              title="دروس تفتقر للمادة العلمية" 
              items={lessonsWithoutContent.map(l => ({ id: l.id, title: l.title, subtitle: l.courseName, type: 'lesson', error: 'يجب إرفاق فيديو أو ملف PDF.' }))} 
              icon={PlayCircle} 
              searchQuery={searchQuery}
              sortOption={sortOption}
              onNavigate={() => navigate(ROUTES.content)} 
              theme="red"
            />

            <ProgressList 
              title="دروس بدون اختبارات تقييمية" 
              items={lessonsWithoutExams.map(l => ({ id: l.id, title: l.title, subtitle: l.courseName, type: 'lesson', warning: 'ينصح بإضافة اختبار لقياس الفهم.' }))} 
              icon={ClipboardList} 
              searchQuery={searchQuery}
              sortOption={sortOption}
              onNavigate={() => navigate(ROUTES.quiz)} 
              theme="amber"
            />
          </div>
        )}

        {/* Right Column: Ready & Published */}
        <div className="space-y-6">
          {(activeFilter === 'all' || activeFilter === 'ready' || activeFilter === 'needs_action') && (
            <>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4 bg-amber-50 p-3 rounded-xl w-max border border-amber-100">
                <Send className="w-6 h-6 text-amber-500" />
                مسودات وجاهزة للتقديم
              </h3>
              
              <ProgressList 
                title="دروس مكتملة جاهزة للنشر" 
                items={readyToPublishLessons.map(l => ({ id: l.id, title: l.title, subtitle: l.courseName, type: 'lesson', success: 'محتوى مكتمل 100%' }))} 
                icon={CheckCircle2} 
                searchQuery={searchQuery}
                sortOption={sortOption}
                onNavigate={() => navigate(ROUTES.publish)} 
                theme="emerald"
              />

              {activeFilter === 'all' && (
                <ProgressList 
                  title="مسودات قيد التطوير" 
                  items={draftLessons.filter(l => !readyToPublishLessons.includes(l)).map(l => ({ id: l.id, title: l.title, subtitle: l.courseName, type: 'lesson' }))} 
                  icon={FileText} 
                  searchQuery={searchQuery}
                  sortOption={sortOption}
                  onNavigate={() => navigate(ROUTES.lessons)} 
                  theme="blue"
                />
              )}
            </>
          )}

          {(activeFilter === 'all' || activeFilter === 'published') && (
            <>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mt-10 mb-4 bg-emerald-50 p-3 rounded-xl w-max border border-emerald-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                المحتوى المنشور للطلاب
              </h3>
              
              <ProgressList 
                title="الدروس النشطة والمعتمدة" 
                items={publishedLessons.map(l => ({ id: l.id, title: l.title, subtitle: l.courseName, type: 'lesson', success: 'متاح للطلاب بنجاح' }))} 
                icon={Send} 
                searchQuery={searchQuery}
                sortOption={sortOption}
                onNavigate={() => navigate(ROUTES.publish)} 
                theme="emerald"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Component Helpers ────────────────────────────────────────────────────────

function StatCard({ title, value, total, icon: Icon, color, isAlert }: { title: string, value: number, total?: number, icon: any, color: 'blue' | 'emerald' | 'amber' | 'red', isAlert?: boolean }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-500/5',
    red: 'bg-red-50 text-red-600 border-red-100 shadow-red-500/5',
  };

  return (
    <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-center relative overflow-hidden transition-transform hover:-translate-y-1 ${colors[color]}`}>
      {isAlert && value > 0 && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-2xl animate-pulse" />
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border ${colors[color].split(' ')[2]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-bold opacity-90">{title}</span>
      </div>
      <div className="text-3xl font-black tracking-tight drop-shadow-sm flex items-baseline gap-2">
        {value} 
        {total !== undefined && <span className="text-lg font-bold opacity-50">/ {total}</span>}
      </div>
    </div>
  );
}

function ProgressList({ title, items, icon: Icon, searchQuery, sortOption, onNavigate, theme }: { title: string, items: any[], icon: any, searchQuery: string, sortOption: SortOption, onNavigate: () => void, theme: 'red' | 'amber' | 'emerald' | 'blue' }) {
  const filteredItems = items.filter(i => 
    i.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (i.subtitle && i.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const sortedItems = [...filteredItems].sort((a, b) => {
    const result = a.title.localeCompare(b.title);
    return sortOption === 'title_asc' ? result : -result;
  });

  if (items.length === 0) return null;
  if (filteredItems.length === 0 && searchQuery) return null;

  const headerColors = {
    red: 'bg-red-50/50',
    amber: 'bg-amber-50/50',
    emerald: 'bg-emerald-50/50',
    blue: 'bg-blue-50/50',
  };

  const badgeColors = {
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${headerColors[theme]}`}>
        <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <Icon className={`w-4 h-4 text-${theme}-500`} />
          {title} 
          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${badgeColors[theme]}`}>{filteredItems.length}</span>
        </h4>
        <button onClick={onNavigate} className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm transition-all hover:bg-slate-50 text-${theme}-600`}>
          الإدارة والإصلاح
        </button>
      </div>
      <div className="divide-y divide-slate-50/80 max-h-64 overflow-y-auto custom-scrollbar p-1">
        {sortedItems.map(item => (
          <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl mx-1 my-0.5">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate mb-1" title={item.title}>{item.title}</div>
              {item.subtitle && <div className="text-xs font-medium text-slate-500 truncate" title={item.subtitle}>المرجع: {item.subtitle}</div>}
            </div>
            
            <div className="flex gap-2 shrink-0">
              {item.error && (
                <span className="text-[11px] font-bold px-2.5 py-1 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <XCircle className="w-3.5 h-3.5"/> {item.error}
                </span>
              )}
              {item.warning && (
                <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5"/> {item.warning}
                </span>
              )}
              {item.success && (
                <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5"/> {item.success}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
