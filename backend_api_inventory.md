# ENTERPRISE BACKEND API INVENTORY REPORT
## Aljunaid Educational Platform (`algonaid-api`)

**Audit Scope:** 100% Backend Source Code Audit (`c:\Users\pc\algonaid-api\algonaid-api`)  
**Audit Timestamp:** 2026-07-21T09:46:45+03:00  
**Source of Truth:** Implementation Source Code ONLY  

---

# Backend API Summary

- **Total Controllers:** 9 (`AppController`, `AuthController`, `CoursesController`, `ModulesController`, `LessonsController`, `ExamsController`, `ProgressController`, `UsersController`, `EnrollmentController`)
- **Total REST Endpoints:** 54
- **Public Endpoints:** 9 (Includes auth login/signup, forgot/reset password, Google OAuth, course catalog, course search, course detail, app health)
- **Protected Endpoints:** 45 (Enforced by `AuthRollGuard`, `AuthGuard`, or Passport Google Guard)
- **Upload Endpoints:** 4 (`POST /api/v1/lessons`, `POST /api/v1/lessons/:id`, `POST /api/v1/exams/upload-image`, `POST /api/v1/users/profile`, `POST /api/v1/upload/image`)
- **Owner / Admin-Only Endpoints:** 16 (Course, Module, Lesson, Exam CRUD and general image uploads)

---

# Global API Configuration

- **Base URL:** `http://localhost:3000/api/v1` (or production host)
- **Global Prefix:** `api/v1` (Configured in `main.ts` line 12 with excluded routes: `['modulesList/:courseId', 'lessonDetails/:lessonId']`)
- **Authentication Scheme:** Bearer JWT via `Authorization` header (`Authorization: Bearer <access_token>`).
- **Authorization Strategy:** Metadata `@userRoles(...)` evaluated by NestJS `AuthRollGuard`. Roles: `STUDENT`, `ADMIN`, `OWNER`.
- **Validation Pipeline:** Global NestJS `ValidationPipe` (`whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`).
- **Error Response Format:** Standard NestJS HttpExceptions (`{ "statusCode": number, "message": string | string[], "error": string }`).
- **Response Format:** Direct JSON payload returned from controller/service methods.
- **File Upload Storage Engine:** Uploadcare Storage API (`UploadcareStorageService`) producing public CDN URLs (`https://ucarecdn.com/...`).

---

# API Inventory

| Module | Method | Route | Auth | Roles | Request DTO | Response Structure | Description |
|:---|:---:|:---|:---:|:---|:---|:---|:---|
| **App** | `GET` | `/` | Public | None | None | `string` | App health check endpoint |
| **App** | `GET` | `/modulesList/:courseId` | Public | None | None | HTML `string` | Web redirect page for module list |
| **App** | `GET` | `/lessonDetails/:lessonId` | Public | None | None | HTML `string` | Web redirect page for lesson details |
| **App** | `POST` | `/api/v1/upload/image` | JWT | `ADMIN`, `OWNER` | Multipart `file` | `{ url, filename, originalName, size, mimeType }` | Upload RTF editor image to Uploadcare |
| **Auth** | `POST` | `/api/v1/auth/signup` | Public | None | `UserRegisterDto` | `{ message, user, access_token }` | Register new user account |
| **Auth** | `POST` | `/api/v1/auth/signin` | Public | None | `UserLoginDto` | `{ message, user, access_token }` | Authenticate user & return JWT |
| **Auth** | `POST` | `/api/v1/auth/forgot-password` | Public | None | `ForgotPasswordDto` | `{ message }` | Trigger password reset email via Resend |
| **Auth** | `POST` | `/api/v1/auth/reset-password` | Public | None | `ResetPasswordDto` | `{ message }` | Execute password reset via token |
| **Auth** | `GET` | `/api/v1/auth/google` | Google | None | None | Redirect | Initiate Google OAuth flow |
| **Auth** | `GET` | `/api/v1/auth/google/callback` | Google | None | None | `{ message, user, access_token }` | Google OAuth callback handler |
| **Auth** | `POST` | `/api/v1/auth/google/mobile` | Public | None | `GoogleMobileLoginDto` | `{ message, user, access_token }` | Mobile Google OAuth via ID Token |
| **Auth** | `GET` | `/api/v1/auth/:id` | JWT | All Roles | None | `{ user }` | Fetch user data by ID |
| **Auth** | `POST` | `/api/v1/auth/logout` | JWT | All Roles | None | `{ message }` | Logout and blacklist JWT token |
| **Courses** | `POST` | `/api/v1/courses` | JWT | `ADMIN`, `OWNER` | `CreateCourseDto` | `Course` object | Create new course |
| **Courses** | `GET` | `/api/v1/courses` | Opt JWT | All Roles | None | `Course[]` | List public course catalog |
| **Courses** | `GET` | `/api/v1/courses/my-courses` | JWT | `STUDENT`, `ADMIN`, `OWNER` | None | `EnrolledCourse[]` | List enrolled courses with progress % |
| **Courses** | `GET` | `/api/v1/courses/search` | Opt JWT | All Roles | Query `q` | `{ courses, modules, lessons }` | Search across courses, modules, lessons |
| **Courses** | `GET` | `/api/v1/courses/:id` | Public | None | None | `Course` object | Get course details with teacher info |
| **Courses** | `PATCH` | `/api/v1/courses/:id` | JWT | `ADMIN`, `OWNER` | `UpdateCourseDto` | `Course` object | Update course details |
| **Courses** | `DELETE` | `/api/v1/courses/:id` | JWT | `ADMIN`, `OWNER` | None | `{ message }` | Delete course and child cascades |
| **Modules** | `POST` | `/api/v1/modules` | JWT | `ADMIN`, `OWNER` | `CreateModuleDto` | `Module` object | Create new module in course |
| **Modules** | `GET` | `/api/v1/modules` | JWT | `STUDENT`, `ADMIN`, `OWNER` | None | `Module[]` | Get all modules with lesson progress |
| **Modules** | `GET` | `/api/v1/modules/course/:courseId` | JWT | `STUDENT`, `ADMIN`, `OWNER` | None | `Module[]` | Get modules for a specific course |
| **Modules** | `GET` | `/api/v1/modules/:id` | JWT | `STUDENT`, `ADMIN`, `OWNER` | None | `Module` object | Get module details by ID |
| **Modules** | `PATCH` | `/api/v1/modules/:id` | JWT | `ADMIN`, `OWNER` | `UpdateModuleDto` | `Module` object | Update module details |
| **Modules** | `DELETE` | `/api/v1/modules/:id` | JWT | `ADMIN`, `OWNER` | None | `{ message }` | Delete module and child cascades |
| **Lessons** | `POST` | `/api/v1/lessons` | JWT | `ADMIN`, `OWNER` | `CreateLessonDto` + File | `Lesson` object | Create lesson + optional PDF upload |
| **Lessons** | `GET` | `/api/v1/lessons/module/:moduleId` | JWT | `STUDENT`, `ADMIN`, `OWNER` | None | `Lesson[]` | Get published lessons for module |
| **Lessons** | `GET` | `/api/v1/lessons/:id` | JWT | `STUDENT`, `ADMIN`, `OWNER` | None | `Lesson` object | Get lesson by ID (DRAFT check) |
| **Lessons** | `PATCH` | `/api/v1/lessons/:id` | JWT | `ADMIN`, `OWNER` | `UpdateLessonDto` + File | `Lesson` object | Update lesson + optional PDF upload |
| **Lessons** | `DELETE` | `/api/v1/lessons/:id` | JWT | `ADMIN`, `OWNER` | None | `{ message }` | Delete lesson and child cascades |
| **Exams** | `GET` | `/api/v1/exams` | JWT | `STUDENT`, `ADMIN`, `OWNER` | None | `Exam[]` | Get all exams |
| **Exams** | `POST` | `/api/v1/exams/upload-image` | JWT | `ADMIN`, `OWNER` | Multipart `image` | `{ imageUrl }` | Upload exam question image |
| **Exams** | `POST` | `/api/v1/exams` | JWT | `ADMIN`, `OWNER` | `CreateExamDto` | `Exam` object | Create exam with questions/options |
| **Exams** | `PATCH` | `/api/v1/exams/:id` | JWT | `ADMIN`, `OWNER` | `UpdateExamDto` | `Exam` object | Update exam questions/options |
| **Exams** | `DELETE` | `/api/v1/exams/:id` | JWT | `ADMIN`, `OWNER` | None | `{ message }` | Delete exam and questions/attempts |
| **Exams** | `GET` | `/api/v1/exams/:id` | JWT | `STUDENT`, `ADMIN`, `OWNER` | None | `Exam` object | Get exam details |
| **Exams** | `POST` | `/api/v1/exams/:examId/start` | JWT | `STUDENT` | None | `ExamAttempt` object | Start new exam attempt |
| **Exams** | `POST` | `/api/v1/exams/attempts/:attemptId/submit` | JWT | `STUDENT` | `SubmitExamDto` | `GradedAttempt` | Submit exam answers and grade |
| **Exams** | `GET` | `/api/v1/exams/attempts/:attemptId/result` | JWT | `STUDENT` | None | `AttemptResult` | Get detailed attempt results |
| **Progress**| `POST` | `/api/v1/progress/update` | JWT | `STUDENT` | `UpdateProgressDto` | `LessonProgress` | Create/update lesson progress |
| **Progress**| `GET` | `/api/v1/progress/course/:courseId` | JWT | `STUDENT` | None | `{ courseId, progressPercentage }` | Get course progress % |
| **Progress**| `GET` | `/api/v1/progress/last-watched` | JWT | `STUDENT` | None | `LessonProgress` | Get last watched lesson |
| **Progress**| `GET` | `/api/v1/progress/last-accessed-module` | JWT | `STUDENT` | None | `{ module, progress }` | Get progress for last accessed module |
| **Progress**| `GET` | `/api/v1/progress/excellence-courses` | JWT | `STUDENT` | None | `Course[]` | Get courses completed with >= 90% |
| **Progress**| `GET` | `/api/v1/progress/course/:courseId/excellence-modules` | JWT | `STUDENT` | None | `Module[]` | Get modules completed with >= 90% |
| **Progress**| `GET` | `/api/v1/progress/module/:moduleId/grades` | JWT | `STUDENT` | None | `{ grades, average }` | Get exam grades for module |
| **Progress**| `GET` | `/api/v1/progress/course/:courseId/grades` | JWT | `STUDENT` | None | `{ grades, average }` | Get exam grades for course |
| **Progress**| `GET` | `/api/v1/progress/total-points` | JWT | `STUDENT` | None | `{ totalPoints }` | Get total points earned across exams |
| **Users** | `GET` | `/api/v1/users/profile/badges` | JWT | All Roles | None | `Badge[]` | Get user badges / achievements |
| **Users** | `GET` | `/api/v1/users/profile` | JWT | All Roles | None | `UserResponse` | Get detailed current user profile |
| **Users** | `PATCH` | `/api/v1/users/profile` | JWT | All Roles | `UpdateProfileDto` + Files | `UserResponse` | Update profile + avatar/background |
| **Enroll** | `POST` | `/api/v1/enrollment` | JWT | `STUDENT` | `CreateEnrollmentDto` | `Enrollment` | Enroll in course |
| **Enroll** | `GET` | `/api/v1/enrollment/check-enrollment` | JWT | `STUDENT` | Query `courseId` | `boolean` | Check if student enrolled in course |

---

# Module Breakdown

### 1. Auth Module (`src/auth`)
- **Endpoints Count:** 9
- **Dependencies:** `PrismaService`, `JwtService`, `MailService`, `ConfigService`.
- **Authorization:** Public (Register/Login/Reset/OAuth) & Protected (Logout, Get User by ID).
- **Business Rules:**
  - Password hashed using `bcrypt` (10 salt rounds).
  - Student registration automatically generates an `academicId` (`STU-{Date.now()}`).
  - Logout writes JWT token expiration to `TokenBlacklist` table.
  - Mobile Google Auth verifies ID token with Google OAuth API and checks client ID.

### 2. Courses Module (`src/courses`)
- **Endpoints Count:** 7
- **Dependencies:** `PrismaService`.
- **Authorization:** Public catalog browsing, Admin/Owner CRUD operations.
- **Business Rules:**
  - `findAll` excludes courses where student already has an active enrollment.
  - `findMyCourses` calculates real-time progress percentage based on lesson progress and passed exams.
  - Course deletion triggers foreign key cascade deletion across modules, lessons, exams, and enrollments.

### 3. Modules Module (`src/modules`)
- **Endpoints Count:** 6
- **Dependencies:** `PrismaService`.
- **Business Rules:**
  - Modules are tied to `courseId`.
  - Non-admin students only see published lessons inside modules.

### 4. Lessons Module (`src/lessons`)
- **Endpoints Count:** 5
- **Dependencies:** `PrismaService`, `UploadcareStorageService`.
- **Business Rules:**
  - Accepting optional PDF file upload (`pdfFileSizeLimit = 10MB`).
  - Draft lessons (`status === 'DRAFT'`) are forbidden to non-instructor/non-admin users.

### 5. Exams Module (`src/exams`)
- **Endpoints Count:** 9
- **Dependencies:** `PrismaService`, `UploadcareStorageService`.
- **Business Rules:**
  - Exam creation requires nested array of questions and minimum 2 options per question.
  - Starting an exam checks active attempts against `Exam.maxAttempts` (default: 3).
  - Submitting an attempt automatically grades MCQ answers and computes status (`PASSED`, `FAILED`, `IMPROVEMENT_NEEDED`).

### 6. Progress Module (`src/progress`)
- **Endpoints Count:** 9
- **Dependencies:** `PrismaService`.
- **Business Rules:**
  - Student progress calculation for excellence courses/modules requires score >= 90%.

### 7. Users Module (`src/users`)
- **Endpoints Count:** 3
- **Dependencies:** `UsersService`, `UploadcareStorageService`.
- **Business Rules:**
  - Profile updates accept binary `avatar` / `background` files or `avatarUrl` string.

### 8. Enrollment Module (`src/enrollment`)
- **Endpoints Count:** 2
- **Dependencies:** `EnrollmentService`, `PrismaService`.
- **Business Rules:**
  - Enforces `@@unique([studentId, courseId])` to prevent double enrollment.

---

# Upload Endpoints

| Endpoint | Method | Form Field | Max Size | Allowed Types | Storage Target |
|:---|:---:|:---|:---:|:---|:---|
| `/api/v1/upload/image` | `POST` | `file` | 5 MB | Image files (`image/*`) | Uploadcare CDN URL |
| `/api/v1/lessons` | `POST` | `pdf` | 10 MB | `application/pdf` | Uploadcare CDN URL |
| `/api/v1/lessons/:id` | `PATCH` | `pdf` | 10 MB | `application/pdf` | Uploadcare CDN URL |
| `/api/v1/exams/upload-image` | `POST` | `image` | 5 MB | Image files (`image/*`) | Uploadcare CDN URL |
| `/api/v1/users/profile` | `PATCH` | `avatar`, `background` | 5 MB | Image files (`image/*`) | Uploadcare CDN URL |

---

# DTO Inventory

| DTO Class Name | Target Endpoint | Fields & Types | Validation Rules |
|:---|:---|:---|:---|
| `UserRegisterDto` | `POST /auth/signup` | `email` (string), `password` (string), `name` (string), `role` (enum) | `@IsEmail()`, `@MinLength(6)`, `@MinLength(2)`, `@IsEnum(UserRole)` |
| `UserLoginDto` | `POST /auth/signin` | `email` (string), `password` (string) | `@IsEmail()`, `@IsString()`, `@IsNotEmpty()` |
| `ForgotPasswordDto`| `POST /auth/forgot-password` | `email` (string) | `@IsEmail()`, `@IsNotEmpty()` |
| `ResetPasswordDto` | `POST /auth/reset-password` | `token` (string), `newPassword` (string) | `@IsString()`, `@IsNotEmpty()`, `@MinLength(6)` |
| `GoogleMobileLoginDto`| `POST /auth/google/mobile` | `idToken` (string) | `@IsString()`, `@IsNotEmpty()` |
| `CreateCourseDto` | `POST /courses` | `title` (string), `description` (string?), `thumbnail` (string?) | `@IsString()`, `@IsNotEmpty()`, `@IsOptional()` |
| `UpdateCourseDto` | `PATCH /courses/:id` | `title` (string?), `description` (string?), `thumbnail` (string?) | `@IsOptional()`, `@IsString()` |
| `CreateModuleDto` | `POST /modules` | `courseId` (number), `title` (string), `description` (string?) | `@IsInt()`, `@IsString()`, `@IsNotEmpty()` |
| `CreateLessonDto` | `POST /lessons` | `moduleId` (number), `title` (string), `description` (string?), `content` (string?), `videoUrl` (string?), `status` (enum), `order` (number) | `@IsInt()`, `@IsString()`, `@IsEnum(LessonStatus)`, `@IsOptional()` |
| `CreateExamDto` | `POST /exams` | `title` (string), `description` (string?), `passingScore` (number), `maxAttempts` (number), `lessonId` (number), `questions` (array) | `@IsInt()`, `@Min(0)`, `@Max(100)`, `@Min(1)`, `@ValidateNested()` |
| `SubmitExamDto` | `POST /exams/attempts/:id/submit` | `answers` (array of `{ questionId, selectedOptionId }`) | `@IsArray()`, `@ValidateNested()` |
| `UpdateProgressDto`| `POST /progress/update` | `lessonId` (number), `isCompleted` (boolean?) | `@IsInt()`, `@IsBoolean()`, `@IsOptional()` |
| `UpdateProfileDto` | `PATCH /users/profile` | `name` (string?), `avatar` (string?), `avatarUrl` (string?), `background` (string?), `grade` (string?), `birthDate` (string?), `address` (string?) | `@IsOptional()`, `@IsString()`, `@IsDateString()` |

---

# Authorization Matrix

| Endpoint | Route Path | Public | Authenticated | `STUDENT` | `ADMIN` | `OWNER` |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| `POST /auth/signup` | `/api/v1/auth/signup` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /auth/signin` | `/api/v1/auth/signin` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /auth/logout` | `/api/v1/auth/logout` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `GET /courses` | `/api/v1/courses` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /courses/my-courses` | `/api/v1/courses/my-courses` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `POST /courses` | `/api/v1/courses` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `DELETE /courses/:id` | `/api/v1/courses/:id` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `POST /modules` | `/api/v1/modules` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `POST /lessons` | `/api/v1/lessons` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `POST /exams` | `/api/v1/exams` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `POST /exams/:id/start` | `/api/v1/exams/:id/start` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `POST /exams/attempts/:id/submit` | `/api/v1/exams/attempts/:id/submit` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `POST /progress/update` | `/api/v1/progress/update` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `PATCH /users/profile` | `/api/v1/users/profile` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `POST /upload/image` | `/api/v1/upload/image` | ❌ | ✅ | ❌ | ✅ | ✅ |

---

# Final Statistics

- **Total Controllers:** 9
- **Total Modules:** 9
- **Total DTOs:** 15
- **Total Prisma Models:** 14
- **Total REST Endpoints:** 54
- **Upload Endpoints:** 5
- **Public Endpoints:** 9
- **Protected Endpoints:** 45
