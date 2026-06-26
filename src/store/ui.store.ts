import { create } from 'zustand';

interface UIState {
  isSidebarCollapsed: boolean;
  activeModal: string | null;
  toastQueue: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  activeModal: null,
  toastQueue: [],

  toggleSidebar: () =>
    set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

  setSidebarCollapsed: (collapsed) =>
    set({ isSidebarCollapsed: collapsed }),

  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  addToast: (message, type = 'info') =>
    set((s) => ({
      toastQueue: [
        ...s.toastQueue,
        { id: Date.now().toString(), message, type },
      ],
    })),

  removeToast: (id) =>
    set((s) => ({ toastQueue: s.toastQueue.filter((t) => t.id !== id) })),
}));
