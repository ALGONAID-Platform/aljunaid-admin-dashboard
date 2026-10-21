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
import { mediaApi } from './media.api';

// ─── Adapter: Backend Course → Frontend Course ────────────────────────────────

function adaptCourse(bc: BackendCourse): Course {
  return {
    ...bc,
    id: String(bc.id),
    title: bc.title,
    description: bc.description ?? '',
    thumbnail: bc.thumbnail ?? undefined,
    lessonsCount: bc.lessonsCount ?? bc.totalLessons ?? bc._count?.modules ?? 0,
    enrolledStudentsCount: bc._count?.enrollments,
    createdAt: bc.createdAt ?? new Date().toISOString(),
  };
}

// ─── Courses Service ──────────────────────────────────────────────────────────

export const courseService = {
  async convertToRecorded(id: string, prices: Record<string, number | undefined> = {}): Promise<void> {
    await api.patch(`/courses/${id}/convert-to-recorded`, prices);
  },
  async getAll(): Promise<Course[]> {
    const [freeResponse, paidResponse] = await Promise.all([
      api.get<BackendCoursesListResponse | BackendCourse[]>('/courses'),
      api.get<BackendCoursesListResponse | BackendCourse[]>('/courses/paid'),
    ]);
    const asList = (data: BackendCoursesListResponse | BackendCourse[]) => Array.isArray(data) ? data : (data as BackendCoursesListResponse).data ?? [];
    const merged = [...asList(freeResponse.data), ...asList(paidResponse.data)];
    return [...new Map(merged.map(course => [String(course.id), adaptCourse(course)])).values()];
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
    const { data } = await api.get<any>('/courses/search', {
      params: { q: query }
    });
    const list = Array.isArray(data)
      ? data
      : data.courses ?? (data as BackendCoursesListResponse).data ?? [];
    return list.map(adaptCourse);
  },


  /** POST /courses — uses upload service for file then sends JSON */
  async create(payload: CreateCoursePayload & { imageFile?: File }, onUploadProgress?: (p: any) => void): Promise<Course> {
    let thumbnailUrl = payload.thumbnail;

    if (payload.imageFile) {
      const result = await mediaApi.uploadImage(payload.imageFile, onUploadProgress);
      thumbnailUrl = result.data.url;
    }

    const { imageFile: _imageFile, ...body } = payload;
    Object.assign(body, { thumbnail: thumbnailUrl });

    const { data } = await api.post<BackendCourseResponse | BackendCourse>('/courses', body);
    const course = (data as BackendCourseResponse).data ?? (data as BackendCourse);
    return adaptCourse(course);
  },

  /** PATCH /courses/{id} — uses upload service for file then sends JSON */
  async update(payload: UpdateCoursePayload & { imageFile?: File }, onUploadProgress?: (p: any) => void): Promise<Course> {
    const { id, ...rest } = payload;
    let thumbnailUrl = rest.thumbnail;

    if (rest.imageFile) {
      const result = await mediaApi.uploadImage(rest.imageFile, onUploadProgress);
      thumbnailUrl = result.data.url;
    }

    const { imageFile: _imageFile, ...body } = rest;
    Object.assign(body, { thumbnail: thumbnailUrl });

    const { data } = await api.patch<BackendCourseResponse | BackendCourse>(`/courses/${id}`, body);
    const course = (data as BackendCourseResponse).data ?? (data as BackendCourse);
    return adaptCourse(course);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/courses/${id}`);
  },
};
