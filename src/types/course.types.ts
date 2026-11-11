import type { ID } from './common.types';

export type LessonOrderMode = 'BY_DATE' | 'BY_ORDER';

export interface Course {
  id: ID;
  title: string;
  description: string;
  thumbnail?: string;
  lessonsCount: number;
  enrolledStudentsCount?: number;
  isPaid?: boolean;
  bankAccounts?: string | null;
  courseType?: 'RECORDED' | 'LIVE';
  lessonOrderMode?: LessonOrderMode;
  maxStudents?: number | null;
  startDate?: string;
  endDate?: string;
  durationWeeks?: number;
  scheduleDays?: string[];
  scheduleDaysText?: string;
  certificateMinScore?: number;
  certificateMinAttendance?: number;
  [key: string]: unknown;
  createdAt: string;
}

export interface CreateCoursePayload {
  title: string;
  description: string;
  thumbnail?: string;
  isPaid?: boolean;
  bankAccounts?: string;
  lessonOrderMode?: LessonOrderMode;
  scheduleDays?: string[];
  scheduleDaysText?: string;
  [key: string]: unknown;
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {
  id: ID;
  isPaid?: boolean;
  bankAccounts?: string;
  lessonOrderMode?: LessonOrderMode;
  scheduleDays?: string[];
  scheduleDaysText?: string;
}

export interface CourseFormValues {
  title: string;
  description: string;
  thumbnail?: string;
  isPaid?: boolean;
  bankAccounts?: string;
  lessonOrderMode?: LessonOrderMode;
  scheduleDays?: string[];
  scheduleDaysText?: string;
}
