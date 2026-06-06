/**
 * Users API Service — src/services/api/users.api.ts
 */

import { api } from '../../lib/api';
import type { BackendProfile, BackendBadge, UpdateProfileDto } from '../../types/api';
import type { User } from '../../types';

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
