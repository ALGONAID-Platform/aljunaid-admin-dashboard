import type { ID } from './common.types';

export type ExamModelCategory = 
  | 'MIDTERM'
  | 'FINAL'
  | 'QUIZ'
  | 'PRACTICE'
  | 'PREVIOUS_EXAM'
  | 'ASSIGNMENT';

export type ExamModelContentType = 
  | 'PDF'
  | 'IMAGE'
  | 'MARKDOWN';

export interface ExamModel {
  id: ID;
  courseId: ID;
  courseName?: string;
  moduleId?: ID | null;
  moduleTitle?: string | null;
  title: string;
  description: string;
  category: ExamModelCategory;
  contentType: ExamModelContentType;
  pdfUrl?: string | null;
  pdfFileName?: string | null;
  pdfFileSize?: string | null;
  imageUrl?: string | null;
  markdownContent?: string | null;
  semester: string; // e.g. 'الفصل الأول', 'الفصل الثاني', 'الصيفي'
  academicYear: string; // e.g. '2025/2026'
  isPublished: boolean;
  order?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateExamModelPayload {
  courseId: ID;
  courseName?: string;
  moduleId?: ID | null;
  moduleTitle?: string | null;
  title: string;
  description: string;
  category: ExamModelCategory;
  contentType: ExamModelContentType;
  pdfUrl?: string | null;
  pdfFileName?: string | null;
  pdfFileSize?: string | null;
  pdfFile?: File | null;
  imageUrl?: string | null;
  imageFile?: File | null;
  markdownContent?: string | null;
  semester: string;
  academicYear: string;
  isPublished?: boolean;
  order?: number;
}

export interface UpdateExamModelPayload extends Partial<CreateExamModelPayload> {
  id: ID;
}

export interface ExamModelFilterOptions {
  searchQuery?: string;
  category?: ExamModelCategory | 'ALL';
  contentType?: ExamModelContentType | 'ALL';
  courseId?: ID | 'ALL';
  moduleId?: ID | 'ALL';
  isPublished?: boolean | 'ALL';
  semester?: string | 'ALL';
  academicYear?: string | 'ALL';
  sortBy?: 'createdAt' | 'title' | 'category';
  sortOrder?: 'asc' | 'desc';
}
