import { api } from '../../lib/api';
import { UploadMediaResponse } from '../../types/media.types'; // تم إزالة PaginatedMediaResponse لعدم الحاجة لها

export const mediaApi = {
  uploadImage: async (file: File): Promise<UploadMediaResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    // Axios سيتعامل مع الـ FormData والـ Boundary تلقائياً
    const response = await api.post<UploadMediaResponse>('/media/images', formData);

    return response.data;
  },

  deleteMedia: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/media/${id}`);
    return response.data;
  }
};