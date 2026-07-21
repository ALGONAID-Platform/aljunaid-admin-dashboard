/**
 * Lessons API Service — src/services/api/lessons.api.ts
 *
 * Replaces: src/services/lesson.service.ts (mock)
 *
 * Backend structure: Course → Module → Lesson
 * Frontend structure: Lesson has courseId (flat)
 *
 * Strategy:
 *   - getAll(): fetches all modules, then all lessons per module
 *   - getByCourse(courseId): fetches modules for course, then lessons per module
 *   - Lessons are created under a moduleId; frontend passes courseId which we
 *     treat as moduleId for now (since the UI uses courseId in forms)
 *
 * Endpoints:
 *   POST   /lessons                    (multipart/form-data)
 *   GET    /lessons/module/{moduleId}
 *   GET    /lessons/{id}
 *   PATCH  /lessons/{id}              (multipart/form-data)
 *   DELETE /lessons/{id}
 */

import { api } from '../../lib/api';
import type { BackendLesson, BackendModule } from '../../types/api';
import type { Lesson, CreateLessonPayload, UpdateLessonPayload } from '../../types';

// ─── Adapter ──────────────────────────────────────────────────────────────────

function adaptLesson(bl: BackendLesson, module?: BackendModule): Lesson {
  const isPub = bl.status === 'PUBLISHED' || bl.isPublished === true;
  return {
    id: String(bl.id),
    courseId: String(bl.moduleId),
    courseName: module ? `وحدة: ${module.title}` : `وحدة #${bl.moduleId}`,
    title: bl.title,
    description: bl.description ?? '',
    order: bl.order ?? 0,
    isPublished: isPub,
    hasContent: !!(bl.videoUrl ?? bl.pdfUrl ?? bl.content),
    videoUrl: bl.videoUrl ?? undefined,
    pdfUrl: bl.pdfUrl ?? undefined,
    content: bl.content ?? undefined,
    createdAt: bl.createdAt ?? new Date().toISOString(),
    publishedAt: bl.publishedAt ?? undefined,
    publishedBy: typeof bl.publishedBy === 'object' ? bl.publishedBy?.name : bl.publishedBy ?? undefined,
  };
}

// ─── Build FormData for lesson create/update ──────────────────────────────────

function buildLessonFormData(payload: {
  title?: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  order?: number;
  moduleId?: number;
  pdf?: File;
  isPublished?: boolean;
  status?: 'DRAFT' | 'PUBLISHED';
}): FormData {
  const fd = new FormData();
  if (payload.title !== undefined) fd.append('title', payload.title);
  if (payload.description !== undefined) fd.append('description', payload.description);
  if (payload.content !== undefined) fd.append('content', payload.content);
  if (payload.videoUrl !== undefined) fd.append('videoUrl', payload.videoUrl);
  if (payload.pdfUrl !== undefined) fd.append('pdfUrl', payload.pdfUrl);
  if (payload.order !== undefined) fd.append('order', String(payload.order));
  if (payload.moduleId !== undefined) fd.append('moduleId', String(payload.moduleId));
  if (payload.pdf instanceof File) fd.append('pdf', payload.pdf);
  if (payload.status !== undefined) {
    fd.append('status', payload.status);
  } else if (payload.isPublished !== undefined) {
    fd.append('status', payload.isPublished ? 'PUBLISHED' : 'DRAFT');
  }
  return fd;
}


// ─── Service ──────────────────────────────────────────────────────────────────

export const lessonService = {
  /**
   * Fetch all lessons across all modules.
   * Strategy: GET /modules → for each module GET /lessons/module/{id}
   */
  async getAll(): Promise<Lesson[]> {
    const { data: modulesRaw } = await api.get<BackendModule[] | { data: BackendModule[] }>('/modules');
    const modules: BackendModule[] = Array.isArray(modulesRaw)
      ? modulesRaw
      : (modulesRaw as { data: BackendModule[] }).data ?? [];

    const lessonArrays = await Promise.all(
      modules.map(async (mod) => {
        try {
          const { data } = await api.get<BackendLesson[] | { data: BackendLesson[] }>(
            `/lessons/module/${mod.id}`
          );
          const lessons: BackendLesson[] = Array.isArray(data)
            ? data
            : (data as { data: BackendLesson[] }).data ?? [];
          return lessons.map((l) => adaptLesson(l, mod));
        } catch {
          return [];
        }
      })
    );

    return lessonArrays.flat();
  },

  /**
   * Lessons by courseId (which maps to moduleId in the backend).
   * GET /lessons/module/{moduleId}
   */
  async getByCourse(moduleId: string): Promise<Lesson[]> {
    const { data } = await api.get<BackendLesson[] | { data: BackendLesson[] }>(
      `/lessons/module/${moduleId}`
    );
    const lessons: BackendLesson[] = Array.isArray(data)
      ? data
      : (data as { data: BackendLesson[] }).data ?? [];
    return lessons.map((l) => adaptLesson(l));
  },

  /** GET /lessons/{id} */
  async getById(id: string): Promise<Lesson> {
    const { data } = await api.get<BackendLesson | { data: BackendLesson }>(`/lessons/${id}`);
    const lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);
    return adaptLesson(lesson);
  },

  /**
   * POST /lessons (multipart/form-data)
   * Frontend's courseId is treated as moduleId.
   */
  async create(payload: CreateLessonPayload & { courseName?: string; pdf?: File; pdfUrl?: string; videoUrl?: string; content?: string; status?: 'DRAFT' | 'PUBLISHED' }): Promise<Lesson> {
    const fd = buildLessonFormData({
      title: payload.title,
      description: payload.description,
      content: (payload as any).content,
      videoUrl: (payload as any).videoUrl,
      pdfUrl: (payload as any).pdfUrl,
      order: payload.order,
      moduleId: Number(payload.courseId),
      pdf: (payload as any).pdf,
      status: (payload as any).status ?? (payload.isPublished ? 'PUBLISHED' : 'DRAFT'),
      isPublished: payload.isPublished ?? true,
    });

    const { data } = await api.post<BackendLesson | { data: BackendLesson }>('/lessons', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);
    return adaptLesson(lesson);
  },

  /** PATCH /lessons/{id} (multipart/form-data) */
  async update(payload: UpdateLessonPayload & { pdf?: File; pdfUrl?: string; videoUrl?: string; content?: string; status?: 'DRAFT' | 'PUBLISHED' }): Promise<Lesson> {
    const { id, courseId, ...rest } = payload;
    const fd = buildLessonFormData({
      ...rest,
      content: (payload as any).content,
      videoUrl: (payload as any).videoUrl,
      pdfUrl: (payload as any).pdfUrl,
      pdf: (payload as any).pdf,
      status: (payload as any).status ?? (payload.isPublished !== undefined ? (payload.isPublished ? 'PUBLISHED' : 'DRAFT') : undefined),
      moduleId: courseId !== undefined ? Number(courseId) : undefined,
    });

    const { data } = await api.patch<BackendLesson | { data: BackendLesson }>(`/lessons/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);
    return adaptLesson(lesson);
  },

  /** DELETE /lessons/{id} */
  async delete(id: string): Promise<void> {
    await api.delete(`/lessons/${id}`);
  },

  /**
   * Toggle publish.
   * Hits PATCH /lessons/{id} with status flipped between PUBLISHED and DRAFT.
   */
  async togglePublish(id: string): Promise<Lesson> {
    const lesson = await lessonService.getById(id);
    const newStatus = lesson.isPublished ? 'DRAFT' : 'PUBLISHED';
    const fd = buildLessonFormData({ status: newStatus });
    const { data } = await api.patch<BackendLesson | { data: BackendLesson }>(`/lessons/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const updated = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);
    return adaptLesson(updated);
  },
};

