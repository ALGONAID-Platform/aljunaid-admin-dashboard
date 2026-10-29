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
import { modulesService } from './modules.api';
import type { BackendLesson, BackendModule } from '../../types/api';
import type { Lesson, CreateLessonPayload, UpdateLessonPayload } from '../../types';

type LessonPage = { items: BackendLesson[]; totalPages: number | null };

/** Unwrap legacy and current paginated admin API responses. */
function readLessonPage(response: unknown, pageSize: number): LessonPage {
  let body: any = response;
  let metadata: any;

  for (let depth = 0; depth < 5 && body && typeof body === 'object' && !Array.isArray(body); depth += 1) {
    metadata ??= body.meta ?? body.pagination;
    if (Array.isArray(body.items)) { body = body.items; break; }
    if (Array.isArray(body.results)) { body = body.results; break; }
    if (Array.isArray(body.lessons)) { body = body.lessons; break; }
    if (!('data' in body)) break;
    body = body.data;
  }

  const items = Array.isArray(body) ? body as BackendLesson[] : [];
  const reportedPages = Number(metadata?.totalPages ?? metadata?.lastPage ?? metadata?.pages);
  const total = Number(metadata?.total ?? metadata?.totalItems ?? metadata?.count);
  const responsePageSize = Number(metadata?.limit ?? metadata?.perPage ?? metadata?.pageSize) || pageSize;
  const totalPages = Number.isFinite(reportedPages) && reportedPages > 0
    ? Math.ceil(reportedPages)
    : Number.isFinite(total) && total > 0 ? Math.ceil(total / responsePageSize) : null;

  return { items, totalPages };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

function adaptLesson(bl: BackendLesson, module?: BackendModule | { id?: number; title?: string; courseTitle?: string; courseId?: number }): Lesson {
  const isPub = bl.status === 'PUBLISHED' || bl.isPublished === true;
  const rawPdfs = (bl as any).pdfFiles ?? (bl as any).pdfs ?? [];
  return {
    id: String(bl.id),
    courseId: String(bl.moduleId),
    courseName: module?.title || `#${bl.moduleId}`,
    title: bl.title,
    description: bl.description ?? '',
    order: bl.order ?? 0,
    isPublished: isPub,
    hasContent: !!(bl.videoUrl ?? bl.pdfUrl ?? bl.content ?? (Array.isArray(rawPdfs) && rawPdfs.length) ?? (bl.isReading ? bl.description : undefined)),
    videoUrl: bl.videoUrl ?? undefined,
    pdfUrl: bl.pdfUrl ?? undefined,
    pdfFiles: (Array.isArray(rawPdfs) ? rawPdfs : []).map((pdf: any, index: number) => ({ id: pdf.id == null ? undefined : String(pdf.id), title: pdf.title ?? `PDF ${index + 1}`, url: pdf.url, order: pdf.order ?? index })).filter((pdf: any) => !!pdf.url).sort((a: any, b: any) => a.order - b.order),
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
  courseId?: number;
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
  if (payload.courseId !== undefined) fd.append('courseId', String(payload.courseId));
  // Free preview is sent in the JSON follow-up patch so false stays boolean.
  if (payload.pdf instanceof File) fd.append('pdf', payload.pdf);
  if (payload.status !== undefined) {
    fd.append('status', payload.status);
  } else if (payload.isPublished !== undefined) {
    fd.append('status', payload.isPublished ? 'PUBLISHED' : 'DRAFT');
  }
  return fd;
}

function logLessonUpdatePayload(payload: FormData | Record<string, unknown>): Record<string, unknown> {
  if (!(payload instanceof FormData)) return payload;
  return Object.fromEntries([...payload.entries()].map(([key, value]) => [
    key,
    value instanceof File ? { name: value.name, size: value.size, type: value.type } : value,
  ]));
}


// ─── Service ──────────────────────────────────────────────────────────────────

export const lessonService = {
  async getAllPages(params: { moduleId?: string } = {}): Promise<BackendLesson[]> {
    // Keep each lesson search response small so course lesson loads stay within
    // the existing request timeout, while still walking every page.
    const limit = 10;
    const lessons: BackendLesson[] = [];
    let page = 1;
    let totalPages: number | null = null;
    const seenPageSignatures = new Set<string>();

    // The API returns { data, meta: { total, page, limit, totalPages } }.
    // Read pages in order so a large lesson library does not create a burst of
    // concurrent requests (and tolerate the unpaginated array response).
    do {
      const { data: response } = await api.get<any>('/lessons/search', {
        params: { q: '', ...params, page, limit },
      });
      const { items, totalPages: reportedTotalPages } = readLessonPage(response, limit);
      lessons.push(...items);

      const signature = items.map(item => String(item.id)).join(',');
      if (page > 1 && signature && seenPageSignatures.has(signature)) break;
      if (signature) seenPageSignatures.add(signature);

      totalPages = reportedTotalPages;
      // Older deployments omit pagination metadata. Read another page only when
      // the previous one was full, and stop if it repeats.
      if (totalPages === null) totalPages = items.length === limit ? page + 1 : page;
      page += 1;
    } while (page <= totalPages);

    return [...new Map(lessons.map(lesson => [String(lesson.id), lesson])).values()];
  },
  async getPdfs(lessonId: string): Promise<Array<{ id: string; title?: string; url: string; order?: number }>> {
    const { data } = await api.get<any>(`/lessons/${lessonId}/pdfs`);
    const body = data?.data ?? data;
    const list = Array.isArray(body) ? body : body?.items ?? body?.pdfs ?? body?.files ?? [];
    return list.map((pdf: any, index: number) => ({ ...pdf, id: String(pdf.id), title: pdf.title ?? `PDF ${index + 1}`, order: pdf.order ?? index })).sort((a: any, b: any) => a.order - b.order);
  },
  async addPdf(lessonId: string, input: { file?: File; title?: string; url?: string; order?: number }, onProgress?: (progress: { percent: number; loaded: number; total: number }) => void): Promise<void> {
    if (input.file) {
      const body = new FormData(); body.append('file', input.file);
      if (input.title) body.append('title', input.title);
      if (input.order !== undefined) body.append('order', String(input.order));
      await api.post(`/lessons/${lessonId}/pdfs`, body, {
        timeout: 0,
        onUploadProgress: event => {
          if (!onProgress) return;
          const total = event.total || input.file!.size;
          const loaded = Math.min(event.loaded, total);
          onProgress({ percent: Math.min(100, Math.round(loaded * 100 / total)), loaded, total });
        },
      });
    } else {
      await api.post(`/lessons/${lessonId}/pdfs`, { title: input.title, url: input.url, order: input.order }, { timeout: 0 });
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

  /** Fetch published lessons for one module using the same paginated endpoint as mobile. */
  async getByModuleId(moduleId: string, moduleInfo?: BackendModule): Promise<Lesson[]> {
    const limit = 10;
    const lessons: BackendLesson[] = [];
    const module = moduleInfo ?? await modulesService.getById(moduleId).catch(() => undefined);
    let page = 1;
    let totalPages: number | null = null;
    do {
      const { data } = await api.get<any>(`/lessons/module/${moduleId}`, { params: { page, limit } });
      const result = readLessonPage(data, limit);
      lessons.push(...result.items.filter(lesson => String(lesson.moduleId) === String(moduleId)));
      totalPages = result.totalPages ?? (result.items.length === limit ? page + 1 : page);
      page += 1;
    } while (page <= totalPages);
    const result = lessons.map(lesson => adaptLesson(lesson, module ?? (lesson as any).module));
    console.info(`[Module ${moduleId}] Lessons fetched`, result);
    return result;
  },

  /** Fetch only the lessons belonging to modules in a course. */
  async getByCourseId(courseId: string): Promise<Lesson[]> {
    const modules = await modulesService.getByCourse(courseId);
    const moduleIds = [...new Set(modules.map(module => String(module.id)))];
    console.info(`[Course ${courseId}] Course modules`, modules);
    const moduleById = new Map(modules.map(module => [String(module.id), module]));
    const lessonPages = await Promise.all(moduleIds.map(moduleId => this.getByModuleId(moduleId, moduleById.get(moduleId))));
    const adaptedLessons = lessonPages.flat();
    console.info(`[Course ${courseId}] Lessons fetched`, adaptedLessons);
    return adaptedLessons;
  },

  /** GET /lessons/{id} */
  async getById(id: string): Promise<Lesson> {
    const { data } = await api.get<BackendLesson | { data: BackendLesson }>(`/lessons/${id}`);
    const lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);
    const module = (lesson as any).module ?? await modulesService.getById(String(lesson.moduleId)).catch(() => undefined);
    const adapted = adaptLesson(lesson, module);
    try {
      const pdfFiles = await this.getPdfs(id);
      return { ...adapted, pdfFiles };
    } catch {
      return adapted;
    }
  },

  /**
   * POST /lessons (multipart/form-data)
   * Frontend's courseId is treated as moduleId.
   */
  async create(payload: CreateLessonPayload & { courseName?: string; pdf?: File; pdfUrl?: string; videoUrl?: string; content?: string; status?: 'DRAFT' | 'PUBLISHED'; isPublished?: boolean; isPaidCourse?: boolean; moduleId?: number }, onUploadProgress?: (progressEvent: any) => void): Promise<Lesson> {
    const status = payload.status ?? ((payload.isPublished ?? true) ? 'PUBLISHED' : 'DRAFT');
    const isPaid = (payload as any).isPaidCourse === true;
    const courseIdNum = Number(payload.courseId);
    const moduleIdNum = (payload as any).moduleId !== undefined
      ? Number((payload as any).moduleId)
      : (!isPaid && !isNaN(courseIdNum) ? courseIdNum : undefined);

    const fd = buildLessonFormData({
      title: payload.title,
      description: payload.description,
      content: (payload as any).content,
      videoUrl: (payload as any).videoUrl,
      pdfUrl: (payload as any).pdfUrl,
      order: payload.order,
      courseId: isPaid ? courseIdNum : undefined,
      moduleId: moduleIdNum,
      pdf: (payload as any).pdf,
      isFreePreview: (payload as any).isFreePreview,
      status,
      isPublished: payload.isPublished ?? true,
      pdfFiles: (payload as any).pdfFiles,
    });

    const { data } = await api.post<BackendLesson | { data: BackendLesson }>('/lessons', fd, { onUploadProgress, timeout: 0 });
    let lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);

    // Send isReading explicitly via JSON to bypass FormData boolean/string strict validation in backend
    const extraFields = Object.fromEntries(['scheduledAt','durationMinutes','dayNumber','liveStatus','isMandatory','isFreePreview','liveMeetingUrl','recordingVideoUrl','objectives'].filter(key => (payload as any)[key] !== undefined).map(key => [key, (payload as any)[key]]));
    const extraPayload = {
      ...extraFields,
      ...(isPaid && !isNaN(courseIdNum) ? { courseId: courseIdNum } : {}),
      ...((payload as any).isReading !== undefined ? { isReading: (payload as any).isReading } : {})
    };
    if (Object.keys(extraPayload).length) {
      const { data: updatedData } = await api.patch<BackendLesson | { data: BackendLesson }>(`/lessons/${lesson.id}`, extraPayload);
      lesson = (updatedData as { data?: BackendLesson }).data ?? (updatedData as BackendLesson);
    }

    // PDF attachment rows are managed by their dedicated endpoint. The lesson
    // create/update DTO does not reliably persist a `pdfFiles` array.
    const attachedPdfKeys = new Set<string>();
    const pdfUploads: Promise<void>[] = [];
    for (const [index, pdf] of (((payload as any).pdfFiles ?? []) as Array<{ title?: string; url?: string; file?: File; order?: number }>).entries()) {
      if (!pdf?.url && !pdf?.file) continue;
      const key = pdf.file
        ? `${pdf.file.name.toLocaleLowerCase()}-${pdf.file.size}-${pdf.file.lastModified}`
        : `url:${pdf.url}`;
      if (attachedPdfKeys.has(key)) continue;
      attachedPdfKeys.add(key);
      pdfUploads.push(this.addPdf(String(lesson.id), { title: pdf.title, url: pdf.url, file: pdf.file, order: pdf.order ?? index }));
    }
    await Promise.all(pdfUploads);

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

    console.info(`[Lesson ${id}] Updating request sent`);
    console.info(`[Lesson ${id}] Update payload`, logLessonUpdatePayload(fd));
    const { data } = await api.patch<BackendLesson | { data: BackendLesson }>(`/lessons/${id}`, fd, { onUploadProgress, timeout: 0 });
    console.info(`[Lesson ${id}] Server response`, data);
    let lesson = (data as { data?: BackendLesson }).data ?? (data as BackendLesson);

    const extraFields = Object.fromEntries(['scheduledAt','durationMinutes','dayNumber','liveStatus','isMandatory','isFreePreview','liveMeetingUrl','recordingVideoUrl','objectives'].filter(key => (payload as any)[key] !== undefined).map(key => [key, (payload as any)[key]]));
    const extraPayload = { ...extraFields, ...((payload as any).isReading !== undefined ? { isReading: (payload as any).isReading } : {}) };
    if (Object.keys(extraPayload).length) {
      console.info(`[Lesson ${id}] Updating request sent (JSON fields)`);
      console.info(`[Lesson ${id}] Update payload (JSON fields)`, extraPayload);
      const { data: updatedData } = await api.patch<BackendLesson | { data: BackendLesson }>(`/lessons/${id}`, extraPayload);
      console.info(`[Lesson ${id}] Server response (JSON fields)`, updatedData);
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
