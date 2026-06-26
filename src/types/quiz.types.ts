import type { ID } from './common.types';

export type QuestionType = 'mcq' | 'truefalse' | 'short';

export interface Question {
  id: ID;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  points?: number;
  order?: number;
  /** Optional image for the question (base64 preview or server URL) */
  imageUrl?: string;
  /** File object — used only during form state, not persisted */
  imageFile?: File;
}

export interface Quiz {
  id: ID;
  courseId: ID;
  lessonId: ID;
  courseName: string;
  lessonTitle: string;
  title: string;
  description: string;
  instructions: string;
  passingScore: number;
  timeLimit: number;
  questions: Question[];
  createdAt: string;
}

export interface CreateQuizPayload {
  courseId: ID;
  lessonId: ID;
  title: string;
  description: string;
  instructions: string;
  passingScore: number;
  timeLimit: number;
  questions: Omit<Question, 'id'>[];
}

export interface UpdateQuizPayload extends Partial<CreateQuizPayload> {
  id: ID;
}

export interface QuizFormValues {
  courseId: ID | '';
  lessonId: ID | '';
  title: string;
  description: string;
  instructions: string;
  passingScore: number;
  timeLimit: number;
}
