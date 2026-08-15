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

  // 2. إذا كان الرابط كاملاً أصلاً (سحابي أو محلي مؤقت blob)، نعيده كما هو
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://') || cleanPath.startsWith('blob:')) {
    return cleanPath;
  }

  // 3. إذا كان الرابط عبارة عن UUID من Uploadcare (لا يبدأ بشرطة مائلة / )
  if (!cleanPath.startsWith('/')) {
    // نزيل أي شرطة مائلة زائدة في النهاية إن وجدت لتجنب تكرارها
    const uuid = cleanPath.replace(/\/$/, '');
    return `https://ucarecdn.com/${uuid}/`;
  }

  // 4. معالجة المسارات النسبية للسيرفر (مع تجاوز خطأ TypeScript للـ env)
  const meta = import.meta as any; // 🚀 الخدعة هنا لإسكات TypeScript
  const configuredBaseUrl = (meta.env?.VITE_API_URL as string) || 'https://api.exchangesmangement.online/api/v1';

  // تنظيف رابط السيرفر الأساسي
  const baseUrl = configuredBaseUrl.replace(/\/api\/v1\/?$/, '');
  return `${baseUrl}${cleanPath}`;
}