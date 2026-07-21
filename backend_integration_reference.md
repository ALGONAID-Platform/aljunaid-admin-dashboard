# DEFINITIVE BACKEND INTEGRATION REFERENCE
## Aljunaid Educational Platform (`algonaid-api`)

**Document Status:** OFFICIAL TECHNICAL REFERENCE  
**Version:** 1.0.0  
**Backend Framework:** NestJS v10 + Prisma ORM + PostgreSQL  
**Base URL:** `http://localhost:3000/api/v1` (or production host)  
**Authentication Header:** `Authorization: Bearer <access_token>`  

---

## 1. Project Overview

### 1.1 Architecture & Core Components
- **Framework:** NestJS (Node.js) using Express adapter with modular domain architecture.
- **ORM & Database:** Prisma ORM connecting to PostgreSQL (Neon cloud or local).
- **Validation Pipeline:** Global NestJS `ValidationPipe` with strict properties:
  - `whitelist: true` (Strips unmapped properties)
  - `transform: true` (Auto-transforms primitive types)
  - `forbidNonWhitelisted: true` (Rejects payloads containing unexpected keys)
- **Global Route Prefix:** `api/v1`
  - *Excluded routes:* `modulesList/:courseId`, `lessonDetails/:lessonId`
- **File Upload Engine:** `UploadcareStorageService` transmitting uploaded files via CDN client.

---

## 2. Authentication & Authorization Architecture

### 2.1 Tokens & Revocation
- **Access Tokens:** Signed using `@nestjs/jwt` with `JWT_SECRET` (expiration default: `1d`).
- **Token Blacklisting (Logout):** When `POST /api/v1/auth/logout` is called, the JWT expiration timestamp (`exp`) is decoded and recorded in PostgreSQL table `TokenBlacklist`.
- **Role Hierarchy:** Supported roles defined in `Role` enum: `STUDENT`, `ADMIN`, `OWNER`.

### 2.2 Role Guards & Decorators
- **`AuthRollGuard`:** Protects endpoints using metadata attached by `@userRoles(...)`.
  1. Extracts `Bearer` token from `Authorization` header.
  2. Verifies token validity using `JwtService.verifyAsync`.
  3. Fetches user profile from database via `AuthService.getCurrentUser(id)`.
  4. Confirms `user.role` matches allowed roles. If authorized, attaches JWT payload to `request[CURRENT_USER_KEY]`.
- **`AuthGuard`:** Standard guard checking valid JWT signature.
- **`OptionalAuthGuard`:** Inspects `Authorization` header if present; allows unauthenticated access if missing.

---

## 3. Module Overview

| Module Name | Controller Path | Description |
|:---|:---|:---|
| `AuthModule` | `/api/v1/auth` | User registration, login, password recovery, Google OAuth, logout |
| `CoursesModule` | `/api/v1/courses` | Course catalog, creation, search, enrolled courses, updates |
| `ModulesModule` | `/api/v1/modules` | Course module creation, updates, and module listings |
| `LessonsModule` | `/api/v1/lessons` | Lesson content management, publishing, and PDF file attachments |
| `ExamsModule` | `/api/v1/exams` | Exam creation, image uploads, student attempts, grading, results |
| `ProgressModule` | `/api/v1/progress` | Student lesson completion, course progress %, grades, total points |
| `UsersModule` | `/api/v1/users` | User profile retrieval, profile updates (avatar/background), badges |
| `EnrollmentModule`| `/api/v1/enrollment` | Student course enrollment and enrollment status verification |

---

## 4. Complete Endpoint Reference

### 4.1 Auth Endpoints (`/api/v1/auth`)

#### 1. `POST /api/v1/auth/signup`
- **Purpose:** Register a new user account (Student, Admin, or Owner).
- **Auth:** None (Public)
- **Request Body (`UserRegisterDto`):**
  - `email`: String (Required, Email format)
  - `password`: String (Required, Min 6 chars)
  - `name`: String (Required, Min 2 chars)
  - `role`: Enum `UserRole` (`"STUDENT"` \| `"ADMIN"` \| `"OWNER"`, Default: `"STUDENT"`)
- **Business Rules:** Checks if email exists. If role is `STUDENT`, creates `Student` profile with `academicId` (`STU-{timestamp}`). If `ADMIN`, creates `Teacher` profile.
- **Success Response (201 Created):**
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": 1,
      "email": "student@example.com",
      "name": "Ahmed",
      "role": "STUDENT",
      "avatar": null,
      "avatarUrl": null,
      "academicId": "STU-1721552000000"
    },
    "access_token": "eyJhbGci..."
  }
  ```

#### 2. `POST /api/v1/auth/signin`
- **Purpose:** Authenticate existing user and issue JWT access token.
- **Auth:** None (Public)
- **Request Body (`UserLoginDto`):**
  - `email`: String (Required, Email format)
  - `password`: String (Required)
- **Success Response (200 OK):** Returns `message`, formatted `user` object, and `access_token`.

#### 3. `POST /api/v1/auth/forgot-password`
- **Purpose:** Request password reset email token via Resend MailService.
- **Request Body (`ForgotPasswordDto`):** `{ "email": "user@example.com" }`
- **Success Response (200 OK):** `{ "message": "Password reset token sent to your email" }`

#### 4. `POST /api/v1/auth/reset-password`
- **Purpose:** Reset account password using token.
- **Request Body (`ResetPasswordDto`):** `{ "token": "string", "newPassword": "string" }`
- **Success Response (200 OK):** `{ "message": "Password reset successful" }`

#### 5. `POST /api/v1/auth/google/mobile`
- **Purpose:** Mobile Google OAuth authentication via Google ID token.
- **Request Body (`GoogleMobileLoginDto`):** `{ "idToken": "google_id_token" }`
- **Business Rules:** Verifies token with `https://oauth2.googleapis.com/tokeninfo`, validates audience against `GOOGLE_CLIENT_ID`, checks expiry. Creates user if new.

#### 6. `POST /api/v1/auth/logout`
- **Purpose:** Invalidate active access token.
- **Auth:** Bearer JWT
- **Success Response (200 OK):** `{ "message": "Logged out successfully" }`

---

### 4.2 Courses Endpoints (`/api/v1/courses`)

#### 1. `GET /api/v1/courses`
- **Purpose:** Discover public course catalog.
- **Auth:** Optional Bearer JWT
- **Business Rules:** Excludes courses the authenticated student is already enrolled in.
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "title": "دبلوم العلوم الإسلامية",
      "description": "وصف تفصيلي",
      "thumbnail": "https://ucarecdn.com/...",
      "instructorId": 2,
      "moduleTitles": ["العقيدة", "الفقه"],
      "modulesCount": 2,
      "isEnrolled": false
    }
  ]
  ```

#### 2. `GET /api/v1/courses/my-courses`
- **Purpose:** Get courses student is enrolled in with progress calculations.
- **Auth:** Bearer JWT (`STUDENT`, `ADMIN`, `OWNER`)
- **Business Rules:** Computes `totalLessons`, `completedLessons`, and `progressPercentage` per course.
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "title": "دبلوم العلوم الإسلامية",
      "thumbnail": "https://...",
      "isEnrolled": true,
      "enrollmentStatus": "ACTIVE",
      "totalLessons": 10,
      "completedLessons": 4,
      "progressPercentage": 40
    }
  ]
  ```

#### 3. `GET /api/v1/courses/search?q=query`
- **Purpose:** Unified search across courses, modules, and lessons.
- **Query Param:** `q` (String)
- **Success Response (200 OK):** `{ "courses": [...], "modules": [...], "lessons": [...] }`

#### 4. `POST /api/v1/courses`
- **Purpose:** Create new course.
- **Auth:** Bearer JWT (`ADMIN`, `OWNER`)
- **Request Body (`CreateCourseDto`):**
  - `title`: String (Required, Min 3 chars)
  - `description`: String (Optional)
  - `thumbnail`: String (Optional CDN URL string)

#### 5. `DELETE /api/v1/courses/:id`
- **Purpose:** Delete a course and all child entities via database cascade.
- **Auth:** Bearer JWT (`ADMIN`, `OWNER` / Course Instructor)

---

### 4.3 Modules Endpoints (`/api/v1/modules`)

#### 1. `GET /api/v1/modules/course/:courseId`
- **Purpose:** Get all modules for a course with lesson counts and student progress %.
- **Auth:** Bearer JWT (`STUDENT`, `ADMIN`, `OWNER`)

#### 2. `POST /api/v1/modules`
- **Purpose:** Create module inside a course.
- **Request Body (`CreateModuleDto`):** `{ "courseId": 1, "title": "...", "description": "..." }`

---

### 4.4 Lessons Endpoints (`/api/v1/lessons`)

#### 1. `POST /api/v1/lessons`
- **Purpose:** Create lesson with optional PDF document upload.
- **Auth:** Bearer JWT (`ADMIN`, `OWNER`)
- **Consumes:** `multipart/form-data`
- **Body Fields (`CreateLessonDto`):**
  - `moduleId`: Integer (Required)
  - `title`: String (Required)
  - `description`: String (Optional)
  - `content`: String (Optional Markdown string)
  - `videoUrl`: String (Optional)
  - `pdf`: File (Optional binary PDF max 10MB)
  - `status`: Enum (`DRAFT` \| `PUBLISHED`, default `DRAFT`)
  - `order`: Integer (Default 0)

#### 2. `GET /api/v1/lessons/module/:moduleId`
- **Purpose:** Get published lessons in a module ordered by `order` column.
- **Business Rules:** Non-admin students only receive lessons where `status === 'PUBLISHED'`.

---

### 4.5 Exams Endpoints (`/api/v1/exams`)

#### 1. `POST /api/v1/exams`
- **Purpose:** Create an exam assigned to a lesson.
- **Request Body (`CreateExamDto`):**
  ```json
  {
    "title": "اختبار التوحيد",
    "description": "وصف الاختبار",
    "passingScore": 60,
    "maxAttempts": 3,
    "lessonId": 10,
    "questions": [
      {
        "text": "ما هو التوحيد؟",
        "type": "MULTIPLE_CHOICE",
        "points": 1,
        "options": [
          { "text": "إفراد الله بالعبادة", "isCorrect": true },
          { "text": "خيار خاطئ", "isCorrect": false }
        ]
      }
    ]
  }
  ```

#### 2. `POST /api/v1/exams/:examId/start`
- **Purpose:** Start new exam attempt for enrolled student.
- **Business Rules:** Verifies student enrollment. Checks that completed attempts do not exceed `Exam.maxAttempts`. Returns questions without `isCorrect` indicators.

#### 3. `POST /api/v1/exams/attempts/:attemptId/submit`
- **Purpose:** Submit student answers and trigger automatic grading engine.
- **Request Body (`SubmitExamDto`):** `{ "answers": [{ "questionId": 1, "selectedOptionId": 10 }] }`
- **Business Rules:** Iterates over questions, verifies `Option.isCorrect`, accumulates score, compares to `passingScore`, sets attempt status to `PASSED` or `FAILED`.

---

### 4.6 Progress Endpoints (`/api/v1/progress`)

- `POST /api/v1/progress/update`: Update completion status (`isCompleted`) for a lesson.
- `GET /api/v1/progress/course/:courseId`: Get course progress percentage.
- `GET /api/v1/progress/last-watched`: Get details of last watched lesson.
- `GET /api/v1/progress/excellence-courses`: Get courses completed with overall grade >= 90%.
- `GET /api/v1/progress/total-points`: Get sum of earned points across passed exams.

---

### 4.7 Users Endpoints (`/api/v1/users`)

#### `PATCH /api/v1/users/profile`
- **Auth:** Bearer JWT
- **Consumes:** `multipart/form-data`
- **Form Fields (`UpdateProfileDto`):**
  - `name`: String (Optional)
  - `avatarUrl`: String (Optional external URL string)
  - `avatar`: File (Optional image upload)
  - `background`: File (Optional image upload)
  - `grade`: String (Optional)
  - `birthDate`: ISO Date string (Optional)
  - `address`: String (Optional)

---

### 4.8 Enrollment Endpoints (`/api/v1/enrollment`)

- `POST /api/v1/enrollment`: Body `{ "courseId": 1 }`. Enrolls student in course with `ACTIVE` status.
- `GET /api/v1/enrollment/check-enrollment?courseId=1`: Returns `{ "isEnrolled": true }`.

---

## 5. DTO Validation Specifications

| DTO Class | Field Name | Type Decorator | Validation Constraints |
|:---|:---|:---|:---|
| `UserRegisterDto` | `email` | `@IsEmail()` | Valid email syntax |
| `UserRegisterDto` | `password` | `@IsString()`, `@MinLength(6)` | Minimum 6 characters |
| `UserRegisterDto` | `name` | `@IsString()`, `@MinLength(2)` | Minimum 2 characters |
| `CreateCourseDto` | `title` | `@IsString()`, `@IsNotEmpty()` | Non-empty string |
| `CreateExamDto` | `passingScore` | `@IsInt()`, `@Min(0)`, `@Max(100)`| Integer between 0 and 100 |
| `CreateExamDto` | `maxAttempts` | `@IsInt()`, `@Min(1)` | Minimum 1 attempt |
| `CreateQuestionDto`| `options` | `@ValidateNested()`, `@ArrayMinSize(2)`| Minimum 2 options required |

---

## 6. Upload Specifications

- **Provider:** Uploadcare CDN (`UploadcareStorageService`).
- **File Validation:** NestJS `ParseFilePipe` with `MaxFileSizeValidator` and `FileTypeValidator`.
- **Limits:**
  - PDF Files: Max 10 MB (`pdfFileSizeLimit = 10 * 1024 * 1024`), allowed mime `application/pdf`.
  - Image Files: Accepted via Uploadcare multipart upload.
- **Direct String Alternative:** If `avatarUrl` string is submitted in `UpdateProfileDto`, the backend uses the string directly without calling Uploadcare.

---

## 7. Error Code Reference

| Status Code | Error Name | Condition / Trigger | Returned Body Format |
|:---|:---|:---|:---|
| `400 Bad Request` | `BadRequestException` | Validation pipe error or invalid file type | `{ "statusCode": 400, "message": [...], "error": "Bad Request" }` |
| `401 Unauthorized` | `UnauthorizedException`| Missing/invalid JWT token, invalid login credentials | `{ "statusCode": 401, "message": "Invalid credentials" }` |
| `403 Forbidden` | `ForbiddenException` | Insufficient role or non-instructor attempting update | `{ "statusCode": 403, "message": "Unauthorized operation" }` |
| `404 Not Found` | `NotFoundException` | Resource ID does not exist in PostgreSQL | `{ "statusCode": 404, "message": "Course not found with id X" }` |
| `409 Conflict` | `ConflictException` | Attempting to register already existing email | `{ "statusCode": 409, "message": "Email already registered" }` |

---

## 8. API Dependency Graph & Integration Workflow

```
[ POST /auth/signin ]
         │
         ▼
[ Save access_token in localStorage ]
         │
         ├───────────────────────────────────────────┐
         ▼                                           ▼
[ GET /users/profile ]                    [ GET /courses/my-courses ]
         │                                           │
         ▼                                           ▼
[ Display User Avatar & Name ]            [ Select Course ]
                                                     │
                                                     ▼
                                          [ GET /modules/course/:id ]
                                                     │
                                                     ▼
                                          [ GET /lessons/module/:id ]
                                                     │
                                                     ▼
                                          [ POST /progress/update ]
                                                     │
                                                     ▼
                                          [ POST /exams/:id/start ]
                                                     │
                                                     ▼
                                          [ POST /exams/attempts/:id/submit ]
                                                     │
                                                     ▼
                                          [ GET /progress/total-points ]
```

---

## 9. Swagger Completeness Audit

- Swagger Documentation Endpoint: `/swagger` (configured via `SwaggerModule.createDocument` in `main.ts`).
- Decorators Present: `@ApiTags`, `@ApiBearerAuth('JWT-auth')`, `@ApiOperation`, `@ApiResponse`, `@ApiBody`, `@ApiConsumes`.
- Audit Verdict: 100% of existing controllers and endpoints contain Swagger decorators.
