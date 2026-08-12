import { api } from '../../lib/api';
import type { ExamModel, CreateExamModelPayload, UpdateExamModelPayload, ExamModelFilterOptions } from '../../types/examModel.types';
import { uploadService } from './upload.api';

class ExamModelsService {
  private readonly BASE_URL = '/practice-exams';

  async getAll(options?: ExamModelFilterOptions): Promise<ExamModel[]> {
    const { data } = await api.get<ExamModel[]>(this.BASE_URL);
    let results = data;

    if (options) {
      if (options.searchQuery && options.searchQuery.trim()) {
        const q = options.searchQuery.toLowerCase().trim();
        results = results.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q))
        );
      }
      if (options.courseId && options.courseId !== 'ALL') {
        results = results.filter((item) => String(item.courseId) === String(options.courseId));
      }
      if (options.grade && options.grade !== 'ALL') {
        results = results.filter((item) => item.grade === options.grade);
      }
      if (options.sortBy) {
        const field = options.sortBy;
        const order = options.sortOrder === 'desc' ? -1 : 1;
        results.sort((a, b) => {
          const valA = a[field as keyof ExamModel] || '';
          const valB = b[field as keyof ExamModel] || '';
          return String(valA).localeCompare(String(valB)) * order;
        });
      }
    }
    return results;
  }

  async getByCourse(courseId: string | number): Promise<ExamModel[]> {
    const { data } = await api.get<ExamModel[]>(`${this.BASE_URL}/course/${courseId}`);
    return data;
  }

  async getById(id: string): Promise<ExamModel | null> {
    const { data } = await api.get<ExamModel>(`${this.BASE_URL}/${id}`);
    return data;
  }

  async create(payload: CreateExamModelPayload, onUploadProgress?: (p: any) => void): Promise<ExamModel> {
    let finalPdfUrl = payload.pdfUrl;
    
    if (payload.pdfFile) {
      finalPdfUrl = await uploadService.uploadPdf(payload.pdfFile, onUploadProgress);
    }

    const requestData: Record<string, any> = {
      title: payload.title.trim(),
      description: payload.description?.trim(),
      pdfUrl: finalPdfUrl,
      grade: payload.grade,
      courseId: payload.courseId && !isNaN(Number(payload.courseId)) && Number(payload.courseId) !== 0
        ? Number(payload.courseId)
        : undefined,
    };

    const { data } = await api.post<ExamModel>(this.BASE_URL, requestData);
    return data;
  }

  async update(payload: UpdateExamModelPayload, onUploadProgress?: (p: any) => void): Promise<ExamModel> {
    let finalPdfUrl = payload.pdfUrl;
    
    if (payload.pdfFile) {
      finalPdfUrl = await uploadService.uploadPdf(payload.pdfFile, onUploadProgress);
    }

    const requestData: Record<string, any> = {};
    if (payload.title) requestData.title = payload.title.trim();
    if (payload.description !== undefined) requestData.description = payload.description?.trim();
    if (finalPdfUrl !== undefined) requestData.pdfUrl = finalPdfUrl;
    if (payload.grade !== undefined) requestData.grade = payload.grade;
    if (payload.courseId !== undefined) {
      const parsed = Number(payload.courseId);
      requestData.courseId = payload.courseId && !isNaN(parsed) && parsed !== 0 ? parsed : null;
    }

    const { data } = await api.patch<ExamModel>(`${this.BASE_URL}/${payload.id}`, requestData);
    return data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.BASE_URL}/${id}`);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.delete(id)));
  }
}

export const examModelsService = new ExamModelsService();
