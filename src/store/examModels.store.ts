import { create } from 'zustand';
import { examModelsService } from '../services/api/examModels.service';
import { resolveErrorMessage } from '../lib/errors';
import type { 
  ExamModel, 
  CreateExamModelPayload, 
  UpdateExamModelPayload, 
  ExamModelFilterOptions 
} from '../types/examModel.types';

interface ExamModelsState {
  examModels: ExamModel[];
  isLoading: boolean;
  error: string | null;
  filters: ExamModelFilterOptions;

  fetchExamModels: (options?: ExamModelFilterOptions) => Promise<void>;
  fetchByCourse: (courseId: string | number) => Promise<ExamModel[]>;
  fetchByModule: (moduleId: string | number) => Promise<ExamModel[]>;
  addExamModel: (payload: CreateExamModelPayload) => Promise<ExamModel>;
  updateExamModel: (payload: UpdateExamModelPayload) => Promise<ExamModel>;
  deleteExamModel: (id: string) => Promise<void>;
  togglePublish: (id: string) => Promise<void>;
  bulkPublish: (ids: string[], isPublished: boolean) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  setFilters: (newFilters: Partial<ExamModelFilterOptions>) => void;
  resetFilters: () => void;
  clearError: () => void;
}

const DEFAULT_FILTERS: ExamModelFilterOptions = {
  searchQuery: '',
  category: 'ALL',
  contentType: 'ALL',
  courseId: 'ALL',
  moduleId: 'ALL',
  isPublished: 'ALL',
  semester: 'ALL',
  academicYear: 'ALL',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const useExamModelsStore = create<ExamModelsState>()((set, get) => ({
  examModels: [],
  isLoading: false,
  error: null,
  filters: DEFAULT_FILTERS,

  fetchExamModels: async (options) => {
    set({ isLoading: true, error: null });
    try {
      const mergedFilters = { ...get().filters, ...options };
      const data = await examModelsService.getAll(mergedFilters);
      set({ examModels: data, filters: mergedFilters, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  fetchByCourse: async (courseId) => {
    try {
      return await examModelsService.getByCourse(courseId);
    } catch (err) {
      console.error('Error fetching exam models for course:', err);
      return [];
    }
  },

  fetchByModule: async (moduleId) => {
    try {
      return await examModelsService.getByModule(moduleId);
    } catch (err) {
      console.error('Error fetching exam models for module:', err);
      return [];
    }
  },

  addExamModel: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const created = await examModelsService.create(payload);
      set((state) => ({
        examModels: [created, ...state.examModels],
        isLoading: false,
      }));
      return created;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  updateExamModel: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await examModelsService.update(payload);
      set((state) => ({
        examModels: state.examModels.map((item) =>
          String(item.id) === String(payload.id) ? updated : item
        ),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  deleteExamModel: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await examModelsService.delete(id);
      set((state) => ({
        examModels: state.examModels.filter((item) => String(item.id) !== String(id)),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  togglePublish: async (id) => {
    const currentItem = get().examModels.find((x) => String(x.id) === String(id));
    if (!currentItem) return;

    const newPublishState = !currentItem.isPublished;

    // Optimistic update
    set((state) => ({
      examModels: state.examModels.map((item) =>
        String(item.id) === String(id) ? { ...item, isPublished: newPublishState } : item
      ),
    }));

    try {
      await examModelsService.publish(id, newPublishState);
    } catch (err) {
      // Revert optimistic update
      set((state) => ({
        examModels: state.examModels.map((item) =>
          String(item.id) === String(id) ? { ...item, isPublished: !newPublishState } : item
        ),
        error: resolveErrorMessage(err),
      }));
    }
  },

  bulkPublish: async (ids, isPublished) => {
    set({ isLoading: true, error: null });
    try {
      await examModelsService.bulkPublish(ids, isPublished);
      const idSet = new Set(ids.map(String));
      set((state) => ({
        examModels: state.examModels.map((item) =>
          idSet.has(String(item.id)) ? { ...item, isPublished } : item
        ),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  bulkDelete: async (ids) => {
    set({ isLoading: true, error: null });
    try {
      await examModelsService.bulkDelete(ids);
      const idSet = new Set(ids.map(String));
      set((state) => ({
        examModels: state.examModels.filter((item) => !idSet.has(String(item.id))),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  setFilters: (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    set({ filters });
    void get().fetchExamModels(filters);
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
    void get().fetchExamModels(DEFAULT_FILTERS);
  },

  clearError: () => set({ error: null }),
}));
