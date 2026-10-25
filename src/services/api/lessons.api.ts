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

function adaptLesson(bl: BackendLesson, module?: BackendModule | { id?: number; title?: string; courseTitle?: string; courseId?: number }): Lesson {
  const isPub = bl.status === 'PUBLISHED' || bl.isPublished === true;
  return {
    id: String(bl.id),
    courseId: String(bl.moduleId),
    courseName: module ? `وحدة: ${module.title}` : `وحدة #${bl.moduleId}`,
    title: bl.title,
    description: bl.description ?? '',
    order: bl.order ?? 0,
    isPublished: isPub,
    hasContent: !!(bl.videoUrl ?? bl.pdfUrl ?? bl.content ?? (bl.isReading ? bl.description : undefined)),
    videoUrl: bl.videoUrl ?? undefined,
    pdfUrl: bl.pdfUrl ?? undefined,
    pdfFiles: ((bl as any).pdfFiles ?? []).map((pdf: any, index: number) => ({ id: pdf.id == null ? undefined : String(pdf.id), title: pdf.title ?? `PDF ${index + 1}`, url: pdf.url, order: pdf.order ?? index })).sort((a: any, b: any) => a.order - b.order),
    content: (bl.isReading && !bl.pdfUrl) ? (bl.description ?? undefined) : (bl.content ?? undefined),
    type: bl.videoUrl ? 'video' : (bl.pdfUrl ? 'pdf' : (bl.isReading ? 'markdown' : 'video')),
    createdAt: bl.createdAt ?? new Date().toISOString(),
    publishedAt: bl.publishedAt ?? undefined,
    publishedBy: typeof bl.publishedBy === 'object' ? bl.publishedBy?.name : bl.publishedBy ?? undefined,
    scheduledAt: (bl as any).scheduledAt ?? null,
    durationMinutes: (bl as any).durationMinutes ?? null,
    dayNumber: (bl as any).dayNumber ?? null,
    liveStatus: (bl as any).liveStatus ?? null,
    isMandatory: (bl as any).isMandatory ?? true,
    isFreePreview: (bl as any).isFreePreview ?? false,
    objectives: (bl as any).objectives ?? [],
    liveMeetingUrl: (bl as any).liveMeetingUrl ?? undefined,
    recordingVideoUrl: (bl as any).recordingVideoUrl ?? undefined,
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
  pdfFiles?: Array<{ title: string; url: string; order: number }>;
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
  async getAllPages(params: { moduleId?: string } = {}): Promise<BackendLesson[]> {
    const limit = 100;
    const lessons: BackendLesson[] = [];
    let page = 1;
    let totalPages = 1;

    // The API returns { data, meta: { total, page, limit, totalPages } }.
    // Read pages in order so a large lesson library does not create a burst of
    // concurrent requests (and tolerate the unpaginated array response).
    do {
      const { data: response } = await api.get<any>('/lessons/search', {
        params: { q: '', ...params, page, limit },
      });
      let body = response;
      // Some deployments wrap the standard response once more in `data`.
      if (!Array.isArray(body) && body?.data && !Array.isArray(body.data) && body.data.data) {
        body = body.data;
      }
      const items: BackendLesson[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.data) ? body.data : [];
      lessons.push(...items);

      const meta = body?.meta;
      totalPages = Math.max(1, Number(meta?.totalPages) || (meta?.total != null
        ? Math.ceil(Number(meta.total) / (Number(meta.limit) || limit))
        : 1));
      if (!meta && items.length === limit) totalPages = page + 1;
      page += 1;
    } while (page <= totalPages);

    return lessons;
  },
  async getPdfs(lessonId: string): Promise<Array<{ id: string; title?: string; url: string; order?: number }>> {
    const { data } = await api.get<any>(`/lessons/${lessonId}/pdfs`);
    const list = Array.isArray(data) ? data : data.data ?? [];
    return list.map((pdf: any, index: number) => ({ ...pdf, id: String(pdf.id), title: pdf.title ?? `PDF ${index + 1}`, order: pdf.order ?? index })).sort((a: any, b: any) => a.order - b.order);
  },
  async addPdf(lessonId: string, input: { file?: File; title?: string; url?: string; order?: number }): Promise<void> {
    if (input.file) {
      const body = new FormData(); body.append('file', input.file);
      if (input.title) body.append('title', input.title);
      if (input.order !== undefined) body.append('order', String(input.order));
      await api.post(`/lessons/${lessonId}/pdfs`, body);
    } else {
      await api.post(`/lessons/${lessonId}/pdfs`, { title: input.title, url: input.url, order: input.order });
    }
  },
  async deletePdf(lessonId: string, pdfId: string): Promise<void> {
    await api.delete(`/lessons/${lessonId}/pdfs/${pdfId}`);
  },
  async updateLiveStatus(id: string, liveStatus: 'SCHEDULED' | 'LIVE_NOW' | 'COMPLETED', recordingVideoUrl?: string): Promise<void> {
    await api.patch(`/lessons/${id}/live-status`, { liveStatus, ...(recordingVideoUrl ? { recordingVideoUrl } : {}) });
  },
  /**
   * Fetch all lessons across all modules.
   * Strategy: GET /modules → for each module GET /lessons/module/{id}
   */
  async getAll(): Promise<Lesson[]> {
    // The module lesson endpoint is student-facing and returns published lessons only.
    // The admin search endpoint includes drafts, which must remain visible after creation.
    const lessons = await this.getAllPages();
    return lessons.map((lesson) => adaptLesson(lesson, (lesson as any).module));
  },

  /**
   * Lessons by courseId (which maps to moduleId in the backend).
   * GET /lessons/module/{moduleId}
   */
  async getByCourse(moduleId: string): Promise<Lesson[]> {
    const lessons = await this.getAllPages({ moduleId });
    return lessons.map((lesson) => adaptLesson(lesson, (lesson as any).module));
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
  async create(payload: CreateLessonPayload & { courseName?: string; pdf?: File; pdfUrl?: string; videoUrl?: string; content?: string; status?: 'DRAFT' | 'PUBLISHED'; isPublished?: boolean }, onUploadProgress?: (progressEvent: any) => void): Promise<Lesson> {
    const status = payload.status ?? ((payload.isPublished ?? true) ? 'PUBLISHED' : 'DRAFT');
    const fd = buildLessonFormData({
      title: payload.title,
      description: payload.description,
      content: (payload as any).content,
      videoUrl: (payload as any).videoUrl,
      pdfUrl: (payload as any).pdfUrl,
      order: payload.order,
      moduleId: Number(payload.courseId),
      pdf: (payload as any).pdf,
      status,
      isPublished: payload.isPublished ?? true,
      pdfFiles: (payload as any).pdfFiles,
    });

    const { data } = await api.post<BackendLesson | { data: BackendLesson }>('/lessons', fd, { onUploadProgress, timeout: 0 });
    let lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);

    // Send isReading explicitly via JSON to bypass FormData boolean/string strict validation in backend
    const extraFields = Object.fromEntries(['scheduledAt','durationMinutes','dayNumber','liveStatus','isMandatory','isFreePreview','liveMeetingUrl','recordingVideoUrl','objectives','pdfFiles'].filter(key => (payload as any)[key] !== undefined).map(key => [key, (payload as any)[key]]));
    const extraPayload = { ...extraFields, ...((payload as any).isReading !== undefined ? { isReading: (payload as any).isReading } : {}) };
    if (Object.keys(extraPayload).length) {
      const { data: updatedData } = await api.patch<BackendLesson | { data: BackendLesson }>(`/lessons/${lesson.id}`, extraPayload);
      lesson = (updatedData as { data?: BackendLesson }).data ?? (updatedData as BackendLesson);
    }

    // The API updates the PDF relation after forming its PATCH response. Reload
    // to keep the dashboard's lesson list in sync with the saved attachments.
    return this.getById(String(lesson.id));
  },

  /** PATCH /lessons/{id} (multipart/form-data) */
  async update(payload: UpdateLessonPayload & { pdf?: File; pdfUrl?: string; videoUrl?: string; content?: string; status?: 'DRAFT' | 'PUBLISHED' }, onUploadProgress?: (progressEvent: any) => void): Promise<Lesson> {
    const { id, courseId, ...rest } = payload;
    const fd = buildLessonFormData({
      ...rest,
      content: (payload as any).content,
      videoUrl: (payload as any).videoUrl,
      pdfUrl: (payload as any).pdfUrl,
      pdf: (payload as any).pdf,
      status: (payload as any).status ?? (payload.isPublished !== undefined ? (payload.isPublished ? 'PUBLISHED' : 'DRAFT') : undefined),
      moduleId: courseId !== undefined ? Number(courseId) : undefined,
      pdfFiles: (payload as any).pdfFiles,
    });

    const { data } = await api.patch<BackendLesson | { data: BackendLesson }>(`/lessons/${id}`, fd, { onUploadProgress, timeout: 0 });
    let lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);

    const extraFields = Object.fromEntries(['scheduledAt','durationMinutes','dayNumber','liveStatus','isMandatory','isFreePreview','liveMeetingUrl','recordingVideoUrl','objectives','pdfFiles'].filter(key => (payload as any)[key] !== undefined).map(key => [key, (payload as any)[key]]));
    const extraPayload = { ...extraFields, ...((payload as any).isReading !== undefined ? { isReading: (payload as any).isReading } : {}) };
    if (Object.keys(extraPayload).length) {
      const { data: updatedData } = await api.patch<BackendLesson | { data: BackendLesson }>(`/lessons/${id}`, extraPayload);
      lesson = (updatedData as { data?: BackendLesson }).data ?? (updatedData as BackendLesson);
    }

    // The API updates the PDF relation after forming its PATCH response. Reload
    // to keep the dashboard's lesson list in sync with the saved attachments.
    return this.getById(id);
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
    });
    const updated = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);
    return adaptLesson(updated);
  },
};
