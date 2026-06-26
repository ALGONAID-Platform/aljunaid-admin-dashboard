/**
 * Publish Service — src/services/api/publish.api.ts
 *
 * Replaces: src/services/publish.service.ts (mock)
 *
 * Backend has no explicit publish endpoint.
 * We track publish state via lesson update (isPublished is frontend-only).
 */

import { api } from '../../lib/api';
import { lessonService } from './lessons.api';
import type { Lesson } from '../../types';

export const publishService = {
  async publishLesson(lessonId: string): Promise<Lesson> {
    const fd = new FormData();
    fd.append('status', 'PUBLISHED');
    await api.patch(`/lessons/${lessonId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return lessonService.getById(lessonId);
  },

  async unpublishLesson(lessonId: string): Promise<Lesson> {
    const fd = new FormData();
    fd.append('status', 'DRAFT');
    await api.patch(`/lessons/${lessonId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return lessonService.getById(lessonId);
  },

  async publishAll(lessonIds: string[]): Promise<Lesson[]> {
    return Promise.all(
      lessonIds.map(async (id) => {
        return this.publishLesson(id);
      })
    );
  },
};
