import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { quizService } from '../services/quiz.service';
import { resolveErrorMessage } from '../lib/errors';
import type { Quiz, CreateQuizPayload, UpdateQuizPayload } from '../types';

interface QuizzesState {
  quizzes: Quiz[];
  isLoading: boolean;
  error: string | null;

  fetchQuizzes: () => Promise<void>;
  addQuiz: (
    payload: CreateQuizPayload & { courseName: string; lessonTitle: string }
  ) => Promise<Quiz>;
  updateQuiz: (payload: UpdateQuizPayload) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useQuizzesStore = create<QuizzesState>()(
  persist(
    (set, get) => ({
      quizzes: [],
      isLoading: false,
      error: null,

      fetchQuizzes: async () => {
        set({ isLoading: true, error: null });
        try {
          const backendQuizzes = await quizService.getAll();
          set(state => {
            const drafts = state.quizzes.filter(q => String(q.id).startsWith('draft-'));
            return { quizzes: [...backendQuizzes, ...drafts], isLoading: false };
          });
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
        }
      },

      addQuiz: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const newQuiz: Quiz = {
            id: `draft-quiz-${Date.now()}`,
            lessonId: payload.lessonId,
            courseName: payload.courseName,
            lessonTitle: payload.lessonTitle,
            title: payload.title,
            questionsCount: payload.questions.length,
            timeLimit: payload.timeLimit,
            questions: payload.questions,
            createdAt: new Date().toISOString()
          } as Quiz;
          (newQuiz as any)._draftPayload = payload;
          set(state => ({ quizzes: [...state.quizzes, newQuiz], isLoading: false }));
          return newQuiz;
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      updateQuiz: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          if (String(payload.id).startsWith('draft-')) {
            set(state => ({
              quizzes: state.quizzes.map(q => q.id === payload.id ? { 
                ...q, 
                ...payload,
                questionsCount: payload.questions ? payload.questions.length : q.questionsCount,
                _draftPayload: { ...(q as any)._draftPayload, ...payload } 
              } as Quiz : q),
              isLoading: false
            }));
            return;
          }
          await quizService.update(payload);
          await get().fetchQuizzes();
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      deleteQuiz: async (id) => {
        set({ isLoading: true, error: null });
        try {
          if (String(id).startsWith('draft-')) {
            set(state => ({ quizzes: state.quizzes.filter(q => q.id !== id), isLoading: false }));
            return;
          }
          await quizService.delete(id);
          await get().fetchQuizzes();
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'draft-quizzes-storage',
      partialize: (state) => ({
        quizzes: state.quizzes.filter(q => String(q.id).startsWith('draft-'))
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        quizzes: [...currentState.quizzes, ...(persistedState.quizzes || [])]
      })
    }
  )
);
