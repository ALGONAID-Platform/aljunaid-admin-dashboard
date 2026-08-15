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
  title: z.string().min(3, 'اسم المقرر مطلوب (حد أدنى 3 أحرف)').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
});


// ─── Module ──────────────────────────────────────────────────────────────────

export const moduleSchema = z.object({
  title: z.string().min(2, 'عنوان الوحدة مطلوب (حد أدنى حرفان)').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  courseId: z.number().or(z.string().min(1, 'يرجى اختيار المقرر التابع للوحدة')),
});

// ─── Lesson ──────────────────────────────────────────────────────────────────


export const lessonSchema = z.object({
  moduleId: z.number().or(z.string().min(1, 'يرجى تحديد الوحدة التي ينتمي إليها الدرس')),
  title: z.string().min(2, 'عنوان الدرس مطلوب (حد أدنى حرفان)').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
  videoUrl: z.string().url('رابط الفيديو غير صحيح').optional().or(z.literal('')),
  pdfUrl: z.string().url('رابط ملف PDF غير صحيح').optional().or(z.literal('')),
  order: z.number().min(1, 'الترتيب يجب أن يكون 1 أو أكثر').optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
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
  description: z.string().max(500).optional().or(z.literal('')),
  instructions: z.string().max(500).optional().or(z.literal('')),
  passingScore: z.number().min(0).max(100),
  timeLimit: z.number().min(1, 'الوقت يجب أن يكون دقيقة واحدة على الأقل').optional(),
});


export const questionSchema = z.object({
  type: z.enum(['mcq', 'truefalse']),
  text: z.string().min(5, 'نص السؤال مطلوب'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1, 'الإجابة الصحيحة مطلوبة'),
});

// ─── Exam Model ──────────────────────────────────────────────────────────────

export const examModelSchema = z.object({
  title: z.string().min(2, 'عنوان النموذج مطلوب (حد أدنى حرفان)').max(100),
  description: z.string().optional(),
  pdfUrl: z.string().optional().nullable(),
  grade: z.string().optional(),
  courseId: z.string().optional(),
});

// Inferred Types
export type LoginFormValues = z.infer<typeof loginSchema>;
export type CourseFormValues = z.infer<typeof courseSchema>;
export type LessonFormValues = z.infer<typeof lessonSchema>;
export type ContentFormValues = z.infer<typeof contentSchema>;
export type QuizMetaFormValues = z.infer<typeof quizMetaSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
export type ExamModelFormValues = z.infer<typeof examModelSchema>;
