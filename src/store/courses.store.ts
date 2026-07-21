import { create } from 'zustand';
import { courseService } from '../services/course.service';
import { resolveErrorMessage } from '../lib/errors';
import type { Course, CreateCoursePayload, UpdateCoursePayload } from '../types';

interface CoursesState {
  courses: Course[];
  isLoading: boolean;
  error: string | null;

  fetchCourses: () => Promise<void>;
  searchCourses: (query: string) => Promise<void>;
  addCourse: (payload: CreateCoursePayload & { imageFile?: File }, onProgress?: (p: any) => void) => Promise<Course>;
  updateCourse: (payload: UpdateCoursePayload & { imageFile?: File }, onProgress?: (p: any) => void) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  clearError: () => void;
}


export const useCoursesStore = create<CoursesState>()((set, get) => ({
  courses: [],
  isLoading: false,
  error: null,

  fetchCourses: async () => {
    set({ isLoading: true, error: null });
    try {
      const backendCourses = await courseService.getAll();
      set({ courses: backendCourses, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  searchCourses: async (query: string) => {
    set({ isLoading: true, error: null });
    try {
      const results = query.trim()
        ? await courseService.search(query.trim())
        : await courseService.getAll();
      set({ courses: results, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },


  addCourse: async (payload, onProgress) => {
    set({ isLoading: true, error: null });
    try {
      const newCourse = await courseService.create(payload, onProgress);
      set(state => ({ courses: [newCourse, ...state.courses], isLoading: false }));
      return newCourse;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  updateCourse: async (payload, onProgress) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await courseService.update(payload, onProgress);
      set(state => ({
        courses: state.courses.map(c => String(c.id) === String(payload.id) ? updated : c),
        isLoading: false
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  deleteCourse: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await courseService.delete(id);
      set(state => ({
        courses: state.courses.filter(c => String(c.id) !== String(id)),
        isLoading: false
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
