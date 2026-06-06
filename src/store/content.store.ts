import { create } from 'zustand';
import { contentService } from '../services/content.service';
import { resolveErrorMessage } from '../lib/errors';
import type { ContentItem, CreateContentPayload } from '../types';

interface ContentState {
  content: ContentItem[];
  isLoading: boolean;
  error: string | null;

  fetchContent: () => Promise<void>;
  addContent: (
    payload: CreateContentPayload & { lessonTitle: string }
  ) => Promise<ContentItem>;
  deleteContent: (id: string) => Promise<void>;
  retryUpload: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useContentStore = create<ContentState>((set, get) => ({
  content: [],
  isLoading: false,
  error: null,

  fetchContent: async () => {
    set({ isLoading: true, error: null });
    try {
      const content = await contentService.getAll();
      set({ content, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  addContent: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const newItem = await contentService.create(payload);
      await get().fetchContent();
      return newItem;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  deleteContent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await contentService.delete(id);
      await get().fetchContent();
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  retryUpload: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await contentService.retryUpload(id);
      await get().fetchContent();
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
