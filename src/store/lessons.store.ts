import { create } from 'zustand';
import { lessonService } from '../services/lesson.service';
import { resolveErrorMessage } from '../lib/errors';
import type { Lesson, CreateLessonPayload, UpdateLessonPayload } from '../types';

interface LessonsState {
  lessons: Lesson[];
  isLoading: boolean;
  error: string | null;

  fetchLessons: () => Promise<void>;
  addLesson: (payload: CreateLessonPayload & { courseName: string }) => Promise<Lesson>;
  updateLesson: (payload: UpdateLessonPayload) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  togglePublish: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useLessonsStore = create<LessonsState>((set, get) => ({
  lessons: [],
  isLoading: false,
  error: null,

  fetchLessons: async () => {
    set({ isLoading: true, error: null });
    try {
      const lessons = await lessonService.getAll();
      set({ lessons, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  addLesson: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const newLesson = await lessonService.create(payload);
      await get().fetchLessons();
      return newLesson;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  updateLesson: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await lessonService.update(payload);
      await get().fetchLessons();
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  deleteLesson: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await lessonService.delete(id);
      await get().fetchLessons();
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  togglePublish: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await lessonService.togglePublish(id);
      await get().fetchLessons();
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
