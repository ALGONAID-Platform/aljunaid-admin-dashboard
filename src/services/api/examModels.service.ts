import { api } from '../../lib/api';
import type { ExamModel, CreateExamModelPayload, UpdateExamModelPayload, ExamModelFilterOptions } from '../../types/examModel.types';

class ExamModelsService {
  private readonly BASE_URL = '/exam-templates';

  async getAll(options?: ExamModelFilterOptions): Promise<ExamModel[]> {
    // If backend supports filtering, we can pass options as params.
    // For now, we will fetch all and filter locally to ensure compatibility with existing store logic,
    // or just rely on backend if implemented.
    const { data } = await api.get<ExamModel[]>(this.BASE_URL);
    let results = data;

    if (options) {
      if (options.searchQuery && options.searchQuery.trim()) {
        const q = options.searchQuery.toLowerCase().trim();
        results = results.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            (item.courseName && item.courseName.toLowerCase().includes(q))
        );
      }
      if (options.courseId && options.courseId !== 'ALL') {
        results = results.filter((item) => String(item.courseId) === String(options.courseId));
      }
      if (options.moduleId && options.moduleId !== 'ALL') {
        results = results.filter((item) => String(item.moduleId) === String(options.moduleId));
      }
      if (options.category && options.category !== 'ALL') {
        results = results.filter((item) => item.category === options.category);
      }
      if (options.contentType && options.contentType !== 'ALL') {
        results = results.filter((item) => item.contentType === options.contentType);
      }
      if (options.isPublished !== undefined && options.isPublished !== 'ALL') {
        results = results.filter((item) => item.isPublished === options.isPublished);
      }
      if (options.semester && options.semester !== 'ALL') {
        results = results.filter((item) => item.semester === options.semester);
      }
      if (options.academicYear && options.academicYear !== 'ALL') {
        results = results.filter((item) => item.academicYear === options.academicYear);
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
    const data = await this.getAll();
    return data.filter((item) => String(item.courseId) === String(courseId));
  }

  async getByModule(moduleId: string | number): Promise<ExamModel[]> {
    const data = await this.getAll();
    return data.filter((item) => String(item.moduleId) === String(moduleId));
  }

  async getById(id: string): Promise<ExamModel | null> {
    const { data } = await api.get<ExamModel>(`${this.BASE_URL}/${id}`);
    return data;
  }

  async create(payload: CreateExamModelPayload): Promise<ExamModel> {
    const formData = new FormData();
    formData.append('courseId', String(payload.courseId));
    if (payload.courseName) formData.append('courseName', payload.courseName);
    if (payload.moduleId) formData.append('moduleId', String(payload.moduleId));
    if (payload.moduleTitle) formData.append('moduleTitle', payload.moduleTitle);
    formData.append('title', payload.title.trim());
    formData.append('description', payload.description.trim());
    formData.append('category', payload.category);
    formData.append('contentType', payload.contentType);
    
    if (payload.semester) formData.append('semester', payload.semester);
    if (payload.academicYear) formData.append('academicYear', payload.academicYear);
    if (payload.isPublished !== undefined) formData.append('isPublished', String(payload.isPublished));
    if (payload.order !== undefined) formData.append('order', String(payload.order));

    if (payload.contentType === 'PDF') {
      if (payload.pdfFile) formData.append('pdf', payload.pdfFile);
      else if (payload.pdfUrl) formData.append('pdfUrl', payload.pdfUrl);
      if (payload.pdfFileName) formData.append('pdfFileName', payload.pdfFileName);
      if (payload.pdfFileSize) formData.append('pdfFileSize', payload.pdfFileSize);
    } else if (payload.contentType === 'IMAGE') {
      if (payload.imageFile) formData.append('image', payload.imageFile);
      else if (payload.imageUrl) formData.append('imageUrl', payload.imageUrl);
    } else if (payload.contentType === 'MARKDOWN') {
      if (payload.markdownContent) formData.append('markdownContent', payload.markdownContent);
    }

    const { data } = await api.post<ExamModel>(this.BASE_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async update(payload: UpdateExamModelPayload): Promise<ExamModel> {
    const formData = new FormData();
    if (payload.courseId) formData.append('courseId', String(payload.courseId));
    if (payload.courseName) formData.append('courseName', payload.courseName);
    if (payload.moduleId) formData.append('moduleId', String(payload.moduleId));
    if (payload.moduleTitle) formData.append('moduleTitle', payload.moduleTitle);
    if (payload.title) formData.append('title', payload.title.trim());
    if (payload.description) formData.append('description', payload.description.trim());
    if (payload.category) formData.append('category', payload.category);
    if (payload.contentType) formData.append('contentType', payload.contentType);
    
    if (payload.semester) formData.append('semester', payload.semester);
    if (payload.academicYear) formData.append('academicYear', payload.academicYear);
    if (payload.isPublished !== undefined) formData.append('isPublished', String(payload.isPublished));
    if (payload.order !== undefined) formData.append('order', String(payload.order));

    if (payload.contentType === 'PDF') {
      if (payload.pdfFile) formData.append('pdf', payload.pdfFile);
      else if (payload.pdfUrl) formData.append('pdfUrl', payload.pdfUrl);
      if (payload.pdfFileName) formData.append('pdfFileName', payload.pdfFileName);
      if (payload.pdfFileSize) formData.append('pdfFileSize', payload.pdfFileSize);
    } else if (payload.contentType === 'IMAGE') {
      if (payload.imageFile) formData.append('image', payload.imageFile);
      else if (payload.imageUrl) formData.append('imageUrl', payload.imageUrl);
    } else if (payload.contentType === 'MARKDOWN') {
      if (payload.markdownContent) formData.append('markdownContent', payload.markdownContent);
    }

    const { data } = await api.patch<ExamModel>(`${this.BASE_URL}/${payload.id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.BASE_URL}/${id}`);
  }

  async publish(id: string, isPublished: boolean): Promise<ExamModel> {
    const { data } = await api.patch<ExamModel>(`${this.BASE_URL}/${id}/status`, { status: isPublished ? 'PUBLISHED' : 'DRAFT' });
    return data;
  }

  async bulkPublish(ids: string[], isPublished: boolean): Promise<void> {
    // If backend has bulk update, use it. Otherwise loop.
    await Promise.all(ids.map(id => this.publish(id, isPublished)));
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.delete(id)));
  }
}

export const examModelsService = new ExamModelsService();
