/**
 * Users API Service — src/services/api/users.api.ts
 */

import { api } from '../../lib/api';
import type { BackendProfile, BackendBadge, UpdateProfileDto } from '../../types/api';
import type { User } from '../../types';

export interface UnverifiedUser {
  id: string | number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  emailVerified?: boolean;
  createdAt?: string | null;
  registeredAt?: string | null;
  academicId?: string | null;
  grade?: string | number | null;
  student?: Record<string, any> | null;
  studentProfile?: Record<string, any> | null;
  profile?: Record<string, any> | null;
  [key: string]: any;
}

export interface UnverifiedUsersPage {
  users: UnverifiedUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function adaptProfile(p: BackendProfile): User {
  return {
    id: String(p.id),
    name: p.name,
    email: p.email,
    role: p.role.toLowerCase() as User['role'],
    avatarUrl: p.avatarUrl,
    isActive: true,
    createdAt: p.createdAt ?? new Date().toISOString(),
  };
}

export const usersService = {
  async getUnverified(params: { page: number; limit: number; search?: string }): Promise<UnverifiedUsersPage> {
    const { data } = await api.get<any>('/users/unverified', {
      params: { page: params.page, limit: params.limit, ...(params.search?.trim() ? { search: params.search.trim() } : {}) },
    });
    const root = data ?? {};
    let payload = root;
    for (let depth = 0; depth < 4 && payload && !Array.isArray(payload) && typeof payload === 'object' && 'data' in payload; depth += 1) {
      const next = payload.data;
      if (Array.isArray(next)) { payload = next; break; }
      if (next && typeof next === 'object') payload = next;
      else break;
    }
    const users = Array.isArray(payload)
      ? payload
      : payload?.users ?? payload?.items ?? payload?.results ?? [];
    const meta = root?.meta ?? root?.pagination ?? payload?.meta ?? payload?.pagination ?? {};
    const total = Number(meta.total ?? meta.totalItems ?? users.length) || 0;
    const page = Number(meta.page ?? params.page) || params.page;
    const limit = Number(meta.limit ?? params.limit) || params.limit;
    const totalPages = Number(meta.totalPages ?? meta.lastPage) || Math.ceil(total / limit);
    return { users, meta: { total, page, limit, totalPages } };
  },

  async verifyAccount(id: string | number): Promise<void> {
    await api.post(`/users/${encodeURIComponent(String(id))}/verify`, { verified: true });
  },

  async setVerified(id: string, verified: boolean): Promise<boolean> {
    const { data } = await api.patch<any>(`/users/${id}/verify`, { verified });
    const response = data?.data ?? data;
    return Boolean(response?.emailVerified ?? verified);
  },
  async getProfile(): Promise<User> {
    const { data } = await api.get<BackendProfile | { data: BackendProfile }>('/users/profile');
    const profile = (data as { data?: BackendProfile }).data ?? (data as BackendProfile);
    return adaptProfile(profile);
  },

  async updateProfile(dto: UpdateProfileDto): Promise<User> {
    const { data } = await api.patch<BackendProfile | { data: BackendProfile }>('/users/profile', dto);
    const profile = (data as { data?: BackendProfile }).data ?? (data as BackendProfile);
    return adaptProfile(profile);
  },

  async getBadges(): Promise<BackendBadge[]> {
    const { data } = await api.get<BackendBadge[] | { data: BackendBadge[] }>('/users/profile/badges');
    return Array.isArray(data) ? data : (data as { data: BackendBadge[] }).data ?? [];
  },
};
