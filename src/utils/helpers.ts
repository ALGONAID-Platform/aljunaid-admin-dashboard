import type { ContentType } from '../types';

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Format ISO date string to display date */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Get content type display label */
export function getContentTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    video: 'فيديو',
    pdf: 'PDF',
    word: 'Word',
    image: 'صورة',
    link: 'رابط',
  };
  return labels[type] ?? type;
}

/** Get content type CSS color class */
export function getContentTypeColor(type: ContentType): string {
  const colors: Record<ContentType, string> = {
    video: 'text-blue-600',
    pdf: 'text-red-500',
    word: 'text-blue-500',
    image: 'text-purple-500',
    link: 'text-emerald-500',
  };
  return colors[type] ?? 'text-gray-500';
}

/** Truncate text to a max length */
export function truncate(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Get a proper image URL (handles absolute and relative paths) */
export function getImageUrl(path?: string | null): string {
  // 1. إذا لم يكن هناك صورة، نعرض صورة افتراضية
  if (!path || path.trim() === '') {
    return 'https://placehold.co/600x400/F8FAFC/94A3B8?text=Image+Not+Found';
  }

  const cleanPath = path.trim();

  // Replace localhost or 127.0.0.1 URLs with proper server host
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(cleanPath)) {
    const withoutHost = cleanPath.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?/, '');
    return getImageUrl(withoutHost);
  }

  // Handle protocol-relative URLs
  if (/^\/\//.test(cleanPath)) {
    return `https:${cleanPath}`;
  }

  // Preserve complete URLs returned by the API (including data/blob previews).
  if (/^(https?:|blob:|data:)/i.test(cleanPath)) {
    return cleanPath;
  }

  // Uploadcare can return its file UUID instead of a path or full URL.
  if (/^[a-f\d]{32}$/i.test(cleanPath)) {
    return `https://ucarecdn.com/${cleanPath}/`;
  }

  const configuredBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL?.trim()
    || import.meta.env.VITE_API_URL?.trim()
    || 'https://api.exchangesmangement.online/api/v1';

  try {
    const imageBase = new URL(configuredBaseUrl);
    // API endpoints often include /api/v1; media paths are rooted at the server.
    imageBase.pathname = imageBase.pathname.replace(/\/api\/v\d+\/?$/, '').replace(/\/+$/, '');
    const relativePath = cleanPath.replace(/^\/+/, '').replace(/^api\/v\d+\//, '');
    return new URL(relativePath, `${imageBase.origin}${imageBase.pathname}/`).toString();
  } catch {
    // Keep a usable URL if a deployment provides a malformed base setting.
    return cleanPath;
  }
}
