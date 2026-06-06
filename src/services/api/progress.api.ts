/**
 * Progress API Service — src/services/api/progress.api.ts
 */

import { api } from '../../lib/api';
import type { UpdateProgressDto, CourseProgressResponse } from '../../types/api';

export const progressService = {
  async updateProgress(dto: UpdateProgressDto): Promise<void> {
    await api.post('/progress/update', dto);
  },

  async getCourseProgress(courseId: number | string): Promise<CourseProgressResponse> {
    const { data } = await api.get<CourseProgressResponse>(`/progress/course/${courseId}`);
    return data;
  },

  async getLastWatched(): Promise<unknown> {
    const { data } = await api.get('/progress/last-watched');
    return data;
  },

  async getLastAccessedModule(): Promise<unknown> {
    const { data } = await api.get('/progress/last-accessed-module');
    return data;
  },

  async getExcellenceCourses(): Promise<unknown> {
    const { data } = await api.get('/progress/excellence-courses');
    return data;
  },

  async getExcellenceModules(courseId: number | string): Promise<unknown> {
    const { data } = await api.get(`/progress/course/${courseId}/excellence-modules`);
    return data;
  },

  async getModuleGrades(moduleId: number | string): Promise<unknown> {
    const { data } = await api.get(`/progress/module/${moduleId}/grades`);
    return data;
  },

  async getCourseGrades(courseId: number | string): Promise<unknown> {
    const { data } = await api.get(`/progress/course/${courseId}/grades`);
    return data;
  },

  async getTotalPoints(): Promise<{ totalPoints: number }> {
    const { data } = await api.get<{ totalPoints: number }>('/progress/total-points');
    return data;
  },
};
