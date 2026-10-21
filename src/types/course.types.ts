import type { ID } from './common.types';

export interface Course {
  id: ID;
  title: string;
  description: string;
  thumbnail?: string;
  lessonsCount: number;
  enrolledStudentsCount?: number;
  isPaid?: boolean;
  courseType?: 'RECORDED' | 'LIVE';
  maxStudents?: number | null;
  startDate?: string;
  endDate?: string;
  durationWeeks?: number;
  certificateMinScore?: number;
  certificateMinAttendance?: number;
  [key: string]: unknown;
  createdAt: string;
}

export interface CreateCoursePayload {
  title: string;
  description: string;
  thumbnail?: string;
  [key: string]: unknown;
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {
  id: ID;
}

export interface CourseFormValues {
  title: string;
  description: string;
  thumbnail?: string;
}
