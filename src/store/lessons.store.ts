import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

export const useLessonsStore = create<LessonsState>()(
  persist(
    (set, get) => ({
      lessons: [],
      isLoading: false,
      error: null,

      fetchLessons: async () => {
        set({ isLoading: true, error: null });
        try {
          const backendLessons = await lessonService.getAll();
          set(state => {
            const drafts = state.lessons.filter(l => String(l.id).startsWith('draft-'));
            return { lessons: [...backendLessons, ...drafts], isLoading: false };
          });
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
        }
      },

      addLesson: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const newLesson: Lesson = {
            id: `draft-lesson-${Date.now()}`,
            courseId: payload.courseId,
            courseName: payload.courseName,
            title: payload.title,
            description: payload.description || '',
            order: payload.order,
            isPublished: false,
            hasContent: false,
            createdAt: new Date().toISOString()
          };
          (newLesson as any)._draftPayload = payload;
          set(state => ({ lessons: [...state.lessons, newLesson], isLoading: false }));

          import('./courses.store').then(({ useCoursesStore }) => {
            useCoursesStore.setState(s => ({
              courses: s.courses.map(c => c.id === payload.courseId ? { ...c, lessonsCount: (c.lessonsCount || 0) + 1 } : c)
            }));
          });

          return newLesson;
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      updateLesson: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          if (String(payload.id).startsWith('draft-')) {
            set(state => ({
              lessons: state.lessons.map(l => l.id === payload.id ? { 
                ...l, 
                ...payload,
                _draftPayload: { ...(l as any)._draftPayload, ...payload } 
              } as Lesson : l),
              isLoading: false
            }));
            return;
          }
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
          const lessonToDelete = get().lessons.find(l => l.id === id);
          if (String(id).startsWith('draft-')) {
            set(state => ({ lessons: state.lessons.filter(l => l.id !== id), isLoading: false }));
          } else {
            await lessonService.delete(id);
            await get().fetchLessons();
          }

          if (lessonToDelete) {
            import('./courses.store').then(({ useCoursesStore }) => {
              useCoursesStore.setState(s => ({
                courses: s.courses.map(c => c.id === lessonToDelete.courseId ? { ...c, lessonsCount: Math.max(0, (c.lessonsCount || 1) - 1) } : c)
              }));
            });
          }
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
    }),
    {
      name: 'draft-lessons-storage',
      partialize: (state) => ({
        lessons: state.lessons.filter(l => String(l.id).startsWith('draft-'))
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        lessons: [...currentState.lessons, ...(persistedState.lessons || [])]
      })
    }
  )
);
