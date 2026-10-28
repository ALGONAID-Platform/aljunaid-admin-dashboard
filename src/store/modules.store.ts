import { create } from 'zustand';
import { modulesService } from '../services/api/modules.api';
import { resolveErrorMessage } from '../lib/errors';
import type { BackendModule, CreateModuleDto, UpdateModuleDto } from '../types/api';

let latestModulesRequest = 0;

interface ModulesState {
  modules: BackendModule[];
  isLoading: boolean;
  error: string | null;

  fetchModules: () => Promise<void>;
  fetchModulesByCourse: (courseId: number | string) => Promise<void>;
  addModule: (payload: CreateModuleDto) => Promise<BackendModule>;
  updateModule: (id: string | number, payload: UpdateModuleDto) => Promise<void>;
  deleteModule: (id: string | number) => Promise<void>;
  clearError: () => void;
}


export const useModulesStore = create<ModulesState>()((set, get) => ({
  modules: [],
  isLoading: false,
  error: null,

  fetchModules: async () => {
    const request = ++latestModulesRequest;
    set({ isLoading: true, error: null });
    try {
      const backendModules = await modulesService.getAll();
      if (request !== latestModulesRequest) return;
      set({ modules: backendModules, isLoading: false });
    } catch (err) {
      if (request !== latestModulesRequest) return;
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  fetchModulesByCourse: async (courseId: number | string) => {
    const request = ++latestModulesRequest;
    set({ isLoading: true, error: null });
    try {
      const courseModules = await modulesService.getByCourse(courseId);
      if (request !== latestModulesRequest) return;
      set({ modules: courseModules, isLoading: false });
    } catch (err) {
      if (request !== latestModulesRequest) return;
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },


  addModule: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const newModule = await modulesService.create(payload);
      set(state => ({ modules: [newModule, ...state.modules], isLoading: false }));
      return newModule;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  updateModule: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await modulesService.update(id, payload);
      set(state => {
        // If the backend returns the updated module, use it. Otherwise, merge the payload with the existing module.
        const isFullModule = updated && updated.id;
        return {
          modules: state.modules.map(m => 
            String(m.id) === String(id) 
              ? (isFullModule ? updated : { ...m, ...payload }) 
              : m
          ),
          isLoading: false
        };
      });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  deleteModule: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await modulesService.delete(id);
      set(state => ({
        modules: state.modules.filter(m => String(m.id) !== String(id)),
        isLoading: false
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
