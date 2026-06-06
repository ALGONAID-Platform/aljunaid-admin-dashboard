import { z } from 'zod';

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

// ─── Course ──────────────────────────────────────────────────────────────────

export const courseSchema = z.object({
  name: z.string().min(2, 'اسم المقرر مطلوب (حد أدنى حرفان)').max(100),
  description: z.string().min(10, 'الوصف مطلوب (حد أدنى 10 أحرف)').max(500),
  level: z.enum(['مبتدئ', 'متوسط', 'متقدم'], {
    errorMap: () => ({ message: 'يرجى اختيار المستوى' }),
  }),
});

// ─── Lesson ──────────────────────────────────────────────────────────────────

export const lessonSchema = z.object({
  courseId: z.string().min(1, 'يرجى اختيار المقرر'),
  title: z.string().min(2, 'عنوان الدرس مطلوب').max(100),
  description: z.string().min(5, 'الوصف مطلوب').max(300),
  order: z.number().min(1, 'الترتيب يجب أن يكون 1 أو أكثر'),
});

// ─── Content ─────────────────────────────────────────────────────────────────

export const contentSchema = z.object({
  lessonId: z.string().min(1, 'يرجى اختيار الدرس'),
  title: z.string().min(2, 'عنوان المحتوى مطلوب').max(100),
  type: z.enum(['video', 'pdf', 'word', 'image', 'link'], {
    errorMap: () => ({ message: 'يرجى اختيار نوع المحتوى' }),
  }),
  url: z.string().url('رابط غير صحيح').optional().or(z.literal('')),
});

// ─── Quiz ────────────────────────────────────────────────────────────────────

export const quizMetaSchema = z.object({
  courseId: z.string().min(1, 'يرجى اختيار المقرر'),
  lessonId: z.string().min(1, 'يرجى اختيار الدرس'),
  title: z.string().min(2, 'عنوان الاختبار مطلوب').max(100),
  description: z.string().min(5, 'الوصف مطلوب').max(300),
  instructions: z.string().min(5, 'التعليمات مطلوبة').max(500),
  passingScore: z.number().min(0).max(100),
  timeLimit: z.number().min(1, 'الوقت يجب أن يكون دقيقة واحدة على الأقل'),
});

export const questionSchema = z.object({
  type: z.enum(['mcq', 'truefalse', 'short']),
  text: z.string().min(5, 'نص السؤال مطلوب'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1, 'الإجابة الصحيحة مطلوبة'),
});

// Inferred Types
export type LoginFormValues = z.infer<typeof loginSchema>;
export type CourseFormValues = z.infer<typeof courseSchema>;
export type LessonFormValues = z.infer<typeof lessonSchema>;
export type ContentFormValues = z.infer<typeof contentSchema>;
export type QuizMetaFormValues = z.infer<typeof quizMetaSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
