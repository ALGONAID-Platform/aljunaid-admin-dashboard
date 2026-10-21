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
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  dayNumber?: number | null;
  liveStatus?: 'SCHEDULED' | 'LIVE_NOW' | 'COMPLETED' | null;
  isMandatory?: boolean;
  isFreePreview?: boolean;
  objectives?: string[];
  liveMeetingUrl?: string;
  recordingVideoUrl?: string;
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
  scheduledAt?: string;
  durationMinutes?: number;
  dayNumber?: number;
  liveStatus?: 'SCHEDULED' | 'LIVE_NOW' | 'COMPLETED';
  isMandatory?: boolean;
  isFreePreview?: boolean;
  liveMeetingUrl?: string;
  recordingVideoUrl?: string;
  objectives?: string[];
  [key: string]: unknown;
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
