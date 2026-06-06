import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../store';
import { tokenStorage } from '../lib/api';
import { ROUTES } from './routes.config';

/**
 * ProtectedRoute
 *
 * Security checks (both required to pass):
 * 1. Zustand store isAuthenticated === true (set after successful login or initializeFromStorage)
 * 2. A real JWT token exists in tokenStorage (prevents edge case where store has
 *    stale isAuthenticated=true but token was deleted from another tab/window)
 *
 * On failure → hard redirect to /login.
 * The backend will reject requests with an invalid/expired token (401),
 * which the Axios interceptor converts to an automatic logout + redirect.
 */
export function ProtectedRoute() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const hasToken = Boolean(tokenStorage.get());

  if (!isAuthenticated || !hasToken) {
    return <Navigate to={ROUTES.login} replace />;
  }

  // Dashboard is only for admins and owners (backend roles: ADMIN, OWNER)
  // Backend has no 'teacher' role — it uses ADMIN for instructors
  if (user && user.role !== 'admin' && user.role !== 'owner') {
    logout();
    return <Navigate to={ROUTES.login} replace />;
  }

  return <Outlet />;
}
