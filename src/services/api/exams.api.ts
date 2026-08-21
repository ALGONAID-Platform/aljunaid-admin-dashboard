/**
 * Exams API Service — src/services/api/exams.api.ts
 *
 * Replaces: src/services/quiz.service.ts (mock)
 *
 * The frontend calls these "quizzes" — the backend calls them "exams".
 * We adapt the backend Exam shape to match the frontend Quiz interface.
 *
 * Endpoints:
 *   POST   /exams
 *   GET    /exams/{id}
 *   PATCH  /exams/{id}
 *   DELETE /exams/{id}
 *   POST   /exams/{examId}/start
 *   POST   /exams/attempts/{attemptId}/submit
 *   GET    /exams/attempts/{attemptId}/result
 */

import { api } from '../../lib/api';
import type {
  BackendExam,
  CreateExamDto,
  UpdateExamDto,
  SubmitExamDto,
} from '../../types/api';
import type { Quiz, CreateQuizPayload, UpdateQuizPayload, Question } from '../../types';

// ─── Adapters ─────────────────────────────────────────────────────────────────

function adaptExamToQuiz(exam: any): Quiz {
  const questions: Question[] = (exam.questions ?? []).map((q: any) => ({
    id: String(q.id ?? Math.random()),
    type: q.type === 'TRUE_FALSE' ? 'truefalse' : 'mcq',
    text: q.text,
    imageUrl: q.imageUrl ?? q.questionImageUrl,
    options: (q.options ?? []).map((o: any) => o.text),
    correctAnswer: (q.options ?? []).find((o: any) => o.isCorrect)?.text ?? '',
    points: q.points,
  }));

  return {
    id: String(exam.id),
    courseId: String(exam.lesson?.module?.courseId || ''),
    lessonId: String(exam.lessonId),
    courseName: exam.lesson?.module?.course?.title || '',
    lessonTitle: exam.lesson?.title || '',
    title: exam.title,
    description: exam.description ?? '',
    instructions: '',
    passingScore: exam.passingScore,
    timeLimit: 30, // Backend has no timeLimit — default 30 min
    questions,
    createdAt: exam.createdAt ?? new Date().toISOString(),
  };
}

function adaptQuizToCreateExamDto(payload: CreateQuizPayload): CreateExamDto {
  return {
    title: payload.title,
    description: payload.description,
    passingScore: payload.passingScore,
    maxAttempts: 3,
    lessonId: Number(payload.lessonId),
    questions: payload.questions.map((q) => ({
      text: q.text?.trim() ?? '',
      type: q.type === 'truefalse' ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
      points: q.points ?? 1,
      imageUrl: q.imageUrl?.trim() || undefined,
      options: (() => {
        let opts = q.type === 'truefalse' ? ['صح', 'خطأ'] : (q.options ?? []);
        if (opts.length === 0) opts = ['خيار 1', 'خيار 2'];
        if (opts.length === 1) opts = [...opts, 'خيار إضافي'];
        return opts.map((opt) => ({
          text: opt || 'خيار',
          isCorrect: opt === q.correctAnswer,
        }));
      })(),
    })),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const quizService = {
  async getAll(): Promise<Quiz[]> {
    const { data } = await api.get<BackendExam[] | { data: BackendExam[] }>('/exams');
    const exams = (data as { data?: BackendExam[] }).data ?? (data as BackendExam[]);
    return exams.map(adaptExamToQuiz);
  },

  /** GET /exams/{id} */
  async getById(id: string): Promise<Quiz> {
    const { data } = await api.get<BackendExam | { data: BackendExam }>(`/exams/${id}`);
    const exam = (data as { data?: BackendExam }).data ?? (data as BackendExam);
    return adaptExamToQuiz(exam);
  },

  /** POST /exams */
  async create(
    payload: CreateQuizPayload & { courseName: string; lessonTitle: string }
  ): Promise<Quiz> {
    const dto = adaptQuizToCreateExamDto(payload);
    const { data } = await api.post<BackendExam | { data: BackendExam }>('/exams', dto);
    const exam = (data as { data?: BackendExam }).data ?? (data as BackendExam);
    const quiz = adaptExamToQuiz(exam);
    // Restore frontend-only fields from payload
    return { ...quiz, courseId: payload.courseId, courseName: payload.courseName, lessonTitle: payload.lessonTitle };
  },

  /** PATCH /exams/{id} */
  async update(payload: UpdateQuizPayload): Promise<Quiz> {
    const { id, ...rest } = payload;
    const dto: UpdateExamDto = {};
    if (rest.title) dto.title = rest.title;
    if (rest.description) dto.description = rest.description;
    if (rest.passingScore !== undefined) dto.passingScore = rest.passingScore;
    if (rest.lessonId !== undefined) dto.lessonId = Number(rest.lessonId);
    if (rest.questions) {
      dto.questions = rest.questions.map((q) => ({
        text: q.text?.trim() ?? '',
        type: q.type === 'truefalse' ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
        points: q.points ?? 1,
        imageUrl: q.imageUrl?.trim() || undefined,
        options: (() => {
          let opts = q.type === 'truefalse' ? ['صح', 'خطأ'] : (q.options ?? []);
          if (opts.length === 0) opts = ['خيار 1', 'خيار 2'];
          if (opts.length === 1) opts = [...opts, 'خيار إضافي'];
          return opts.map((opt) => ({
            text: opt || 'خيار',
            isCorrect: opt === q.correctAnswer,
          }));
        })(),
      }));
    }

    try {
      const { data } = await api.patch<BackendExam | { data: BackendExam }>(`/exams/${id}`, dto);
      const exam = (data as { data?: BackendExam }).data ?? (data as BackendExam);
      return adaptExamToQuiz(exam);
    } catch (err: any) {
      console.error('BACKEND VALIDATION ERROR:', err.response?.data);
      alert('تفاصيل الخطأ من الباك اند: ' + JSON.stringify(err.response?.data?.message || err.message));
      throw err;
    }
  },

  /** DELETE /exams/{id} */
  async delete(id: string): Promise<void> {
    await api.delete(`/exams/${id}`);
  },

  /** POST /exams/{examId}/start */
  async startExam(examId: string): Promise<unknown> {
    const { data } = await api.post(`/exams/${examId}/start`);
    return data;
  },

  /** POST /exams/attempts/{attemptId}/submit */
  async submitExam(attemptId: string, dto: SubmitExamDto): Promise<unknown> {
    const { data } = await api.post(`/exams/attempts/${attemptId}/submit`, dto);
    return data;
  },

  /** GET /exams/attempts/{attemptId}/result */
  async getResult(attemptId: string): Promise<unknown> {
    const { data } = await api.get(`/exams/attempts/${attemptId}/result`);
    return data;
  },

  /** POST /exams/upload-image */
  async uploadImage(file: File, onUploadProgress?: (progress: { percent: number; loaded: number; total: number }) => void): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post<{ imageUrl?: string; url?: string; data?: { imageUrl?: string; url?: string } }>('/exams/upload-image', formData, {
      onUploadProgress: (evt) => {
        if (onUploadProgress && evt.total) {
          onUploadProgress({
            loaded: evt.loaded,
            total: evt.total,
            percent: Math.round((evt.loaded * 100) / evt.total),
          });
        }
      },
    });
    const imageUrl = data.imageUrl ?? data.url ?? data.data?.imageUrl ?? data.data?.url;
    if (!imageUrl) {
      throw new Error('Server rejected the uploaded file.');
    }
    return imageUrl;
  },
};
