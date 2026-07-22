import type { ID } from './common.types';

export interface ExamModel {
  id: ID;
  courseId?: ID;
  title: string;
  description?: string;
  pdfUrl?: string | null;
  grade?: string;
  createdAt: string;
  updatedAt?: string;
  // UI helper fields
  courseName?: string;
}

export interface CreateExamModelPayload {
  title: string;
  description?: string;
  pdfUrl?: string | null;
  grade?: string;
  courseId?: ID;
  
  // UI helper for multipart form uploads
  pdfFile?: File | null;
  pdfFileName?: string | null;
  pdfFileSize?: string | null;
}

export interface UpdateExamModelPayload extends Partial<CreateExamModelPayload> {
  id: ID;
}

export interface ExamModelFilterOptions {
  searchQuery?: string;
  courseId?: ID | 'ALL';
  grade?: string | 'ALL';
  sortBy?: 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}
