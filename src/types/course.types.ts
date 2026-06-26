import type { ID } from './common.types';

export interface Course {
  id: ID;
  name: string;
  description: string;
  imagePreview?: string;
  lessonsCount: number;
  createdAt: string;
}

export interface CreateCoursePayload {
  name: string;
  description: string;
  imagePreview?: string;
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {
  id: ID;
}

export interface CourseFormValues {
  name: string;
  description: string;
  imagePreview?: string;
}
