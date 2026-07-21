import { create } from 'zustand';
import { contentService } from '../services/content.service';
import { resolveErrorMessage } from '../lib/errors';
import type { ContentItem, CreateContentPayload } from '../types';

interface ContentState {
  content: ContentItem[];
  isLoading: boolean;
  error: string | null;

  fetchContent: () => Promise<void>;
  addContent: (payload: CreateContentPayload & { lessonTitle: string }, onProgress?: (p: any) => void) => Promise<ContentItem>;
  updateContent: (id: string, payload: Partial<CreateContentPayload> & { lessonTitle?: string }, onProgress?: (p: any) => void) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  retryUpload: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useContentStore = create<ContentState>()((set, get) => ({
  content: [],
  isLoading: false,
  error: null,

  fetchContent: async () => {
    set({ isLoading: true, error: null });
    try {
      const backendContent = await contentService.getAll();
      set({ content: backendContent, isLoading: false });
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
    }
  },

  addContent: async (payload, onProgress) => {
    set({ isLoading: true, error: null });
    try {
      const newItem = await contentService.create(payload, onProgress);
      set(state => ({ content: [newItem, ...state.content], isLoading: false }));
      return newItem;
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  updateContent: async (id, payload, onProgress) => {
    set({ isLoading: true, error: null });
    try {
      await contentService.create({
        ...payload,
        lessonId: id.split('-')[1] || id,
        type: payload.type as any,
        title: payload.title || '',
        lessonTitle: payload.lessonTitle || '',
      }, onProgress);
      await get().fetchContent();
    } catch (err) {
      set({ error: resolveErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  deleteContent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await contentService.delete(id);
      set(state => ({
        content: state.content.filter(c => String(c.id) !== String(id)),
        isLoading: false
      }));
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
    }
  },

  clearError: () => set({ error: null }),
}));
