import { create } from 'zustand';
import { mediaApi } from '../services/api/media.api';
import { UploadMediaResponse } from '../types/media.types';

interface MediaState {
  isUploading: boolean;
  error: string | null;
  uploadImage: (file: File, onProgress?: (evt: any) => void) => Promise<UploadMediaResponse>;
}

export const useMediaStore = create<MediaState>((set) => ({
  isUploading: false,
  error: null,

  uploadImage: async (file: File, onProgress?: (evt: any) => void) => {
    set({ isUploading: true, error: null });
    try {
      const response = await mediaApi.uploadImage(file, onProgress);
      set({ isUploading: false });
      return response;
    } catch (error: any) {
      set({ error: error.message || 'Failed to upload image', isUploading: false });
      throw error;
    }
  },
}));