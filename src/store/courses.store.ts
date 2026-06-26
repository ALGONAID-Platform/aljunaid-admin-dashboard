import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { courseService } from '../services/course.service';
import { resolveErrorMessage } from '../lib/errors';
import type { Course, CreateCoursePayload, UpdateCoursePayload } from '../types';

interface CoursesState {
  courses: Course[];
  isLoading: boolean;
  error: string | null;

  fetchCourses: () => Promise<void>;
  addCourse: (payload: CreateCoursePayload, onProgress?: (p: any) => void) => Promise<Course>;
  updateCourse: (payload: UpdateCoursePayload, onProgress?: (p: any) => void) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set, get) => ({
      courses: [],
      isLoading: false,
      error: null,

      fetchCourses: async () => {
        set({ isLoading: true, error: null });
        try {
          const backendCourses = await courseService.getAll();
          set(state => {
            const drafts = state.courses.filter(c => String(c.id).startsWith('draft-'));
            return { courses: [...backendCourses, ...drafts], isLoading: false };
          });
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
        }
      },

      addCourse: async (payload, onProgress) => {
        set({ isLoading: true, error: null });
        try {
          const newCourse: Course = {
            id: `draft-course-${Date.now()}`,
            name: payload.name,
            description: payload.description,
            thumbnailUrl: (payload as any).thumbnail ? URL.createObjectURL((payload as any).thumbnail) : undefined,
            status: 'draft',
            createdAt: new Date().toISOString(),
            lessonsCount: 0,
            modulesCount: 0,
            instructorsCount: 1,
            enrolledCount: 0
          } as Course;
          (newCourse as any)._draftPayload = payload;
          set(state => ({ courses: [...state.courses, newCourse], isLoading: false }));
          return newCourse;
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      updateCourse: async (payload, onProgress) => {
        set({ isLoading: true, error: null });
        try {
          if (String(payload.id).startsWith('draft-')) {
            set(state => ({
              courses: state.courses.map(c => c.id === payload.id ? { 
                ...c, 
                ...payload, 
                thumbnailUrl: (payload as any).thumbnail ? URL.createObjectURL((payload as any).thumbnail) : (c as any).thumbnailUrl,
                _draftPayload: { ...(c as any)._draftPayload, ...payload }
              } as Course : c),
              isLoading: false
            }));
            return;
          }
          await courseService.update(payload, onProgress);
          await get().fetchCourses();
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      deleteCourse: async (id) => {
        set({ isLoading: true, error: null });
        try {
          if (String(id).startsWith('draft-')) {
            set(state => ({ courses: state.courses.filter(c => c.id !== id), isLoading: false }));
            return;
          }
          await courseService.delete(id);
          await get().fetchCourses();
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'draft-courses-storage',
      partialize: (state) => ({
        courses: state.courses.filter(c => String(c.id).startsWith('draft-'))
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        courses: [...currentState.courses, ...(persistedState.courses || [])]
      })
    }
  )
);
