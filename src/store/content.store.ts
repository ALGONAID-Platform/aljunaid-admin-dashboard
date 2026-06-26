import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { contentService } from '../services/content.service';
import { resolveErrorMessage } from '../lib/errors';
import type { ContentItem, CreateContentPayload, UpdateContentPayload } from '../types';

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

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      content: [],
      isLoading: false,
      error: null,

      fetchContent: async () => {
        set({ isLoading: true, error: null });
        try {
          const backendContent = await contentService.getAll();
          set(state => {
            const drafts = state.content.filter(c => String(c.id).startsWith('draft-'));
            return { content: [...backendContent, ...drafts], isLoading: false };
          });
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
        }
      },

      addContent: async (payload, onProgress) => {
        set({ isLoading: true, error: null });
        try {
          const newItem: ContentItem = {
            id: `draft-content-${Date.now()}`,
            lessonId: payload.lessonId,
            lessonTitle: payload.lessonTitle,
            title: payload.title,
            type: payload.type as any,
            url: payload.url,
            fileName: payload.file ? payload.file.name : undefined,
            fileSize: payload.file ? `${(payload.file.size / (1024 * 1024)).toFixed(2)} MB` : undefined,
            status: 'ready',
            createdAt: new Date().toISOString()
          };
          (newItem as any)._draftPayload = payload;
          set(state => ({ content: [...state.content, newItem], isLoading: false }));
          return newItem;
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      updateContent: async (id, payload, onProgress) => {
        set({ isLoading: true, error: null });
        try {
          if (String(id).startsWith('draft-')) {
            set(state => ({
              content: state.content.map(c => c.id === id ? { 
                ...c, 
                ...payload, 
                lessonTitle: payload.lessonTitle || c.lessonTitle,
                _draftPayload: { ...(c as any)._draftPayload, ...payload }
              } as ContentItem : c),
              isLoading: false
            }));
            return;
          }
          await contentService.create({
            ...payload,
            lessonId: id.split('-')[1],
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
          if (String(id).startsWith('draft-')) {
            set(state => ({ content: state.content.filter(c => c.id !== id), isLoading: false }));
            return;
          }
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
          if (String(id).startsWith('draft-')) return;
          await contentService.retryUpload(id);
          await get().fetchContent();
        } catch (err) {
          set({ error: resolveErrorMessage(err), isLoading: false });
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'draft-content-storage',
      partialize: (state) => ({
        content: state.content.filter(c => String(c.id).startsWith('draft-'))
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        content: [...currentState.content, ...(persistedState.content || [])]
      })
    }
  )
);
