import type { ID } from './common.types';

export type ExamType = 'LESSON_QUIZ' | 'COURSE_QUIZ' | 'CHALLENGE' | 'FINAL_EXAM';
export type RankingCriteria = 'BOTH' | 'SCORE' | 'SPEED';
export type ExamQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

export interface ExamOption {
  id?: number;
  text: string;
  isCorrect: boolean;
}

export interface ExamQuestion {
  id?: number;
  text: string;
  type: ExamQuestionType;
  points: number;
  imageUrl?: string | null;
  options: ExamOption[];
}

export interface AdminExam {
  id: ID;
  title: string;
  description?: string;
  imageUrl?: string | null;
  examType: ExamType;
  rankingCriteria: RankingCriteria;
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  lessonId?: ID | null;
  courseId?: ID | null;
  lessonTitle?: string;
  courseTitle?: string;
  asAssignment?: boolean;
  createdAt?: string;
  totalQuestions?: number;
  totalPoints?: number;
  participantsCount?: number;
}

export interface ExamPayload {
  title: string;
  description?: string;
  imageUrl?: string;
  examType: ExamType;
  rankingCriteria: RankingCriteria;
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number | null;
  startTime?: string;
  endTime?: string;
  lessonId?: number;
  courseId?: number;
  asAssignment?: boolean;
  questions?: Omit<ExamQuestion, 'id'>[];
}

export interface ExamStats {
  overview: {
    totalParticipants: number;
    completed: number;
    notCompleted: number;
    averageScore: number;
    gradeDistribution: Record<'excellent' | 'veryGood' | 'good' | 'acceptable' | 'failed', number>;
  };
  questions: Array<{
    questionId: number;
    text: string;
    imageUrl?: string | null;
    totalAnswered: number;
    correctCount: number;
    wrongCount: number;
    correctPercentage: number;
  }>;
}

export interface ExamLeaderboard {
  examId: number;
  examTitle: string;
  rankingCriteria: RankingCriteria;
  isEnded: boolean;
  status: string;
  endTime?: string | null;
  participantsCount: number;
  leaderboard: Array<{
    rank?: number;
    studentId: number;
    name: string;
    avatar?: string | null;
    score?: number;
    timeTakenMs?: number;
    completedAt?: string | null;
    participatedAt?: string | null;
  }>;
}
