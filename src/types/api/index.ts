/**
 * Backend API Response Types
 * Platform: Aljunaid Educational Platform API v1.0
 */

// ─── Generic Wrappers ─────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  statusCode?: number;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type BackendUserRole = 'STUDENT' | 'ADMIN' | 'OWNER' | 'TEACHER';

export interface BackendUser {
  id: number;
  email: string;
  name: string;
  role: BackendUserRole;
  avatar?: string | null;
  avatarUrl?: string | null;
  academicId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendAuthPayload {
  user: BackendUser;
  access_token?: string;
  accessToken?: string;
}

export interface BackendSigninResponse {
  message?: string;
  user?: BackendUser;
  access_token?: string;
  accessToken?: string;
  data?: BackendAuthPayload;
}

export interface BackendSignupResponse {
  statusCode?: number;
  message: string;
  user?: BackendUser;
  access_token?: string;
  accessToken?: string;
  data?: BackendAuthPayload;
}

export interface UserRegisterDto {
  email: string;
  password: string;
  name: string;
  role?: 'STUDENT' | 'ADMIN' | 'OWNER';
}

export interface UserLoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface GoogleMobileLoginDto {
  idToken: string;
}

export interface AuthMessageResponse {
  statusCode?: number;
  message: string;
}

// ─── Courses ──────────────────────────────────────────────────────────────────



export interface BackendCourse {
  id: number;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  instructorId?: number;
  authorId?: number;
  moduleTitles?: string[];
  modulesCount?: number;
  lessonsCount?: number;
  isEnrolled?: boolean;
  enrollmentStatus?: string;
  totalLessons?: number;
  completedLessons?: number;
  progressPercentage?: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    modules?: number;
    enrollments?: number;
  };
}

export interface BackendCourseSearchResponse {
  courses: BackendCourse[];
  modules?: any[];
  lessons?: any[];
}

export interface BackendCoursesListResponse {
  statusCode?: number;
  data: BackendCourse[];
}

export interface BackendCourseResponse {
  statusCode?: number;
  data: BackendCourse;
}

export interface CreateCourseDto {
  title: string;
  description?: string;
  thumbnail?: string;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  thumbnail?: string;
}


// ─── Modules ──────────────────────────────────────────────────────────────────

export interface BackendModule {
  id: number;
  title: string;
  description?: string;
  courseId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateModuleDto {
  title: string;
  description?: string;
  courseId: number;
}

export interface UpdateModuleDto {
  title?: string;
  description?: string;
  courseId?: number;
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export type LessonStatus = 'DRAFT' | 'PUBLISHED';

export interface BackendLesson {
  id: number;
  title: string;
  description?: string | null;
  content?: string | null;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  status?: LessonStatus;
  order?: number;
  moduleId: number;
  isPublished?: boolean;
  publishedAt?: string;
  publishedBy?: { id: number; name: string } | string;
  createdAt?: string;
  updatedAt?: string;
}

// Lessons are created via multipart/form-data or JSON
export interface CreateLessonDto {
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  pdf?: File;
  status?: LessonStatus;
  order?: number;
  moduleId: number;
}

export interface UpdateLessonDto {
  title?: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  pdf?: File;
  status?: LessonStatus;
  order?: number;
  moduleId?: number;
}


// ─── Exams ────────────────────────────────────────────────────────────────────

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

export interface BackendOption {
  id?: number;
  text: string;
  isCorrect: boolean;
}

export interface BackendQuestion {
  id?: number;
  text: string;
  questionImageUrl?: string;
  type: QuestionType;
  points: number;
  options: BackendOption[];
}

export interface BackendExam {
  id: number;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  lessonId: number;
  questions: BackendQuestion[];
  createdAt?: string;
}

export interface CreateExamDto {
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  lessonId: number;
  questions: Omit<BackendQuestion, 'id'>[];
}

export interface UpdateExamDto extends Partial<CreateExamDto> { }

export interface AnswerDto {
  questionId: number;
  selectedOptionId: number;
}

export interface SubmitExamDto {
  answers: AnswerDto[];
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

export interface BackendEnrollment {
  id: number;
  studentId: number;
  courseId: number;
  enrollmentDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
}

export interface CreateEnrollmentDto {
  courseId: number;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export interface UpdateProgressDto {
  lessonId: number;
  isCompleted?: boolean;
}

export interface CourseProgressResponse {
  courseId: number;
  progressPercentage: number;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface BackendProfile extends BackendUser {
  avatarUrl?: string;
  createdAt?: string;
}

export interface UpdateProfileDto {
  name?: string;
  avatarUrl?: string;
}

export interface BackendBadge {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
}
