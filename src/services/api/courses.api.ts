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
  const course = bc as BackendCourse & Record<string, any>;
  const rawThumbnail = bc.thumbnail
    || course.thumbnailUrl
    || course.imageUrl
    || course.image
    || course.cover
    || course.coverImage
    || course.picture
    || undefined;
  return {
    ...bc,
    id: String(bc.id),
    title: bc.title,
    description: bc.description ?? '',
    thumbnail: rawThumbnail,
    lessonsCount: bc.lessonsCount ?? bc.totalLessons ?? 0,
    enrolledStudentsCount: course.enrollmentsCount ?? bc._count?.enrollments,
    modulesCount: course.modulesCount ?? bc._count?.modules ?? 0,
    practiceExamsCount: course.practiceExamsCount ?? 0,
    examsCount: course.examsCount ?? 0,
    isFull: course.isFull,
    remainingSeats: course.remainingSeats,
    createdAt: bc.createdAt ?? new Date().toISOString(),
  };
}

// ─── Courses Service ──────────────────────────────────────────────────────────

export const courseService = {
  async convertToRecorded(id: string, prices: Record<string, number | undefined> = {}): Promise<void> {
    await api.patch(`/courses/${id}/convert-to-recorded`, prices);
  },
  async getAll(): Promise<Course[]> {
    const [freeResponse, paidCourses] = await Promise.all([
      api.get<BackendCoursesListResponse | BackendCourse[]>('/courses'),
      this.getAdminPaidCourses(),
    ]);
    const asList = (data: BackendCoursesListResponse | BackendCourse[]) => Array.isArray(data) ? data : (data as BackendCoursesListResponse).data ?? [];
    const merged = [...asList(freeResponse.data), ...paidCourses];
    return [...new Map(merged.map(course => [String(course.id), adaptCourse(course)])).values()];
  },

  /** Load every paid course using the admin endpoint and its page metadata. */
  async getAdminPaidCourses(): Promise<BackendCourse[]> {
    const limit = 100;
    const readPage = async (page: number) => (await api.get<any>('/courses/admin/paid', { params: { page, limit } })).data;
    const first = await readPage(1);
    const unwrapPage = (response: any) => {
      let body = response;
      if (!Array.isArray(body) && body?.data && !Array.isArray(body.data) && body.data.data) body = body.data;
      if (Array.isArray(body)) return { items: body as BackendCourse[], totalPages: 1, paginated: false };
      return {
        items: (Array.isArray(body?.data) ? body.data : []) as BackendCourse[],
        totalPages: Math.max(1, Number(body?.meta?.totalPages) || 1),
        paginated: Boolean(body?.meta),
      };
    };
    const firstPage = unwrapPage(first);
    if (!firstPage.paginated) return firstPage.items;

    const totalPages = firstPage.totalPages;
    const remaining = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => readPage(index + 2)));
    return [firstPage.items, ...remaining.map((response) => unwrapPage(response).items)].flat();
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


  /** POST /courses — uses upload service for file then sends JSON strictly adhering to CreateCourseDto */
  async create(payload: CreateCoursePayload & { imageFile?: File }, onUploadProgress?: (p: any) => void): Promise<Course> {
    let thumbnailUrl = payload.thumbnail;

    if (payload.imageFile) {
      const result = await mediaApi.uploadImage(payload.imageFile, onUploadProgress);
      thumbnailUrl = result.data.url;
    }

    const { imageFile: _imageFile, ...rawBody } = payload;
    // Strictly whitelist fields for CreateCourseDto — forbidNonWhitelisted rejects imageUrl, image, etc.
    const body: Record<string, any> = {
      title: rawBody.title || (rawBody as any).name,
      description: rawBody.description,
      thumbnail: thumbnailUrl,
      isPaid: rawBody.isPaid,
      courseType: rawBody.courseType,
      price: rawBody.price,
      discountedPrice: rawBody.discountedPrice,
      priceYerOld: rawBody.priceYerOld,
      discountedPriceYerOld: rawBody.discountedPriceYerOld,
      priceYerNew: rawBody.priceYerNew,
      discountedPriceYerNew: rawBody.discountedPriceYerNew,
      priceSar: rawBody.priceSar,
      discountedPriceSar: rawBody.discountedPriceSar,
      scheduleDaysText: rawBody.scheduleDaysText,
      maxStudents: rawBody.maxStudents,
      startDate: rawBody.startDate,
      endDate: rawBody.endDate,
      durationWeeks: rawBody.durationWeeks,
      scheduleDays: rawBody.scheduleDays,
      objectives: rawBody.objectives,
      certificateMinScore: rawBody.certificateMinScore,
      certificateMinAttendance: rawBody.certificateMinAttendance,
    };

    // Remove undefined or null keys
    for (const key of Object.keys(body)) {
      if (body[key] === undefined || body[key] === null || body[key] === '') {
        delete body[key];
      }
    }

    const { data } = await api.post<BackendCourseResponse | BackendCourse>('/courses', body);
    const course = (data as BackendCourseResponse).data ?? (data as BackendCourse);
    return adaptCourse(course);
  },

  /** PATCH /courses/{id} — uses upload service for file then sends JSON strictly adhering to UpdateCourseDto */
  async update(payload: UpdateCoursePayload & { imageFile?: File }, onUploadProgress?: (p: any) => void): Promise<Course> {
    const { id, ...rest } = payload;
    let thumbnailUrl = rest.thumbnail;

    if (rest.imageFile) {
      const result = await mediaApi.uploadImage(rest.imageFile, onUploadProgress);
      thumbnailUrl = result.data.url;
    }

    const { imageFile: _imageFile, ...rawBody } = rest;
    const body: Record<string, any> = {
      title: rawBody.title || (rawBody as any).name,
      description: rawBody.description,
      thumbnail: thumbnailUrl,
      isPaid: rawBody.isPaid,
      courseType: rawBody.courseType,
      price: rawBody.price,
      discountedPrice: rawBody.discountedPrice,
      priceYerOld: rawBody.priceYerOld,
      discountedPriceYerOld: rawBody.discountedPriceYerOld,
      priceYerNew: rawBody.priceYerNew,
      discountedPriceYerNew: rawBody.discountedPriceYerNew,
      priceSar: rawBody.priceSar,
      discountedPriceSar: rawBody.discountedPriceSar,
      scheduleDaysText: rawBody.scheduleDaysText,
      maxStudents: rawBody.maxStudents,
      startDate: rawBody.startDate,
      endDate: rawBody.endDate,
      durationWeeks: rawBody.durationWeeks,
      scheduleDays: rawBody.scheduleDays,
      objectives: rawBody.objectives,
      certificateMinScore: rawBody.certificateMinScore,
      certificateMinAttendance: rawBody.certificateMinAttendance,
    };

    for (const key of Object.keys(body)) {
      if (body[key] === undefined || body[key] === null || body[key] === '') {
        delete body[key];
      }
    }

    const { data } = await api.patch<BackendCourseResponse | BackendCourse>(`/courses/${id}`, body);
    const course = (data as BackendCourseResponse).data ?? (data as BackendCourse);
    return adaptCourse(course);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/courses/${id}`);
  },
};
