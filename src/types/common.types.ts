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

