import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, NavLink, useParams, useNavigate } from 'react-router';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './routes.config';
import { MainDashboardLayout } from '../components/layout/MainDashboardLayout';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Loader } from '../components/feedback/Loader';
import { useAppData } from '../hooks/useAppData';
import { useCoursesStore, useLessonsStore, useModulesStore } from '../store';
import { BookOpen, ClipboardCheck, ClipboardList } from 'lucide-react';

// Lazy-loaded page components
const LoginPage = lazy(() =>
  import('../modules/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const DashboardHome = lazy(() =>
  import('../modules/dashboard/pages/DashboardHome').then((m) => ({ default: m.DashboardHome }))
);
const CoursesPage = lazy(() =>
  import('../modules/courses/pages/CoursesPage').then((m) => ({ default: m.CoursesPage }))
);
const LessonsPage = lazy(() =>
  import('../modules/lessons/pages/LessonsPage').then((m) => ({ default: m.LessonsPage }))
);

const ExamsDashboardPage = lazy(() =>
  import('../modules/exams/ExamsDashboardPage').then((m) => ({ default: m.ExamsDashboardPage }))
);
const ExamModelsPage = lazy(() =>
  import('../modules/examModels/pages/ExamModelsPage').then((m) => ({ default: m.ExamModelsPage }))
);
const PublishPage = lazy(() =>
  import('../modules/publish/pages/PublishPage').then((m) => ({ default: m.PublishPage }))
);
const AcademicProgressPage = lazy(() =>
  import('../modules/dashboard/pages/AcademicProgressPage').then((m) => ({ default: m.AcademicProgressPage }))
);
const MediaPage = lazy(() =>
  import('../modules/media/pages/MediaPage').then((m) => ({ default: m.default }))
);
const PaymentsPage = lazy(() =>
  import('../modules/payments/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage }))
);
const AssignmentsPage = lazy(() =>
  import('../modules/assignments/pages/AssignmentsPage').then((m) => ({ default: m.AssignmentsPage }))
);
const NotificationBroadcastPage = lazy(() =>
  import('../modules/notifications/pages/NotificationBroadcastPage').then((m) => ({ default: m.NotificationBroadcastPage }))
);

function CourseWorkspace() {
  const { courseId = '' } = useParams();
  const navigate = useNavigate();
  const { courses, fetchCourses } = useCoursesStore();
  useEffect(() => { if (!courses.length) void fetchCourses(); }, [courses.length, fetchCourses]);
  const selectedCourse = courses.find(course => String(course.id) === String(courseId));
  const tabs = [
    { path: 'lessons', label: 'الدروس' },
    { path: 'exams', label: 'الاختبارات' },
    { path: 'assignments', label: 'الواجبات والتسليمات' },
    { path: 'exam-models', label: 'نماذج الامتحانات' },
  ];
  return <section dir="rtl" className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-4">
      <div><h2 className="text-lg font-black text-slate-900">{selectedCourse?.title ?? 'محتوى المقرر'}</h2><p className="mt-1 text-sm text-slate-500">اختر مقرراً آخر لعرض دروسه ومحتواه.</p></div>
      <label className="min-w-64 text-sm font-bold text-slate-700">المقرر
        <select aria-label="اختيار المقرر" value={courseId} onChange={event => { const nextCourseId = event.target.value; if (nextCourseId) navigate(`/admin/courses/${nextCourseId}/lessons`); }} className="mt-1.5 w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
          <option value="" disabled>اختر مقرراً</option>
          {courses.map(course => <option key={course.id} value={String(course.id)}>{course.title}</option>)}
        </select>
      </label>
    </header>
    <nav aria-label="أقسام المقرر" className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3">
      {tabs.map(tab => <NavLink key={tab.path} to={tab.path} className={({ isActive }) => `rounded-xl px-4 py-2 text-sm font-bold ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{tab.label}</NavLink>)}
    </nav>
    <Outlet />
  </section>;
}

function CourseLessonsRoute() { const { courseId = '' } = useParams(); return <LessonsPage key={courseId} scopedCourseId={courseId} />; }
function CourseExamsRoute() { const { courseId = '' } = useParams(); return <ExamsDashboardPage scopedCourseId={courseId} />; }
function CourseAssignmentsRoute() { const { courseId = '' } = useParams(); return <AssignmentsPage key={courseId} scopedCourseId={courseId} />; }
function CourseExamModelsRoute() { const { courseId = '' } = useParams(); return <ExamModelsPage key={courseId} scopedCourseId={courseId} />; }

function LessonWorkspace() {
  const { lessonId = '' } = useParams();
  const { lessons, fetchLessons } = useLessonsStore();
  const navigate = useNavigate();
  useEffect(() => { if (!lessons.length) void fetchLessons(); }, [lessons.length, fetchLessons]);
  const lesson = lessons.find(item => String(item.id) === String(lessonId));
  const tabs = [
    { path: 'content', label: 'محتوى الدرس', icon: BookOpen },
    { path: 'exam', label: 'الاختبار', icon: ClipboardList },
    { path: 'assignment', label: 'الواجب', icon: ClipboardCheck },
  ];
  return <section dir="rtl" className="space-y-5">
    <header className="rounded-2xl border bg-white p-4"><button onClick={() => navigate(-1)} className="mb-2 text-sm font-bold text-emerald-700">العودة إلى الدروس</button><h2 className="text-xl font-black text-slate-900">{lesson?.title ?? `الدرس ${lessonId}`}</h2><p className="mt-1 text-sm text-slate-500">إدارة محتوى الدرس واختباره وواجبه من مكان واحد.</p></header>
    <nav aria-label="أقسام الدرس" className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3">
      {tabs.map(tab => <NavLink key={tab.path} to={tab.path} className={({ isActive }) => `inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><tab.icon size={16}/>{tab.label}</NavLink>)}
    </nav>
    <Outlet />
  </section>;
}

function LessonContentRoute() { const { lessonId = '' } = useParams(); return <LessonsPage key={lessonId} scopedLessonId={lessonId} />; }
function LessonExamRoute() { const { lessonId = '' } = useParams(); return <LessonExamPage lessonId={lessonId} />; }
function LessonAssignmentRoute() { const { lessonId = '' } = useParams(); return <AssignmentsPage key={lessonId} scopedLessonId={lessonId} />; }

function LessonExamPage({ lessonId }: { lessonId: string }) {
  const { lessons, fetchLessons } = useLessonsStore();
  const lesson = lessons.find(item => String(item.id) === String(lessonId));
  const { modules, fetchModules } = useModulesStore();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([lessons.length ? Promise.resolve() : fetchLessons(), modules.length ? Promise.resolve() : fetchModules()])
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId, lessons.length, modules.length, fetchLessons, fetchModules]);
  if (loading) return <div className="rounded-2xl border bg-white p-8 text-center">جارٍ تحميل اختبار الدرس…</div>;
  if (!lesson) return <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">الدرس غير موجود أو لم يتم تحميله.</div>;
  const moduleId = String(lesson.courseId);
  const courseId = String(modules.find(item => String(item.id) === moduleId)?.courseId ?? '');
  return <ExamsDashboardPage key={lessonId} scopedCourseId={courseId} scopedLessonId={lessonId} />;
}


const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-64">
    <Loader />
  </div>
);

function DashboardRoutes() {
  // Initialize all data when authenticated
  useAppData();

  return (
    <MainDashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="lessons" element={<LessonsPage />} />

          <Route path="quiz" element={<ExamsDashboardPage />} />
          <Route path="exam-models" element={<ExamModelsPage />} />
          <Route path="publish" element={<PublishPage />} />
          <Route path="progress" element={<AcademicProgressPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="courses/:courseId" element={<CourseWorkspace />}>
            <Route index element={<Navigate to="lessons" replace />} />
            <Route path="lessons" element={<CourseLessonsRoute />} />
            <Route path="exams" element={<CourseExamsRoute />} />
            <Route path="assignments" element={<CourseAssignmentsRoute />} />
            <Route path="exam-models" element={<CourseExamModelsRoute />} />
          </Route>
          <Route path="lessons/:lessonId" element={<LessonWorkspace />}>
            <Route index element={<Navigate to="content" replace />} />
            <Route path="content" element={<LessonContentRoute />} />
            <Route path="exam" element={<LessonExamRoute />} />
            <Route path="assignment" element={<LessonAssignmentRoute />} />
          </Route>
          <Route path="notifications" element={<NotificationBroadcastPage />} />
        </Routes>
      </Suspense>
    </MainDashboardLayout>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={ROUTES.home}
          element={<Navigate to={ROUTES.dashboard} replace />}
        />

        {/* Public auth routes */}
        <Route
          path={ROUTES.login}
          element={
            <AuthLayout>
              <Suspense fallback={<PageLoader />}>
                <LoginPage />
              </Suspense>
            </AuthLayout>
          }
        />

        {/* Protected dashboard routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/*" element={<DashboardRoutes />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
