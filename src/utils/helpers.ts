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
