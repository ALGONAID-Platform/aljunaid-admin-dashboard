import type { ID } from './common.types';

export interface Course {
  id: ID;
  title: string;
  description: string;
  thumbnail?: string;
  lessonsCount: number;
  createdAt: string;
}

export interface CreateCoursePayload {
  title: string;
  description: string;
  thumbnail?: string;
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {
  id: ID;
}

export interface CourseFormValues {
  title: string;
  description: string;
  thumbnail?: string;
}
