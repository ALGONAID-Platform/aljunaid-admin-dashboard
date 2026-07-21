import { create } from 'zustand';
import { lessonService } from '../services/lesson.service';
import { resolveErrorMessage } from '../lib/errors';
import type { Lesson, CreateLessonPayload, UpdateLessonPayload } from '../types';

interface LessonsState {
  lessons: Lesson[];
  isLoading: boolean;
  error: string | null;

  fetchLessons: () => Promise<void>;
  addLesson: (payload: CreateLessonPayload & { courseName: string; pdf?: File }) => Promise<Lesson>;
  updateLesson: (payload: UpdateLessonPayload & { pdf?: File }) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  togglePublish: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useLessonsStore = create<LessonsState>()((set, get) => ({
  lessons: [],
  isLoading: false,
  error: null,

  fetchLessons: async () => {
    set({ isLoading: true, error: null });
    try {
      const backendLessons = await lessonService.getAll();
      set({ lessons: backendLessons, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  addLesson: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const newLesson = await lessonService.create(payload);
      set(state => ({ lessons: [newLesson, ...state.lessons], isLoading: false }));
      return newLesson;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  updateLesson: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await lessonService.update(payload);
      set(state => ({
        lessons: state.lessons.map(l => String(l.id) === String(payload.id) ? updated : l),
        isLoading: false
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  deleteLesson: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await lessonService.delete(id);
      set(state => ({
        lessons: state.lessons.filter(l => String(l.id) !== String(id)),
        isLoading: false
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  togglePublish: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await lessonService.togglePublish(id);
      set(state => ({
        lessons: state.lessons.map(l => String(l.id) === String(id) ? updated : l),
        isLoading: false
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },


  clearError: () => set({ error: null }),
}));
