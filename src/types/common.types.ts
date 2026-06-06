// ─── Common shared types ──────────────────────────────────────────────────────

export type ID = string;

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface FilterConfig {
  [key: string]: string | number | boolean | null;
}

export interface SelectOption {
  value: string;
  label: string;
}

export type ContentType = 'video' | 'pdf' | 'word' | 'image' | 'link';
export type UploadStatus = 'ready' | 'uploading' | 'error' | 'pending';
export type PublishStatus = 'published' | 'draft' | 'archived';
export type DifficultyLevel = 'مبتدئ' | 'متوسط' | 'متقدم';

export type EducationalLevel = 'SECONDARY' | 'DIPLOMA' | 'UNIVERSITY_LEVEL_1' | 'UNIVERSITY_LEVEL_2' | 'UNIVERSITY_LEVEL_3' | 'UNIVERSITY_LEVEL_4';

export const EDUCATIONAL_LEVELS: Record<EducationalLevel, string> = {
  SECONDARY: 'المرحلة الثانوية',
  DIPLOMA: 'دبلوم',
  UNIVERSITY_LEVEL_1: 'جامعي - المستوى الأول',
  UNIVERSITY_LEVEL_2: 'جامعي - المستوى الثاني',
  UNIVERSITY_LEVEL_3: 'جامعي - المستوى الثالث',
  UNIVERSITY_LEVEL_4: 'جامعي - المستوى الرابع',
};
