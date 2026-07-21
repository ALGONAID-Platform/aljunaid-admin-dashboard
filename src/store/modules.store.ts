import { create } from 'zustand';
import { modulesService } from '../services/api/modules.api';
import { resolveErrorMessage } from '../lib/errors';
import type { BackendModule, CreateModuleDto, UpdateModuleDto } from '../types/api';

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
    set({ isLoading: true, error: null });
    try {
      const backendModules = await modulesService.getAll();
      set({ modules: backendModules, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  fetchModulesByCourse: async (courseId: number | string) => {
    set({ isLoading: true, error: null });
    try {
      const courseModules = await modulesService.getByCourse(courseId);
      set({ modules: courseModules, isLoading: false });
    } catch (err) {
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
      set(state => ({
        modules: state.modules.map(m => String(m.id) === String(id) ? updated : m),
        isLoading: false
      }));
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
