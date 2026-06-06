import type { ID } from './common.types';

export interface Lesson {
  id: ID;
  courseId: ID;
  courseName: string;
  title: string;
  description: string;
  order: number;
  isPublished: boolean;
  hasContent: boolean;
  createdAt: string;
}

export interface CreateLessonPayload {
  courseId: ID;
  title: string;
  description: string;
  order: number;
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
