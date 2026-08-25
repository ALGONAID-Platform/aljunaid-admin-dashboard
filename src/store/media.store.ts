import { create } from 'zustand';
import { mediaApi } from '../services/api/media.api';
import { UploadMediaResponse } from '../types/media.types';

interface MediaState {
  isUploading: boolean;
  error: string | null;
  uploadImage: (file: File) => Promise<UploadMediaResponse>;
}

export const useMediaStore = create<MediaState>((set) => ({
  isUploading: false,
  error: null,

  uploadImage: async (file: File) => {
    set({ isUploading: true, error: null });
    try {
      const response = await mediaApi.uploadImage(file);
      set({ isUploading: false });
      return response;
    } catch (error: any) {
      set({ error: error.message || 'Failed to upload image', isUploading: false });
      throw error;
    }
  },
}));