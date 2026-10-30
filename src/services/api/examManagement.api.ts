import { api } from '../../lib/api';
import type { CreateExamDto, BackendExam } from '../../types/api';
import type { AdminExam, ExamLeaderboard, ExamPayload, ExamQuestion, ExamStats } from '../../types/exam.types';

function unwrap<T>(value: T | { data: T }): T {
  return value && typeof value === 'object' && 'data' in value
    ? (value as { data: T }).data
    : value as T;
}

export function extractQuestionImageUrl(q: any): string | null {
  if (!q || typeof q !== 'object') return null;
  const candidate =
    q.imageUrl ??
    q.questionImageUrl ??
    q.image ??
    q.photo ??
    q.url ??
    q.mediaUrl ??
    q.image_url ??
    q.question_image_url ??
    q.filePath ??
    q.path ??
    q.thumbnail ??
    q.thumbnailUrl ??
    q.media?.url ??
    q.media?.secure_url ??
    q.attachment ??
    null;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim();
  }
  if (candidate && typeof candidate === 'object') {
    const nested = candidate.url ?? candidate.imageUrl ?? candidate.path ?? candidate.secure_url;
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim();
    }
  }
  return null;
}

function adaptExam(exam: BackendExam & Record<string, any>): AdminExam {
  return {
    id: String(exam.id),
    title: exam.title,
    description: exam.description ?? '',
    imageUrl: exam.imageUrl ?? exam.image ?? exam.coverImage ?? exam.thumbnail ?? null,
    examType: exam.examType ?? (exam.lessonId ? 'LESSON_QUIZ' : 'COURSE_QUIZ'),
    rankingCriteria: exam.rankingCriteria ?? 'BOTH',
    passingScore: exam.passingScore,
    maxAttempts: exam.maxAttempts,
    timeLimit: exam.timeLimit,
    startTime: exam.startTime,
    endTime: exam.endTime,
    lessonId: exam.lessonId == null ? null : String(exam.lessonId),
    courseId: exam.courseId == null
      ? (exam.lesson?.module?.courseId ?? exam.lesson?.module?.course?.id ?? null)?.toString() ?? null
      : String(exam.courseId),
    lessonTitle: exam.lesson?.title,
    courseTitle: exam.course?.title ?? exam.lesson?.module?.course?.title,
    asAssignment: exam.asAssignment ?? Boolean(exam.assignment),
    createdAt: exam.createdAt,
    totalQuestions: exam.totalQuestions ?? exam.questions?.length ?? 0,
    totalPoints: exam.totalPoints,
    participantsCount: exam.participantsCount ?? exam._count?.attempts ?? 0,
  };
}

function buildDto(payload: ExamPayload): CreateExamDto {
  const { questions, ...metadata } = payload;
  return {
    ...metadata,
    ...(questions ? {
      questions: questions.map((question: any) => ({
        text: question.text.trim(),
        type: question.type,
        points: question.points,
        ...(question.imageUrl ? { imageUrl: String(question.imageUrl).trim() } : {}),
        options: question.options.map(({ text, isCorrect }: any) => ({ text: text.trim(), isCorrect: Boolean(isCorrect) })),
      })),
    } : {}),
  } as CreateExamDto;
}

export const examManagementService = {
  async getAll(): Promise<AdminExam[]> {
    const { data } = await api.get<BackendExam[] | { data: BackendExam[] }>('/exams');
    return unwrap(data).map((exam) => adaptExam(exam as BackendExam & Record<string, any>));
  },

  async getById(id: string): Promise<AdminExam & { questions: ExamQuestion[] }> {
    const { data } = await api.get<any>(`/exams/${id}`);
    const rawExam = unwrap(data);
    const exam = rawExam?.exam ?? rawExam;
    const rawQuestions = Array.isArray(exam?.questions)
      ? exam.questions
      : Array.isArray(rawExam?.questions)
      ? rawExam.questions
      : [];

    return {
      ...adaptExam(exam),
      questions: rawQuestions.map((question: any) => this.normalizeQuestion(question)),
    };
  },

  async create(payload: ExamPayload): Promise<AdminExam> {
    const { data } = await api.post<BackendExam | { data: BackendExam }>('/exams', buildDto(payload));
    return adaptExam(unwrap(data) as BackendExam & Record<string, any>);
  },

  async update(id: string, payload: ExamPayload): Promise<AdminExam> {
    const { data } = await api.patch<BackendExam | { data: BackendExam }>(`/exams/${id}`, buildDto(payload));
    return adaptExam(unwrap(data) as BackendExam & Record<string, any>);
  },

  async addQuestion(examId: string, question: Omit<ExamQuestion, 'id'>): Promise<ExamQuestion> {
    const payload = {
      text: question.text.trim(),
      type: question.type,
      points: question.points,
      ...(question.imageUrl ? { imageUrl: String(question.imageUrl).trim() } : {}),
      options: question.options.map(({ text, isCorrect }) => ({
        text: text.trim(),
        isCorrect: Boolean(isCorrect),
      })),
    };
    const { data } = await api.post<any>(`/exams/${examId}/questions`, payload);
    return this.normalizeQuestion(unwrap(data));
  },

  async updateQuestion(questionId: string | number, question: Omit<ExamQuestion, 'id'>): Promise<ExamQuestion> {
    const payload = {
      text: question.text.trim(),
      type: question.type,
      points: question.points,
      ...(question.imageUrl ? { imageUrl: String(question.imageUrl).trim() } : {}),
      options: question.options.map(({ text, isCorrect }) => ({
        text: text.trim(),
        isCorrect: Boolean(isCorrect),
      })),
    };
    const { data } = await api.patch<any>(`/exams/questions/${questionId}`, payload);
    return this.normalizeQuestion(unwrap(data));
  },

  async deleteQuestion(questionId: string | number): Promise<void> {
    await api.delete(`/exams/questions/${questionId}`);
  },

  normalizeQuestion(question: any): ExamQuestion {
    const value = question?.question ?? question;
    const imageUrl = extractQuestionImageUrl(value);
    return {
      ...value,
      id: value?.id,
      text: value?.text ?? '',
      type: String(value?.type).toUpperCase() === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
      points: Number(value?.points ?? 1),
      imageUrl: imageUrl || null,
      options: Array.isArray(value?.options) ? value.options.map((option: any) => ({
        ...option,
        text: typeof option === 'string' ? option : option.text ?? '',
        isCorrect: typeof option === 'string' ? false : Boolean(option.isCorrect),
      })) : [],
    };
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/exams/${id}`);
  },

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const { data } = await api.post<any>('/exams/upload-image', formData, {
      timeout: 60_000,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const candidate =
      (typeof data === 'string' ? data : null) ??
      data?.imageUrl ??
      data?.url ??
      data?.secure_url ??
      data?.path ??
      data?.data?.imageUrl ??
      data?.data?.url;

    if (!candidate || typeof candidate !== 'string') {
      throw new Error('لم يُرجع الخادم رابط الصورة.');
    }
    return candidate.trim();
  },

  async getStats(id: string): Promise<ExamStats> {
    const { data } = await api.get<ExamStats | { data: ExamStats }>(`/exams/${id}/stats`);
    return unwrap(data);
  },

  async getLeaderboard(id: string): Promise<ExamLeaderboard> {
    const { data } = await api.get<ExamLeaderboard | { data: ExamLeaderboard }>(`/exams/${id}/leaderboard`);
    return unwrap(data);
  },

  async getLessonAssignment(id: string): Promise<boolean> {
    const { data } = await api.get<any>(`/lessons/${id}`);
    const lesson = unwrap(data);
    return Boolean(lesson?.assignment?.examId || lesson?.assignment?.exam?.id);
  },
};
