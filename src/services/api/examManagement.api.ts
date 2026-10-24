import { api } from '../../lib/api';
import type { CreateExamDto, BackendExam } from '../../types/api';
import type { AdminExam, ExamLeaderboard, ExamPayload, ExamQuestion, ExamStats } from '../../types/exam.types';

function unwrap<T>(value: T | { data: T }): T {
  return value && typeof value === 'object' && 'data' in value
    ? (value as { data: T }).data
    : value as T;
}

function adaptExam(exam: BackendExam & Record<string, any>): AdminExam {
  return {
    id: String(exam.id),
    title: exam.title,
    description: exam.description ?? '',
    imageUrl: exam.imageUrl,
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
      questions: questions.map((question) => ({
        text: question.text.trim(),
        type: question.type,
        points: question.points,
        imageUrl: question.imageUrl || undefined,
        options: question.options.map(({ text, isCorrect }) => ({ text: text.trim(), isCorrect })),
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
    const exam = unwrap(data);
    return { ...adaptExam(exam), questions: Array.isArray(exam?.questions) ? exam.questions.map((question: any) => ({
      ...question,
      id: question.id,
      type: String(question.type).toUpperCase() === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
      imageUrl: question.imageUrl ?? question.questionImageUrl ?? null,
      options: Array.isArray(question.options) ? question.options.map((option: any) => ({
        ...option, text: typeof option === 'string' ? option : option.text ?? '', isCorrect: typeof option === 'string' ? false : Boolean(option.isCorrect),
      })) : [],
    })) : [] };
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
    const { data } = await api.post<any>(`/exams/${examId}/questions`, question);
    return this.normalizeQuestion(unwrap(data));
  },

  async updateQuestion(questionId: string | number, question: Omit<ExamQuestion, 'id'>): Promise<ExamQuestion> {
    const { data } = await api.patch<any>(`/exams/questions/${questionId}`, question);
    return this.normalizeQuestion(unwrap(data));
  },

  async deleteQuestion(questionId: string | number): Promise<void> {
    await api.delete(`/exams/questions/${questionId}`);
  },

  normalizeQuestion(question: any): ExamQuestion {
    const value = question?.question ?? question;
    return {
      ...value,
      id: value?.id,
      text: value?.text ?? '',
      type: String(value?.type).toUpperCase() === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
      points: Number(value?.points ?? 1),
      imageUrl: value?.imageUrl ?? value?.questionImageUrl ?? null,
      options: Array.isArray(value?.options) ? value.options.map((option: any) => ({
        ...option, text: typeof option === 'string' ? option : option.text ?? '', isCorrect: typeof option === 'string' ? false : Boolean(option.isCorrect),
      })) : [],
    };
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/exams/${id}`);
  },

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.post<{
      imageUrl?: string;
      url?: string;
      data?: { imageUrl?: string; url?: string };
      }>('/exams/upload-image', formData, { timeout: 0 });
      const imageUrl = data.imageUrl ?? data.url ?? data.data?.imageUrl ?? data.data?.url;
      if (!imageUrl) throw new Error('لم يُرجع الخادم رابط الصورة.');
      return imageUrl;
    } catch (error) {
      const fallback = new FormData();
      fallback.append('file', file);
      const { data } = await api.post<any>('/exams/upload-image', fallback, { timeout: 0 });
      const imageUrl = data.imageUrl ?? data.url ?? data.data?.imageUrl ?? data.data?.url;
      if (!imageUrl) throw error;
      return imageUrl;
    }
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
