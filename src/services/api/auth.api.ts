/**
 * Auth API Service — src/services/api/auth.api.ts
 *
 * Endpoints:
 *   POST /auth/signin
 *   POST /auth/signup
 *   POST /auth/forgot-password
 *   POST /auth/reset-password
 *   POST /auth/google/mobile
 *   POST /auth/logout
 *   GET  /users/profile
 */

import { api, tokenStorage, userStorage } from '../../lib/api';
import type {
  BackendSigninResponse,
  BackendSignupResponse,
  BackendProfile,
  UserRegisterDto,
  UserLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  GoogleMobileLoginDto,
  AuthMessageResponse,
} from '../../types/api';
import type { AuthCredentials, AuthSession, User } from '../../types';

// ─── Adapter: Backend User → Frontend User ────────────────────────────────────

function adaptUser(backendUser: BackendProfile): User {
  return {
    id: String(backendUser.id),
    name: backendUser.name,
    email: backendUser.email,
    // Backend uses STUDENT/TEACHER/ADMIN/OWNER — map to lowercase frontend roles
    role: backendUser.role.toLowerCase() as User['role'],
    avatarUrl: backendUser.avatarUrl ?? undefined,
    isActive: true,
    createdAt: backendUser.createdAt ?? new Date().toISOString(),
  };
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Sign in with email + password.
   * Backend: POST /auth/signin
   * Response: { message, user, access_token }
   */
  async login(credentials: AuthCredentials): Promise<AuthSession> {
    const { data } = await api.post<BackendSigninResponse>('/auth/signin', {
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
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return session;
  },

  /**
   * Register a new user account.
   * Backend: POST /auth/signup
   * Request Body: UserRegisterDto
   */
  async signup(payload: UserRegisterDto): Promise<AuthSession> {
    const { data } = await api.post<BackendSignupResponse>('/auth/signup', payload);

    const responsePayload = data.data ?? data;
    const backendUser = responsePayload.user;
    const accessToken = responsePayload.accessToken ?? responsePayload.access_token;

    if (!backendUser || !accessToken) {
      throw new Error('Invalid signup response');
    }

    const user = adaptUser(backendUser as BackendProfile);
    tokenStorage.set(accessToken);
    userStorage.set(user);

    return {
      user,
      token: accessToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  },

  /**
   * Request password reset token via email.
   * Backend: POST /auth/forgot-password
   */
  async forgotPassword(payload: ForgotPasswordDto): Promise<AuthMessageResponse> {
    const { data } = await api.post<AuthMessageResponse>('/auth/forgot-password', payload);
    return data;
  },

  /**
   * Reset account password using reset token.
   * Backend: POST /auth/reset-password
   */
  async resetPassword(payload: ResetPasswordDto): Promise<AuthMessageResponse> {
    const { data } = await api.post<AuthMessageResponse>('/auth/reset-password', payload);
    return data;
  },

  /**
   * Mobile/OAuth Google login via ID token.
   * Backend: POST /auth/google/mobile
   */
  async googleLogin(payload: GoogleMobileLoginDto): Promise<AuthSession> {
    const { data } = await api.post<BackendSigninResponse>('/auth/google/mobile', payload);

    const responsePayload = data.data ?? data;
    const backendUser = responsePayload.user;
    const accessToken = responsePayload.accessToken ?? responsePayload.access_token;

    if (!backendUser || !accessToken) {
      throw new Error('Invalid Google authentication response');
    }

    const user = adaptUser(backendUser as BackendProfile);
    tokenStorage.set(accessToken);
    userStorage.set(user);

    return {
      user,
      token: accessToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  },

  /**
   * Logout — invalidate token on backend token blacklist table.
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

