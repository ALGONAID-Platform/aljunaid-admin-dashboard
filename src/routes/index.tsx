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
const ContentPage = lazy(() =>
  import('../modules/contents/pages/ContentPage').then((m) => ({ default: m.ContentPage }))
);
const QuizPage = lazy(() =>
  import('../modules/quizzes/pages/QuizPage').then((m) => ({ default: m.QuizPage }))
);
const PublishPage = lazy(() =>
  import('../modules/publish/pages/PublishPage').then((m) => ({ default: m.PublishPage }))
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
          <Route path="content" element={<ContentPage />} />
          <Route path="quiz" element={<QuizPage />} />
          <Route path="publish" element={<PublishPage />} />
        </Routes>
      </Suspense>
    </MainDashboardLayout>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
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
          <Route path="/*" element={<DashboardRoutes />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
