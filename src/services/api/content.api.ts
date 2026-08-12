/**
 * Content API Service — src/services/api/content.api.ts
 *
 * Replaces: src/services/content.service.ts (mock)
 *
 * The backend stores content as part of lessons (videoUrl, pdfUrl, content text).
 * There is no dedicated "content" CRUD endpoint.
 *
 * Strategy:
 *   - getAll() / getByLesson(): fetch lessons and extract content metadata
 *   - create(): updates the lesson via PATCH /lessons/{id} with file/url
 *   - delete(): not supported at content item level — remove from lesson
 */

import { api } from '../../lib/api';
import type { BackendLesson } from '../../types/api';
import type { ContentItem, CreateContentPayload } from '../../types';

// ─── Adapter: BackendLesson → ContentItem[] ───────────────────────────────────

function extractContentItems(lesson: BackendLesson): ContentItem[] {
  const items: ContentItem[] = [];

  if (lesson.videoUrl) {
    items.push({
      id: `lesson-${lesson.id}-video`,
      lessonId: String(lesson.id),
      lessonTitle: lesson.title,
      title: `فيديو: ${lesson.title}`,
      type: 'video',
      url: lesson.videoUrl,
      status: 'ready',
      createdAt: lesson.createdAt ?? new Date().toISOString(),
    });
  }

  if (lesson.pdfUrl) {
    items.push({
      id: `lesson-${lesson.id}-pdf`,
      lessonId: String(lesson.id),
      lessonTitle: lesson.title,
      title: `PDF: ${lesson.title}`,
      type: 'pdf',
      fileName: lesson.pdfUrl.split('/').pop(),
      url: lesson.pdfUrl,
      status: 'ready',
      createdAt: lesson.createdAt ?? new Date().toISOString(),
    });
  }

  if (lesson.content) {
    let type: 'word' | 'image' | 'link' = 'word';
    if (lesson.content.startsWith('http')) {
      if (lesson.content.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) type = 'image';
      else type = 'link';
    }
    items.push({
      id: `lesson-${lesson.id}-content`,
      lessonId: String(lesson.id),
      lessonTitle: lesson.title,
      title: `محتوى: ${lesson.title}`,
      type,
      url: lesson.content.startsWith('http') ? lesson.content : undefined,
      status: 'ready',
      createdAt: lesson.createdAt ?? new Date().toISOString(),
    });
  }

  return items;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const contentService = {
  /**
   * Fetch all content items by collecting from all lessons across all modules.
   */
  async getAll(): Promise<ContentItem[]> {
    // Fetch all modules
    const { data: modulesRaw } = await api.get<{ data?: unknown[] } | unknown[]>('/modules');
    const modules = (Array.isArray(modulesRaw)
      ? modulesRaw
      : ((modulesRaw as { data?: unknown[] }).data ?? [])) as { id: number }[];

    // Fetch lessons per module
    const lessonArrays = await Promise.all(
      modules.map(async (mod) => {
        try {
          const { data } = await api.get<BackendLesson[] | { data: BackendLesson[] }>(
            `/lessons/module/${mod.id}`
          );
          return Array.isArray(data)
            ? data
            : (data as { data: BackendLesson[] }).data ?? [];
        } catch {
          return [];
        }
      })
    );

    return lessonArrays.flat().flatMap(extractContentItems);
  },

  /** Filter content by lessonId */
  async getByLesson(lessonId: string): Promise<ContentItem[]> {
    const { data } = await api.get<BackendLesson | { data: BackendLesson }>(`/lessons/${lessonId}`);
    const lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);
    return extractContentItems(lesson);
  },

  /**
   * Create content = update the lesson with video/pdf/link data.
   *
   * Strategy:
   *   - NO physical file → send plain JSON so booleans (isReading) are preserved.
   *   - PDF file attached → send multipart/form-data; omit isReading to avoid the
   *     "must be a boolean" 400 error caused by FormData string coercion.
   */
  async create(
    payload: CreateContentPayload & { lessonTitle: string; pdfUrl?: string | null; videoUrl?: string; content?: string; isReading?: boolean },
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ContentItem> {
    const hasPdfFile = payload.type === 'pdf' && payload.file instanceof File;

    let data: BackendLesson | { data: BackendLesson };

    if (hasPdfFile) {
      // ── FILE PATH: multipart/form-data ────────────────────────────────────
      // FormData coerces booleans to strings, so we OMIT isReading here to
      // avoid the @IsBoolean() validation error on the backend.
      const fd = new FormData();
      fd.append('pdf', payload.file as File);
      if (payload.pdfUrl) fd.append('pdfUrl', payload.pdfUrl);

      ({ data } = await api.patch<BackendLesson | { data: BackendLesson }>(
        `/lessons/${payload.lessonId}`,
        fd,
        { onUploadProgress }
      ));
    } else {
      // ── JSON PATH: plain object (boolean types preserved) ─────────────────
      const body: Record<string, unknown> = {};

      if (payload.videoUrl) {
        body.videoUrl = payload.videoUrl;
      } else if (payload.type === 'video' && payload.url) {
        body.videoUrl = payload.url;
      }

      if (payload.pdfUrl) {
        body.pdfUrl = payload.pdfUrl;
      }

      if (payload.content) {
        body.content = payload.content;
      } else if (['link', 'word', 'image', 'markdown'].includes(payload.type) && payload.url) {
        body.content = payload.url;
      }

      // isReading stays as a real boolean — no string coercion ✅
      if (payload.isReading !== undefined) {
        body.isReading = payload.isReading;
      }

      ({ data } = await api.patch<BackendLesson | { data: BackendLesson }>(
        `/lessons/${payload.lessonId}`,
        body
      ));
    }

    const lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);
    const items = extractContentItems(lesson);

    // Return the first item that matches the type, or synthesise a fallback
    const newItem = items.find(
      (i) => i.type === payload.type ||
        (['link', 'word', 'image'].includes(payload.type) && ['link', 'word', 'image'].includes(i.type))
    );

    const fieldType = payload.type === 'video' ? 'video' : payload.type === 'pdf' ? 'pdf' : 'content';

    return newItem ?? {
      id: `lesson-${payload.lessonId}-${fieldType}`,
      lessonId: payload.lessonId,
      lessonTitle: payload.lessonTitle,
      title: payload.title,
      type: payload.type,
      url: payload.url,
      status: 'ready',
      createdAt: new Date().toISOString(),
    };
  },


  /**
   * Delete content item — deletes the entire underlying lesson.
   * id format: lesson-{lessonId}-{type}
   */
  async delete(id: string): Promise<void> {
    const parts = id.split('-');
    // id pattern: lesson-{lessonId}-video|pdf|content
    const lessonId = parts[1];

    if (!lessonId) return;

    // Call the delete API service method directly instead of using a PATCH request
    await api.delete(`/lessons/${lessonId}`);
  },

  /** Retry is a no-op for real backend (no upload queue) */
  async retryUpload(id: string): Promise<ContentItem> {
    return contentService.getByLesson(id.split('-')[1]).then((items) => items[0]);
  },
};
