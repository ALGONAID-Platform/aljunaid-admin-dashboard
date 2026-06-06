import type { ID, EducationalLevel } from './common.types';

export interface Course {
  id: ID;
  name: string;
  description: string;
  level: EducationalLevel;
  imagePreview?: string;
  lessonsCount: number;
  createdAt: string;
}

export interface CreateCoursePayload {
  name: string;
  description: string;
  level: EducationalLevel;
  imagePreview?: string;
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {
  id: ID;
}

export interface CourseFormValues {
  name: string;
  description: string;
  level: EducationalLevel | '';
  imagePreview?: string;
}
