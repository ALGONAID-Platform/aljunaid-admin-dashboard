import type { ID } from './common.types';

export interface Lesson {
  id: ID;
  courseId: ID;
  courseName: string;
  title: string;
  description: string;
  order?: number;
  isPublished?: boolean;
  videoUrl?: string;
  pdfUrl?: string;
  content?: string;
  type?: string;
  hasContent: boolean;
  createdAt: string;
  publishedAt?: string;
  publishedBy?: string;
}

export interface CreateLessonPayload {
  courseId: ID;
  title: string;
  description: string;
  order: number;
  videoUrl?: string;
  pdfUrl?: string;
  content?: string;
  type?: string;
  isReading?: boolean;
}

export interface UpdateLessonPayload extends Partial<CreateLessonPayload> {
  id: ID;
  isPublished?: boolean;
}

export interface LessonFormValues {
  courseId: ID | '';
  title: string;
  description: string;
  order: number;
}
