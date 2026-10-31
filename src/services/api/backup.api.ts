/**
 * Database Backup API Service — src/services/api/backup.api.ts
 */

import { api } from '../../lib/api';

export interface BackupItem {
  version: string;
  engine: string;
  format: 'json' | 'sql';
  fileName: string;
  fileSize: number;
  formattedSize: string;
  checksum: string;
  createdAt: string;
  creator?: {
    id: number;
    email: string;
    role: string;
  };
  note?: string;
  tablesCount: number;
  totalRecords: number;
  tableRecords?: Record<string, number>;
}

export interface VerifyBackupResult {
  success: boolean;
  valid: boolean;
  message: string;
  checksum: string;
  checksumMatched: boolean;
  tablesCount: number;
  totalRecords: number;
  tableRecords: Record<string, number>;
}

export interface RestoreBackupResult {
  success: boolean;
  message: string;
  details: {
    restoredFile: string;
    preRestoreSnapshot?: string;
    restoredAt: string;
    tablesRestored: number;
    totalRecordsRestored: number;
    verificationStatus: string;
    liveCounts?: Record<string, number>;
  };
}

export const backupService = {
  /**
   * جلب قائمة النسخ الاحتياطية المحفوظة على السيرفر
   */
  async list(): Promise<BackupItem[]> {
    const { data } = await api.get<{ success: boolean; total: number; backups: BackupItem[] }>('/admin/backup');
    return data?.backups || [];
  },

  /**
   * إنشاء نسخة احتياطية جديدة
   */
  async create(params?: { format?: 'json' | 'sql'; note?: string }): Promise<BackupItem> {
    const { data } = await api.post<{ success: boolean; message: string; backup: BackupItem }>(
      '/admin/backup/create',
      params || {},
    );
    return data.backup;
  },

  /**
   * فحص والتحقق من سلامة نسخة احتياطية
   */
  async verify(fileName: string): Promise<VerifyBackupResult> {
    const { data } = await api.get<VerifyBackupResult>(`/admin/backup/${encodeURIComponent(fileName)}/verify`);
    return data;
  },

  /**
   * تحميل ملف النسخة الاحتياطية إلى جهاز المستخدم
   */
  async download(fileName: string): Promise<void> {
    const response = await api.get(`/admin/backup/${encodeURIComponent(fileName)}/download`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * استرجاع قاعدة البيانات من نسخة محفوظة على السيرفر أو عبر رفع ملف
   */
  async restore(params: {
    fileName?: string;
    confirmPassword?: string;
    file?: File;
  }): Promise<RestoreBackupResult> {
    if (params.file) {
      const formData = new FormData();
      formData.append('file', params.file);
      if (params.confirmPassword) {
        formData.append('confirmPassword', params.confirmPassword);
      }
      const { data } = await api.post<RestoreBackupResult>('/admin/backup/restore', formData);
      return data;
    }

    const { data } = await api.post<RestoreBackupResult>('/admin/backup/restore', {
      fileName: params.fileName,
      confirmPassword: params.confirmPassword,
    });
    return data;
  },

  /**
   * حذف نسخة احتياطية قديمة من السيرفر
   */
  async delete(fileName: string): Promise<void> {
    await api.delete(`/admin/backup/${encodeURIComponent(fileName)}`);
  },
};
