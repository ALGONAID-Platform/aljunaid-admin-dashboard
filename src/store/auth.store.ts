import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { classifyAuthError } from '../lib/errors';
import type { User, AuthCredentials } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: AuthCredentials) => Promise<void>;
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
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.login(credentials);
      set({ user: session.user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      // Classify error into a known code — never expose raw server messages
      const errorCode = classifyAuthError(err);
      set({ error: errorCode, isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } finally {
      // Always clear state regardless of server response
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  clearError: () => set({ error: null }),
}));
