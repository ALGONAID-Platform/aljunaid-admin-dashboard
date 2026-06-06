import type { ID } from './common.types';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}
