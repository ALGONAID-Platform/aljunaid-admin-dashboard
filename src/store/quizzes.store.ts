import { create } from 'zustand';
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

export const useQuizzesStore = create<QuizzesState>()((set, get) => ({
  quizzes: [],
  isLoading: false,
  error: null,

  fetchQuizzes: async () => {
    set({ isLoading: true, error: null });
    try {
      const backendQuizzes = await quizService.getAll();
      set({ quizzes: backendQuizzes, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  addQuiz: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const newQuiz = await quizService.create(payload);
      set(state => ({ quizzes: [newQuiz, ...state.quizzes], isLoading: false }));
      return newQuiz;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  updateQuiz: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await quizService.update(payload);
      set(state => ({
        quizzes: state.quizzes.map(q => String(q.id) === String(payload.id) ? updated : q),
        isLoading: false
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  deleteQuiz: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await quizService.delete(id);
      set(state => ({
        quizzes: state.quizzes.filter(q => String(q.id) !== String(id)),
        isLoading: false
      }));
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
