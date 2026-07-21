import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { syncService } from '../services/sync/sync.service';
import { classifyAuthError, resolveErrorMessage } from '../lib/errors';
import type { User, AuthCredentials } from '../types';
import type { UserRegisterDto, ResetPasswordDto } from '../types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: AuthCredentials) => Promise<void>;
  signup: (payload: UserRegisterDto) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (payload: ResetPasswordDto) => Promise<string>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initializeFromStorage: () => {
    const user = authService.getStoredUser();
    const authenticated = authService.isAuthenticated();
    set({ user, isAuthenticated: authenticated });
    if (authenticated) {
      void syncService.syncAllData(true);
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.login(credentials);
      set({ user: session.user, isAuthenticated: true, isLoading: false, error: null });
      // Trigger instant cross-device data sync upon login
      void syncService.syncAllData(true);
    } catch (err) {
      const errorCode = classifyAuthError(err);
      set({ error: errorCode, isLoading: false });
    }
  },

  signup: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.signup(payload);
      set({ user: session.user, isAuthenticated: true, isLoading: false, error: null });
      void syncService.syncAllData(true);
    } catch (err) {
      const errorCode = classifyAuthError(err);
      set({ error: errorCode, isLoading: false });
      throw err;
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.forgotPassword({ email });
      set({ isLoading: false });
      return res.message;
    } catch (err) {
      const msg = resolveErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  resetPassword: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.resetPassword(payload);
      set({ isLoading: false });
      return res.message;
    } catch (err) {
      const msg = resolveErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  googleLogin: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.googleLogin({ idToken });
      set({ user: session.user, isAuthenticated: true, isLoading: false, error: null });
      void syncService.syncAllData(true);
    } catch (err) {
      const errorCode = classifyAuthError(err);
      set({ error: errorCode, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } finally {
      // Purge all domain stores to ensure no stale account data cross-contaminates
      syncService.clearAllStores();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  clearError: () => set({ error: null }),
}));

