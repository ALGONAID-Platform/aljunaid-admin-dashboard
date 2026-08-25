import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './routes.config';
import { MainDashboardLayout } from '../components/layout/MainDashboardLayout';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Loader } from '../components/feedback/Loader';
import { useAppData } from '../hooks/useAppData';

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

const QuizPage = lazy(() =>
  import('../modules/quizzes/pages/QuizPage').then((m) => ({ default: m.QuizPage }))
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

          <Route path="quiz" element={<QuizPage />} />
          <Route path="exam-models" element={<ExamModelsPage />} />
          <Route path="publish" element={<PublishPage />} />
          <Route path="progress" element={<AcademicProgressPage />} />
          <Route path="media" element={<MediaPage />} />
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
