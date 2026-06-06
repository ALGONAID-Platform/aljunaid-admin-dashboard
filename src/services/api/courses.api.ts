/**
 * Courses API Service — src/services/api/courses.api.ts
 *
 * Fixed:
 * - Course image upload now uses multipart/form-data when a File is provided
 * - Proper thumbnail field handling for both URL strings and File objects
 *
 * Endpoints:
 *   GET    /courses
 *   POST   /courses          (multipart/form-data when image attached)
 *   GET    /courses/{id}
 *   PATCH  /courses/{id}     (multipart/form-data when image attached)
 *   DELETE /courses/{id}
 */

import { api } from '../../lib/api';
import type {
  BackendCourse,
  BackendCoursesListResponse,
  BackendCourseResponse,
} from '../../types/api';
import type { Course, CreateCoursePayload, UpdateCoursePayload } from '../../types';

// ─── Adapter: Backend Course → Frontend Course ────────────────────────────────

function adaptCourse(bc: BackendCourse): Course {
  return {
    id: String(bc.id),
    name: bc.title,
    description: bc.description ?? '',
    level: 'SECONDARY',
    imagePreview: bc.thumbnail ?? undefined,
    lessonsCount: bc._count?.modules ?? 0,
    createdAt: bc.createdAt,
  };
}

// ─── Build request body (JSON or FormData depending on whether image is a File) ─

function buildCourseBody(payload: {
  name?: string;
  description?: string;
  imagePreview?: string;
  imageFile?: File;
}): { body: FormData | Record<string, string>; isFormData: boolean } {
  if (payload.imageFile instanceof File) {
    const fd = new FormData();
    if (payload.name) fd.append('title', payload.name);
    if (payload.description) fd.append('description', payload.description);
    fd.append('thumbnail', payload.imageFile);
    return { body: fd, isFormData: true };
  }

  const body: Record<string, string> = {};
  if (payload.name) body.title = payload.name;
  if (payload.description) body.description = payload.description;
  if (payload.imagePreview) body.thumbnail = payload.imagePreview;
  return { body, isFormData: false };
}

// ─── Courses Service ──────────────────────────────────────────────────────────

export const courseService = {
  async getAll(): Promise<Course[]> {
    const { data } = await api.get<BackendCoursesListResponse | BackendCourse[]>('/courses');
    const list = Array.isArray(data)
      ? data
      : (data as BackendCoursesListResponse).data ?? [];
    return list.map(adaptCourse);
  },

  async getMyCourses(): Promise<Course[]> {
    const { data } = await api.get<BackendCoursesListResponse | BackendCourse[]>('/courses/my-courses');
    const list = Array.isArray(data)
      ? data
      : (data as BackendCoursesListResponse).data ?? [];
    return list.map(adaptCourse);
  },

  async getById(id: string): Promise<Course> {
    const { data } = await api.get<BackendCourseResponse | BackendCourse>(`/courses/${id}`);
    const course = (data as BackendCourseResponse).data ?? (data as BackendCourse);
    return adaptCourse(course);
  },

  async search(query: string): Promise<Course[]> {
    const { data } = await api.get<BackendCoursesListResponse | BackendCourse[]>(
      '/courses/search',
      { params: { q: query } }
    );
    const list = Array.isArray(data)
      ? data
      : (data as BackendCoursesListResponse).data ?? [];
    return list.map(adaptCourse);
  },

  /** POST /courses — supports both JSON (URL thumbnail) and multipart (File thumbnail) */
  async create(payload: CreateCoursePayload & { imageFile?: File }): Promise<Course> {
    const { body, isFormData } = buildCourseBody({
      name: payload.name,
      description: payload.description,
      imagePreview: payload.imagePreview,
      imageFile: payload.imageFile,
    });

    const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const { data } = await api.post<BackendCourseResponse | BackendCourse>('/courses', body, { headers });
    const course = (data as BackendCourseResponse).data ?? (data as BackendCourse);
    return adaptCourse(course);
  },

  /** PATCH /courses/{id} — supports both JSON and multipart */
  async update(payload: UpdateCoursePayload & { imageFile?: File }): Promise<Course> {
    const { id, ...rest } = payload;
    const { body, isFormData } = buildCourseBody({
      name: rest.name,
      description: rest.description,
      imagePreview: rest.imagePreview,
      imageFile: rest.imageFile,
    });

    const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const { data } = await api.patch<BackendCourseResponse | BackendCourse>(`/courses/${id}`, body, { headers });
    const course = (data as BackendCourseResponse).data ?? (data as BackendCourse);
    return adaptCourse(course);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/courses/${id}`);
  },
};
