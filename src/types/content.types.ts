import type { ID, ContentType, UploadStatus } from './common.types';

export interface ContentItem {
  id: ID;
  lessonId: ID;
  lessonTitle: string;
  title: string;
  type: ContentType;
  fileName?: string;
  fileSize?: string;
  url?: string;
  status: UploadStatus;
  uploadProgress?: number;
  createdAt: string;
}

export interface CreateContentPayload {
  lessonId: ID;
  title: string;
  type: ContentType;
  file?: File;
  url?: string;
}

export interface UpdateContentPayload {
  lessonId?: ID;
  title?: string;
  type?: ContentType;
  file?: File;
  url?: string;
}

export interface ContentFormValues {
  lessonId: ID | '';
  title: string;
  type: ContentType | '';
  url?: string;
}

export interface UploadState {
  id: ID;
  fileName: string;
  progress: number;
  status: UploadStatus;
  error?: string;
}
