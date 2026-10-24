import { api } from '../../lib/api';

export interface BroadcastNotificationPayload {
  message: string;
  courseId?: string | number;
}

export interface BroadcastNotificationResult {
  status: number;
  recipientsCount: number;
  message?: string;
}

export const notificationsService = {
  async broadcastToMyStudents(payload: BroadcastNotificationPayload): Promise<BroadcastNotificationResult> {
    const response = await api.post<any>('/notifications/broadcast-my-students', payload);
    const body = response.data?.data ?? response.data ?? {};
    return {
      status: response.status,
      recipientsCount: Number(body.recipientsCount ?? 0),
      message: body.message,
    };
  },
};
