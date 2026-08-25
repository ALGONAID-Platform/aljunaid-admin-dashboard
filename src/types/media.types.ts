export interface Media {
  id: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
  uploaderId: number;
}

export interface UploadMediaResponse {
  success: boolean;
  data: {
    id: string;
    fileName: string;
    url: string;
    markdown: string;
    markdownWithLink: string;
  };
}

export interface PaginatedMediaResponse {
  data: Media[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
