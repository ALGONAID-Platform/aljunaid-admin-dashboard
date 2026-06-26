import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { modulesService } from '../services/api/modules.api';
import { resolveErrorMessage } from '../lib/errors';
import type { BackendModule, CreateModuleDto, UpdateModuleDto } from '../types/api';

interface ModulesState {
  modules: BackendModule[];
  isLoading: boolean;
  error: string | null;

  fetchModules: () => Promise<void>;
  addModule: (payload: CreateModuleDto) => Promise<BackendModule>;
  updateModule: (id: string | number, payload: UpdateModuleDto) => Promise<void>;
  deleteModule: (id: string | number) => Promise<void>;
  clearError: () => void;
}

export const useModulesStore = create<ModulesState>()(
  persist(
    (set, get) => ({
      modules: [],
      isLoading: false,
      error: null,

      fetchModules: async () => {
        set({ isLoading: true, error: null });
        try {
          const backendModules = await modulesService.getAll();
          set(state => {
            const drafts = state.modules.filter(m => String(m.id).startsWith('draft-'));
            return { modules: [...backendModules, ...drafts], isLoading: false };
          });
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
        }
      },

      addModule: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const newModule: BackendModule = {
            id: `draft-module-${Date.now()}` as any,
            courseId: payload.courseId,
            title: payload.title,
            description: payload.description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          (newModule as any)._draftPayload = payload;
          set(state => ({ modules: [...state.modules, newModule], isLoading: false }));
          return newModule;
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      updateModule: async (id, payload) => {
        set({ isLoading: true, error: null });
        try {
          if (String(id).startsWith('draft-')) {
            set(state => ({
              modules: state.modules.map(m => String(m.id) === String(id) ? { 
                ...m, 
                ...payload,
                _draftPayload: { ...(m as any)._draftPayload, ...payload } 
              } as BackendModule : m),
              isLoading: false
            }));
            return;
          }
          await modulesService.update(id, payload);
          await get().fetchModules();
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      deleteModule: async (id) => {
        set({ isLoading: true, error: null });
        try {
          if (String(id).startsWith('draft-')) {
            set(state => ({ modules: state.modules.filter(m => String(m.id) !== String(id)), isLoading: false }));
            return;
          }
          await modulesService.delete(id);
          await get().fetchModules();
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'draft-modules-storage',
      partialize: (state) => ({
        modules: state.modules.filter(m => String(m.id).startsWith('draft-'))
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        modules: [...currentState.modules, ...(persistedState.modules || [])]
      })
    }
  )
);
