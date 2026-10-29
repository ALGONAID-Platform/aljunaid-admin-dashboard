import { create } from 'zustand';
import { lessonService } from '../services/lesson.service';
import { resolveErrorMessage } from '../lib/errors';
import type { Lesson, CreateLessonPayload, UpdateLessonPayload } from '../types';

let latestFetchRequest = 0;
let lessonsMutationVersion = 0;
let latestFetchCourseId: string | undefined;

interface LessonsState {
  lessons: Lesson[];
  isLoading: boolean;
  error: string | null;

  fetchLessons: (courseId?: string) => Promise<void>;
  addLesson: (payload: CreateLessonPayload & { courseName: string; pdf?: File }, onUploadProgress?: (progressEvent: any) => void) => Promise<Lesson>;
  updateLesson: (payload: UpdateLessonPayload & { pdf?: File }, onUploadProgress?: (progressEvent: any) => void) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  togglePublish: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useLessonsStore = create<LessonsState>()((set, get) => ({
  lessons: [],
  isLoading: false,
  error: null,

  fetchLessons: async (courseId) => {
    latestFetchCourseId = courseId;
    const request = ++latestFetchRequest;
    const mutationVersion = lessonsMutationVersion;
    set({ isLoading: true, error: null });
    try {
      const backendLessons = courseId
        ? await lessonService.getByCourseId(courseId)
        : await lessonService.getAll();
      if (request !== latestFetchRequest) return;
      // A save may finish while this paginated fetch is in flight. Discarding
      // that response without retrying leaves the list stale until navigation.
      if (mutationVersion !== lessonsMutationVersion) {
        void get().fetchLessons(latestFetchCourseId);
        return;
      }
      set({ lessons: backendLessons, isLoading: false });
    } catch (err) {
      if (request === latestFetchRequest && mutationVersion !== lessonsMutationVersion) {
        void get().fetchLessons(latestFetchCourseId);
      } else if (request === latestFetchRequest) {
        set({ error: resolveErrorMessage(err), isLoading: false });
      }
    }
  },

  addLesson: async (payload, onUploadProgress) => {
    set({ isLoading: true, error: null });
    try {
      const newLesson = await lessonService.create(payload, onUploadProgress);
      lessonsMutationVersion += 1;
      set(state => ({ lessons: [newLesson, ...state.lessons], isLoading: false }));
      return newLesson;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  updateLesson: async (payload, onUploadProgress) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await lessonService.update(payload, onUploadProgress);
      lessonsMutationVersion += 1;
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
      lessonsMutationVersion += 1;
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
      lessonsMutationVersion += 1;
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
