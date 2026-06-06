/**
 * Enrollment API Service — src/services/api/enrollment.api.ts
 */

import { api } from '../../lib/api';
import type { BackendEnrollment, CreateEnrollmentDto } from '../../types/api';

export const enrollmentService = {
  async enroll(courseId: number): Promise<BackendEnrollment> {
    const dto: CreateEnrollmentDto = { courseId };
    const { data } = await api.post<BackendEnrollment | { data: BackendEnrollment }>('/enrollment', dto);
    return (data as { data?: BackendEnrollment }).data ?? (data as BackendEnrollment);
  },

  async checkEnrollment(courseId: number): Promise<{ isEnrolled: boolean }> {
    const { data } = await api.get<{ isEnrolled: boolean } | { data: { isEnrolled: boolean } }>(
      '/enrollment/check-enrollment',
      { params: { courseId } }
    );
    return (data as { data?: { isEnrolled: boolean } }).data ?? (data as { isEnrolled: boolean });
  },
};
