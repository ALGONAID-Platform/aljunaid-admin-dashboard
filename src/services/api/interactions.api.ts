/**
 * Interactions & Reviews API Service — src/services/api/interactions.api.ts
 *
 * Provides API helpers for:
 * 1. Mentions, Comments, & Notifications for Admin/Teacher (GET /comments/mentions/my)
 * 2. Unread mentions counter (GET /comments/mentions/unread-count)
 * 3. Mark mention as read (PATCH /comments/mentions/:id/read)
 * 4. Replying to lesson/exam comments (POST /comments)
 * 5. Replying to community post comments (POST /posts/:postId/comments)
 * 6. Course ratings and student reviews (GET /courses/:courseId/reviews)
 */

import { api } from '../../lib/api';

export interface MentionUser {
  id: number;
  name: string;
  avatar?: string | null;
}

export interface MentionCommentData {
  id: number;
  text: string;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lessonId?: number | null;
  examId?: number | null;
  postId?: number | null;
  lesson?: { id: number; title: string } | null;
  exam?: { id: number; title: string } | null;
  post?: { id: number; title: string } | null;
  user?: MentionUser | null;
  parentId?: number | null;
}

export interface MentionItem {
  id: number;
  isRead: boolean;
  createdAt: string;
  type: string; // 'MENTION' | 'REPLY' | 'ASSIGNMENT_SUBMISSION' | 'EXAM_RESULT' | 'SYSTEM' | 'NEW_LESSON' etc.
  commentId?: number;
  mentionedUserId: number;
  comment?: MentionCommentData;
  postComment?: MentionCommentData;
  post?: {
    id: number;
    title?: string;
    content?: string;
    imageUrl?: string | null;
    author?: MentionUser | null;
  };
}

export interface MentionsResponse {
  data: MentionItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CourseReviewItem {
  id: number;
  courseId: number;
  rating: number; // 1 to 5
  comment?: string | null;
  createdAt: string;
  student?: {
    user?: {
      name: string;
      avatar?: string | null;
    };
  };
}

export const interactionsService = {
  /**
   * Fetch all mentions, comments, replies & student interactions directed to the admin/teacher
   */
  async getMyMentions(page = 1, limit = 20): Promise<MentionsResponse> {
    const res = await api.get<MentionsResponse>('/comments/mentions/my', {
      params: { page, limit },
    });
    return res.data;
  },

  /**
   * Get unread mentions count
   */
  async getUnreadCount(): Promise<number> {
    const res = await api.get<{ count: number }>('/comments/mentions/unread-count');
    return Number(res.data?.count ?? 0);
  },

  /**
   * Mark a mention as read
   */
  async markAsRead(mentionId: number): Promise<void> {
    await api.patch(`/comments/mentions/${mentionId}/read`);
  },

  /**
   * Reply to a lesson or exam comment
   */
  async replyToLessonOrExamComment(payload: {
    text: string;
    parentId: number;
    lessonId?: number;
    examId?: number;
    mentionedUserIds?: number[];
  }) {
    const res = await api.post('/comments', payload);
    return res.data;
  },

  /**
   * Reply to a post comment
   */
  async replyToPostComment(
    postId: number,
    payload: {
      text: string;
      parentId?: number;
      mentionedUserIds?: number[];
    }
  ) {
    const res = await api.post(`/posts/${postId}/comments`, payload);
    return res.data;
  },

  /**
   * Fetch reviews & ratings for a specific course
   */
  async getCourseReviews(courseId: number): Promise<CourseReviewItem[]> {
    const res = await api.get<CourseReviewItem[]>(`/courses/${courseId}/reviews`);
    return Array.isArray(res.data) ? res.data : [];
  },
};
