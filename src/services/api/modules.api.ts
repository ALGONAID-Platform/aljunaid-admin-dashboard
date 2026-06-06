/**
 * Modules API Service — src/services/api/modules.api.ts
 *
 * Endpoints:
 *   GET    /modules
 *   POST   /modules
 *   GET    /modules/course/{courseId}
 *   GET    /modules/{id}
 *   PATCH  /modules/{id}
 *   DELETE /modules/{id}
 */

import { api } from '../../lib/api';
import type { BackendModule, CreateModuleDto, UpdateModuleDto } from '../../types/api';

export const modulesService = {
  /** GET /modules — all modules */
  async getAll(): Promise<BackendModule[]> {
    const { data } = await api.get<BackendModule[] | { data: BackendModule[] }>('/modules');
    return Array.isArray(data) ? data : (data as { data: BackendModule[] }).data ?? [];
  },

  /** GET /modules/course/{courseId} */
  async getByCourse(courseId: number | string): Promise<BackendModule[]> {
    const { data } = await api.get<BackendModule[] | { data: BackendModule[] }>(
      `/modules/course/${courseId}`
    );
    return Array.isArray(data) ? data : (data as { data: BackendModule[] }).data ?? [];
  },

  /** GET /modules/{id} */
  async getById(id: number | string): Promise<BackendModule> {
    const { data } = await api.get<BackendModule | { data: BackendModule }>(`/modules/${id}`);
    return (data as { data?: BackendModule }).data ?? (data as BackendModule);
  },

  /** POST /modules */
  async create(dto: CreateModuleDto): Promise<BackendModule> {
    const { data } = await api.post<BackendModule | { data: BackendModule }>('/modules', dto);
    return (data as { data?: BackendModule }).data ?? (data as BackendModule);
  },

  /** PATCH /modules/{id} */
  async update(id: number | string, dto: UpdateModuleDto): Promise<BackendModule> {
    const { data } = await api.patch<BackendModule | { data: BackendModule }>(`/modules/${id}`, dto);
    return (data as { data?: BackendModule }).data ?? (data as BackendModule);
  },

  /** DELETE /modules/{id} */
  async delete(id: number | string): Promise<void> {
    await api.delete(`/modules/${id}`);
  },
};
