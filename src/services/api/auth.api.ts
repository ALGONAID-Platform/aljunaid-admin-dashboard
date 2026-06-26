/**
 * Auth API Service — src/services/api/auth.api.ts
 *
 * Replaces: src/services/auth.service.ts (mock)
 * Endpoints:
 *   POST /auth/signin
 *   POST /auth/logout
 *   GET  /users/profile
 */

import { api, tokenStorage, userStorage } from '../../lib/api';
import type {
  BackendSigninResponse,
  BackendProfile,
} from '../../types/api';
import type { AuthCredentials, AuthSession, User } from '../../types';

// ─── Adapter: Backend User → Frontend User ────────────────────────────────────

function adaptUser(backendUser: BackendProfile): User {
  return {
    id: String(backendUser.id),
    name: backendUser.name,
    email: backendUser.email,
    // Backend uses STUDENT/TEACHER/ADMIN — map to lowercase frontend roles
    role: backendUser.role.toLowerCase() as User['role'],
    avatarUrl: backendUser.avatarUrl,
    isActive: true,
    createdAt: backendUser.createdAt ?? new Date().toISOString(),
  };
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Sign in with email + password.
   * Backend: POST /auth/signin
   * Response: { message, data: { user, accessToken } }
   */
  async login(credentials: AuthCredentials): Promise<AuthSession> {
    const { data } = await api.post<any>('/auth/signin', {
      email: credentials.email,
      password: credentials.password,
    });

    const payload = data.data ?? data;
    const backendUser = payload.user;
    const accessToken = payload.accessToken ?? payload.access_token;
    if (!backendUser || !accessToken) {
      throw new Error('Invalid authentication response');
    }
    const user = adaptUser(backendUser as BackendProfile);

    // Persist JWT and user profile
    tokenStorage.set(accessToken);
    userStorage.set(user);

    const session: AuthSession = {
      user,
      token: accessToken,
      // Backend does not return expiry — set a sensible client-side default
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return session;
  },

  /**
   * Logout — invalidate token on backend.
   * Backend: POST /auth/logout
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      // Always clear local storage regardless of server response
      tokenStorage.remove();
      userStorage.remove();
    }
  },

  /**
   * Fetch current user profile.
   * Backend: GET /users/profile
   */
  async getProfile(): Promise<User> {
    const { data } = await api.get<{ data?: BackendProfile } | BackendProfile>('/users/profile');
    // Handle both wrapped { data: ... } and unwrapped responses
    const profile = (data as { data?: BackendProfile }).data ?? (data as BackendProfile);
    return adaptUser(profile);
  },

  /** Check localStorage for a valid token */
  isAuthenticated(): boolean {
    return !!tokenStorage.get();
  },

  /** Retrieve cached user from localStorage */
  getStoredUser(): User | null {
    return userStorage.get<User>();
  },
};
