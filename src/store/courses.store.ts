import { create } from 'zustand';
import { courseService } from '../services/course.service';
import { resolveErrorMessage } from '../lib/errors';
import type { Course, CreateCoursePayload, UpdateCoursePayload } from '../types';

interface CoursesState {
  courses: Course[];
  isLoading: boolean;
  error: string | null;

  fetchCourses: () => Promise<void>;
  addCourse: (payload: CreateCoursePayload) => Promise<Course>;
  updateCourse: (payload: UpdateCoursePayload) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useCoursesStore = create<CoursesState>((set, get) => ({
  courses: [],
  isLoading: false,
  error: null,

  fetchCourses: async () => {
    set({ isLoading: true, error: null });
    try {
      const courses = await courseService.getAll();
      set({ courses, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  addCourse: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const newCourse = await courseService.create(payload);
      await get().fetchCourses(); // Sync with backend immediately
      return newCourse;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  updateCourse: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await courseService.update(payload);
      await get().fetchCourses(); // Sync with backend
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  deleteCourse: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await courseService.delete(id);
      await get().fetchCourses(); // Sync with backend
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
