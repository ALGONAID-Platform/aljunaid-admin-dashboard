# Enterprise Backend Gap Analysis & Requirements Specification
## Aljunaid Educational Platform (aljunaid-admin-dashboard)

**Document Version:** 1.0.0  
**Target Audience:** Backend Engineers, System Architects, Lead Developers, Security Auditors  
**Scope:** Complete frontend-to-backend gap evaluation, technical contract specification, database schemas, and backend roadmap.

---

## 1. Executive Summary

An exhaustive technical audit of the `aljunaid-admin-dashboard` frontend codebase was performed to evaluate its architectural expectations against the existing backend API contracts (`/src/types/api/index.ts`, `/src/services/api/*`, `/src/services/sync/*`, `/src/services/deletion/*`).

The evaluation revealed that while the frontend implements an enterprise-grade learning management administration suite—complete with multi-tier content hierarchies (Courses → Modules → Lessons → Attachments/Content & Quizzes), client-side autosave queues, full offline recovery, optimistic UI state management, dynamic academic progress tracking, and cascading deletion calculations—**the backend API contracts are significantly under-engineered**.

### Critical Architectural Mismatches Discovered:
1. **Absence of a Dedicated Content/Attachment Asset Subsystem:** Content items (Videos, PDFs, Word documents, text articles) do not exist as independent entities on the backend. The frontend is currently forced to hack attachment data onto scalar fields of the `Lesson` model (`videoUrl`, `pdfUrl`, `content`).
2. **N+1 REST Polling & Retrieval Anti-Patterns:** Aggregated data fetching (e.g. `lessonService.getAll()` and `contentService.getAll()`) requires fetching `/modules` and making $N$ subsequent network requests for `/lessons/module/{id}`, leading to extreme network overhead and frontend performance bottlenecks.
3. **Absence of Server-Side Cascade Deletion:** Deleting a Course or Module requires the client browser to execute multi-step recursive HTTP calls and clean up 5 Zustand stores on the client side (`cascadeDelete.service.ts`), exposing the platform to severe data corruption and orphaned database records if a request fails mid-way.
4. **Conceptual Model Inconsistency:** The frontend forms accept `courseId` when creating lessons, treating `courseId` as `moduleId` due to a missing explicit mapping layer or flexible entity binding on the backend.
5. **Missing Business Features & Audit Fields:** Publishing workflows, draft flags (`isPublished`, `publishedAt`, `publishedBy`), quiz time limits, quiz attempt limits, user roles/permissions, user avatars, and user bio properties are completely missing or unpersisted on the backend.

---

## 2. Critical Blockers (P0 - Immediate Fix Required)

| ID | Issue Description | Frontend Expectation | Backend Reality | Impact |
|:---|:---|:---|:---|:---|
| **BLK-01** | **No Content Asset Table/API** | Full multi-attachment management per lesson (Videos, PDFs, Word docs, links) with status tracking (`uploading`, `ready`, `error`). | Hacked single scalar fields on `Lesson` (`videoUrl`, `pdfUrl`, `content`). PDF deletion is impossible. | Multi-media lessons break. Only 1 video and 1 PDF per lesson allowed. |
| **BLK-02** | **Lack of Transactional Cascade Deletion** | Deleting a Course, Module, or Lesson atomically deletes all descendant entities and associated files on cloud storage. | No cascade logic on DB or endpoints. Deleting a parent leaves orphaned lessons, quizzes, and attachments. | Database corruption, disk leak on media storage, orphaned child rows. |
| **BLK-03** | **Missing Hierarchical Bulk & Aggregated Endpoint** | Fetching platform state in a single request for initial load and offline sync. | N+1 requests: GET `/modules`, then GET `/lessons/module/{id}` for each module, then extract content. | Severe latency (50+ HTTP requests for medium course), app freezing on load. |
| **BLK-04** | **Unpersisted Exam Metadata** | `Quiz` model requires `timeLimit` (mins), `instructions`, `passingScore`, `maxAttempts`. | Backend `Exam` table lacks `timeLimit`, `instructions`, and `maxAttempts`. Hardcoded defaults used. | Inability to configure timed exams or attempt controls for students. |

---

## 3. High Priority Issues (P1 - Required for V1 Release)

| ID | Issue Description | Frontend Expectation | Backend Reality | Impact |
|:---|:---|:---|:---|:---|
| **HIGH-01** | **Missing Audit & Publishing Fields** | Lessons/Courses track `isPublished`, `publishedAt`, `publishedBy`, `createdAt`, `updatedAt`. | Backend relies on string `status` or missing fields. Audit trail absent. | No track of who published content or when it became active for students. |
| **HIGH-02** | **No Server-Side Search, Filter, Pagination** | `GET /courses?search=...&page=1&limit=10&status=published`. | Endpoints return raw, unpaginated JSON arrays. Client filters in memory. | Memory exhaustion and bandwidth collapse as dataset scales above 500 items. |
| **HIGH-03** | **Missing Image URL Direct Submission** | Modals allow submitting image URLs (`http://...`) or uploading binary files. | Upload endpoints only accept `multipart/form-data`. Direct URL validation absent. | System throws 400 Bad Request when users paste external image URLs. |
| **HIGH-04** | **JWT Refresh & Role-Based Access** | Token refresh rotation via `POST /auth/refresh`, RBAC permissions array (`admin`, `teacher`, `student`). | Single non-expiring/stateless JWT token without refresh flow or fine-grained permissions. | Security exposure; token theft cannot be revoked without full database invalidation. |

---

## 4. Medium Priority Issues (P2)

| ID | Issue Description | Frontend Expectation | Backend Reality | Impact |
|:---|:---|:---|:---|:---|
| **MED-01** | **Autosave & Offline Queue Support** | Endpoint to handle bulk background delta sync requests (`POST /sync/batch`). | Client polls individual REST endpoints. Sync fails if internet drops mid-save. | Risk of work loss during network instability. |
| **MED-02** | **User Profile Attributes** | User profile includes `bio`, `phone`, `avatarUrl`, `role`, `isActive`. | `BackendUser` only provides `id`, `name`, `email`, `role`. Profile details missing. | Incomplete user management interface. |
| **MED-03** | **Academic Progress Analytics API** | Endpoint `GET /dashboard/academic-progress` providing aggregated completion rates. | Client derives all completion metrics by executing full dataset iteration across 5 stores. | Heavy client-side computation on dashboard load. |

---

## 5. Low Priority Issues (P3)

| ID | Issue Description | Frontend Expectation | Backend Reality | Impact |
|:---|:---|:---|:---|:---|
| **LOW-01** | **Activity Audit Log Stream** | Dashboard activity feed (`/dashboard/activity-logs`). | Mocked on frontend using item `createdAt` timestamps. | No real audit log history. |
| **LOW-02** | **AI Copilot Context Endpoint** | `POST /ai/copilot/suggest` to assist in writing lesson content or quiz questions. | UI component built (`AIAssistantCopilot.tsx`), backend endpoint missing. | AI assistant operates with local fallback mock responses. |

---

## 6. Missing Endpoints

The backend **MUST** implement the following new endpoints to satisfy frontend requirements:

```http
### Content / Attachment Management
GET    /api/v1/content                             # List all content items across lessons
GET    /api/v1/content/lesson/{lessonId}          # List content items for specific lesson
POST   /api/v1/content                            # Create content item (Video, PDF, Doc, Link)
GET    /api/v1/content/{id}                       # Get single content item
PUT    /api/v1/content/{id}                       # Update content item
DELETE /api/v1/content/{id}                       # Delete content item (with storage file cleanup)

### Publishing & Workflow
PATCH  /api/v1/courses/{id}/publish               # Publish/unpublish course
PATCH  /api/v1/lessons/{id}/publish               # Publish/unpublish lesson
POST   /api/v1/publish/bulk                       # Bulk publish array of lesson IDs

### Hierarchical & Aggregated Views
GET    /api/v1/courses/full-hierarchy             # Tree response: Course -> Modules -> Lessons -> Content & Exams
GET    /api/v1/dashboard/academic-progress        # System-wide academic progress metrics

### Sync & Offline Queues
POST   /api/v1/sync/batch                         # Process offline autosave action queue

### Auth & User Security
POST   /api/v1/auth/refresh                       # Refresh JWT access token
GET    /api/v1/auth/me                            # Fetch active session profile & permissions
```

---

## 7. Existing Endpoints That Need Modification

1. **`GET /api/v1/courses` & `GET /api/v1/lessons`**
   - **Current:** Returns flat unpaginated array.
   - **Required:** Add query params `page`, `limit`, `search`, `sortBy`, `sortOrder`, `isPublished`. Return wrapped object: `{ data: [], meta: { page, limit, total, totalPages } }`.

2. **`POST /api/v1/courses` & `PUT /api/v1/courses/{id}`**
   - **Current:** Expects `FormData` or JSON.
   - **Required:** Accept BOTH JSON with `imagePreview` URL string AND `multipart/form-data` with `file` upload.

3. **`POST /api/v1/lessons` & `PUT /api/v1/lessons/{id}`**
   - **Current:** Accepts `courseId` representing `moduleId`.
   - **Required:** Accept BOTH `moduleId` (required) AND optional `courseId` for backwards compatibility/direct course assignment.

4. **`POST /api/v1/exams` & `PUT /api/v1/exams/{id}`**
   - **Current:** Missing `timeLimit`, `instructions`, `passingScore`, `maxAttempts`.
   - **Required:** Update request DTO to accept these fields and persist them to the database.

5. **`DELETE /api/v1/courses/{id}` & `DELETE /api/v1/modules/{id}` & `DELETE /api/v1/lessons/{id}`**
   - **Current:** Standard SQL `DELETE` without cascade parameters or transaction context.
   - **Required:** Implement database-level foreign key cascade deletion (`ON DELETE CASCADE`) or wrap in a database transaction that deletes child content, exams, questions, and triggers background cleanup of S3/cloud storage media files.

---

## 8. Missing Response Fields

| Model | Missing Field Name | Type | Description / Usage |
|:---|:---|:---|:---|
| `Course` | `isPublished` | `boolean` | Indicates whether course is live for students |
| `Course` | `difficulty` | `string` | Level ('مبتدئ' \| 'متوسط' \| 'متقدم') |
| `Course` | `totalDuration` | `number` | Total duration of course content in minutes |
| `Course` | `tags` | `string[]` | Keywords for categorization and search |
| `Lesson` | `hasContent` | `boolean` | Calculated flag indicating if content assets are attached |
| `Lesson` | `publishedAt` | `ISO String` | Timestamp when lesson was published |
| `Lesson` | `publishedBy` | `string` | User ID or name who published the lesson |
| `Exam` (Quiz) | `timeLimit` | `number` | Exam time limit in minutes |
| `Exam` (Quiz) | `instructions` | `string` | Test instructions and guidelines for students |
| `Exam` (Quiz) | `passingScore` | `number` | Passing grade threshold (0 - 100%) |
| `Exam` (Quiz) | `maxAttempts` | `number` | Maximum allowed attempts |
| `User` | `avatarUrl` | `string` | Profile image URL |
| `User` | `bio` | `string` | User bio / qualifications |
| `User` | `permissions` | `string[]` | Array of RBAC permission keys |

---

## 9. Missing Database Changes

1. **New Table: `content_items`**
   - Must be created with foreign key `lesson_id` referencing `lessons(id) ON DELETE CASCADE`.
   - Columns: `id`, `lesson_id`, `title`, `type` (`video`, `pdf`, `word`, `image`, `link`), `url`, `file_name`, `file_size`, `status` (`uploading`, `ready`, `error`), `created_at`, `updated_at`.

2. **Cascade Delete Foreign Keys:**
   - `modules.course_id` ➔ `courses.id ON DELETE CASCADE`
   - `lessons.module_id` ➔ `modules.id ON DELETE CASCADE`
   - `exams.lesson_id` ➔ `lessons.id ON DELETE CASCADE`
   - `questions.exam_id` ➔ `exams.id ON DELETE CASCADE`
   - `options.question_id` ➔ `questions.id ON DELETE CASCADE`

3. **Indexes to Add:**
   - Index on `lessons(module_id)`
   - Index on `modules(course_id)`
   - Index on `content_items(lesson_id)`
   - Index on `exams(lesson_id)`

---

## 10. Missing Business Logic

1. **Readiness Calculation Engine:**
   - Server-side rule: A Lesson is "Ready for Publish" ONLY IF:
     - `title` is non-empty.
     - `description` is non-empty.
     - It has at least 1 Content Asset (`content_items` count > 0).
     - It has at least 1 Exam (`exams` count > 0).
2. **File Deletion Lifecycle Manager:**
   - When a `ContentItem` or `Course` cover image is updated or deleted, the server MUST fire an asynchronous job to delete the corresponding file from physical storage (S3 / Local Storage).
3. **Draft State Rules:**
   - Unpublished lessons and courses must be hidden from student endpoints (`/api/v1/student/*`) while remaining visible to admin endpoints (`/api/v1/admin/*`).

---

## 11. Missing Transactions

- **Course Creation Wizard (`QuickCourseBuilderModal` Batch Save):**
  - Executing `POST /api/v1/courses/batch-create` must process Course + Modules + Lessons + Content + Exams inside a single **ACID Transaction**. If any step fails, the entire transaction rolls back.
- **Cascade Deletion:**
  - `DELETE /api/v1/courses/{id}` must execute inside a database transaction to prevent partial deletion state.

---

## 12. Missing Validations

| Endpoint | Payload Field | Validation Rule |
|:---|:---|:---|
| `POST /auth/login` | `email` | Must be valid email format, min length 5. |
| `POST /courses` | `name` | Min 5 chars, Max 100 chars, unique title. |
| `POST /courses` | `imagePreview` | Must be valid HTTP/HTTPS URL string if passed. |
| `POST /lessons` | `order` | Integer >= 1. |
| `POST /exams` | `passingScore` | Integer between 0 and 100. |
| `POST /exams` | `timeLimit` | Integer >= 1 minute. |
| `POST /content` | `type` | Must be one of `['video', 'pdf', 'word', 'image', 'link']`. |

---

## 13. Missing Permissions (RBAC)

Required permission matrix for JWT payloads and middleware authorization:

| Role | Course Management | Lesson Editing | Publishing Content | User Management |
|:---|:---:|:---:|:---:|:---:|
| **ADMIN** | Full (CRUD) | Full (CRUD) | Full (Publish/Unpublish) | Full (CRUD) |
| **TEACHER** | View / Edit Assigned | Full (CRUD) | Draft Only (Requires Admin Review) | None |
| **STUDENT** | Read (Published Only)| Read (Published Only)| None | None |

---

## 14. Missing Synchronization Logic

- **Optimistic Locking / Versioning:**
  - Add an `updatedAt` or `version` integer column to `courses`, `modules`, `lessons`, `exams`.
  - When the client's `autosaveQueue.service.ts` pushes offline edits, the backend must verify that the `version` matches. If a conflict occurs, return `409 Conflict` with the latest server entity.

---

## 15. Performance Improvements

1. **Solve N+1 Query Problem:**
   - Implement `GET /api/v1/courses/{id}/tree` using SQL `JOIN` or Prisma `include: { modules: { include: { lessons: { include: { contentItems: true, exams: true } } } } }`.
2. **Database Indexing:**
   - B-Tree index on foreign keys (`course_id`, `module_id`, `lesson_id`) to accelerate cascade deletes and JOIN lookups.
3. **Response Compression & Caching:**
   - Enable Gzip / Brotli response compression on public catalog endpoints.
   - Cache public course hierarchy in Redis with cache invalidation on publish.

---

## 16. Security Improvements

1. **Input Sanitization:**
   - Sanitize Markdown content (`content` field) on submission using DOMPurify / sanitize-html to prevent Stored XSS attacks.
2. **Rate Limiting:**
   - Apply strict rate limiting on `/api/v1/auth/login` (5 attempts per minute) and file upload endpoints.
3. **Secure File Uploads:**
   - Validate file mime-types by inspecting file magic bytes (header signatures) rather than trusting client-reported extension headers.

---

## 17. Complete API Contract

### Course Endpoints
```http
GET /api/v1/courses?page=1&limit=10&search=math&isPublished=true
Response 200 OK:
{
  "data": [
    {
      "id": "1",
      "name": "دبلوم العلوم الإسلامية",
      "description": "نبذة...",
      "imagePreview": "https://...",
      "isPublished": true,
      "lessonsCount": 12,
      "createdAt": "2026-07-21T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}

POST /api/v1/courses
Request Body (JSON or FormData):
{
  "name": "عنوان المقرر",
  "description": "وصف تفصيلي...",
  "imagePreview": "https://..."
}
Response 201 Created: { "id": "1", "name": "...", "createdAt": "..." }

DELETE /api/v1/courses/{id}
Response 200 OK: { "success": true, "message": "Course and all descendants deleted successfully." }
```

### Module Endpoints
```http
GET /api/v1/modules/course/{courseId}
POST /api/v1/modules
PUT /api/v1/modules/{id}
DELETE /api/v1/modules/{id}
```

### Lesson Endpoints
```http
GET /api/v1/lessons/module/{moduleId}
POST /api/v1/lessons
Request Body:
{
  "courseId": "1", // treated as moduleId or mapped
  "title": "عنوان الدرس",
  "description": "وصف...",
  "order": 1
}

PATCH /api/v1/lessons/{id}/publish
Request Body: { "isPublished": true }
```

### Content Item Asset Endpoints
```http
GET /api/v1/content/lesson/{lessonId}
POST /api/v1/content
Request Body:
{
  "lessonId": "10",
  "title": "فيديو الشرح",
  "type": "video", // 'video' | 'pdf' | 'word' | 'image' | 'link'
  "url": "https://youtube.com/watch?v=...",
  "content": "# Markdown text..."
}

DELETE /api/v1/content/{id}
```

### Exam / Quiz Endpoints
```http
GET /api/v1/exams/lesson/{lessonId}
POST /api/v1/exams
Request Body:
{
  "courseId": "1",
  "lessonId": "10",
  "title": "اختبار الباب الأول",
  "description": "وصف...",
  "instructions": "أجب عن جميع الأسئلة...",
  "passingScore": 60,
  "timeLimit": 30,
  "maxAttempts": 3,
  "questions": [
    {
      "type": "mcq",
      "text": "ما هو...؟",
      "options": ["خيار 1", "خيار 2"],
      "correctAnswer": "خيار 1",
      "points": 1
    }
  ]
}
```

---

## 18. Recommended Database Schema Changes (Prisma ORM)

```prisma
// datasource db { provider = "postgresql", url = env("DATABASE_URL") }

enum Role {
  ADMIN
  TEACHER
  STUDENT
}

enum ContentType {
  VIDEO
  PDF
  WORD
  IMAGE
  LINK
}

enum QuestionType {
  MCQ
  TRUEFALSE
  SHORT
}

model User {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique
  passwordHash String
  role         Role      @default(STUDENT)
  avatarUrl    String?
  bio          String?
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@map("users")
}

model Course {
  id           String    @id @default(uuid())
  name         String
  description  String    @db.Text
  imagePreview String?
  isPublished  Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  modules      Module[]

  @@map("courses")
}

model Module {
  id          String   @id @default(uuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title       String
  description String?  @db.Text
  order       Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  lessons     Lesson[]

  @@index([courseId])
  @@map("modules")
}

model Lesson {
  id          String        @id @default(uuid())
  moduleId    String
  module      Module        @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  title       String
  description String        @db.Text
  order       Int           @default(1)
  isPublished Boolean       @default(false)
  publishedAt DateTime?
  publishedBy String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  contents    ContentItem[]
  exams       Exam[]

  @@index([moduleId])
  @@map("lessons")
}

model ContentItem {
  id          String      @id @default(uuid())
  lessonId    String
  lesson      Lesson      @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  title       String
  type        ContentType
  url         String?
  fileName    String?
  fileSize    String?
  content     String?     @db.Text
  status      String      @default("ready")
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([lessonId])
  @@map("content_items")
}

model Exam {
  id           String     @id @default(uuid())
  lessonId     String
  lesson       Lesson     @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  title        String
  description  String     @db.Text
  instructions String?    @db.Text
  passingScore Int        @default(60)
  timeLimit    Int        @default(30)
  maxAttempts  Int        @default(3)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  questions    Question[]

  @@index([lessonId])
  @@map("exams")
}

model Question {
  id            String       @id @default(uuid())
  examId        String
  exam          Exam         @relation(fields: [examId], references: [id], onDelete: Cascade)
  type          QuestionType
  text          String       @db.Text
  options       String[]
  correctAnswer String
  points        Int          @default(1)
  order         Int          @default(1)
  imageUrl      String?

  @@index([examId])
  @@map("questions")
}
```

---

## 19. Recommended DTO Changes (NestJS / TypeScript)

```typescript
// create-content.dto.ts
import { IsString, IsEnum, IsOptional, IsUrl } from 'class-validator';

export enum ContentTypeDto {
  VIDEO = 'video',
  PDF = 'pdf',
  WORD = 'word',
  IMAGE = 'image',
  LINK = 'link',
}

export class CreateContentDto {
  @IsString()
  lessonId: string;

  @IsString()
  title: string;

  @IsEnum(ContentTypeDto)
  type: ContentTypeDto;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

// create-exam.dto.ts
import { IsString, IsNumber, IsArray, ValidateNested, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionDto {
  @IsString()
  type: 'mcq' | 'truefalse' | 'short';

  @IsString()
  text: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsString()
  correctAnswer: string;

  @IsOptional()
  @IsNumber()
  points?: number;
}

export class CreateExamDto {
  @IsString()
  courseId: string;

  @IsString()
  lessonId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  instructions: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore: number;

  @IsNumber()
  @Min(1)
  timeLimit: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}
```

---

## 20. Recommended Entity Changes

1. **Course Entity:** Add `isPublished` (boolean), `modules` (relation), `lessonsCount` (virtual counter or cached column).
2. **Lesson Entity:** Remove inline `videoUrl`, `pdfUrl`, `content` strings. Replace with one-to-many relationship `contents: ContentItem[]`. Add `isPublished` (boolean), `publishedAt` (timestamp), `publishedBy` (string).
3. **Exam Entity:** Add `timeLimit` (integer), `instructions` (text), `passingScore` (integer), `maxAttempts` (integer).

---

## 21. Priority Matrix

```
       HIGH IMPACT
          │
          │  [BLK-01] Content Asset Table      [BLK-02] Transactional Cascade Delete
          │  [BLK-03] Aggregated Hierarchy     [HIGH-01] Audit & Publishing Fields
          │
          │  [HIGH-02] Server Pagination       [HIGH-03] Direct Image URL Input
 HIGH ────┼─────────────────────────────────────────────────────────────────────── LOW
 EASE     │                                                                      EASE
          │  [MED-02] User Profile Fields       [MED-01] Autosave Queue Batch Sync
          │  [MED-03] Progress Metrics API     [LOW-02] AI Copilot Endpoint
          │
          │  [LOW-01] Activity Feed Endpoint
          │
          └───────────────────────────────────────────────────────────────────────
                                    LOW IMPACT
```

---

## 22. Backend Implementation Roadmap

### Phase 1: Core Hierarchy & Content Asset Subsystem (Days 1–3)
- Execute Prisma migration for `content_items`, `exams`, `questions`, and `onDelete: Cascade` foreign keys.
- Build Content Asset CRUD endpoints (`/api/v1/content/*`).
- Modify `Lesson` entity to support dynamic content attachments and publishing flags (`isPublished`, `publishedAt`).

### Phase 2: Database Cascade Deletes & Batch Hierarchy Endpoint (Days 4–5)
- Verify PostgreSQL database cascade constraints.
- Build `GET /api/v1/courses/full-hierarchy` and `GET /api/v1/courses/{id}/tree` endpoints to solve N+1 frontend fetching.
- Update `DELETE /courses/{id}`, `DELETE /modules/{id}`, and `DELETE /lessons/{id}` to ensure atomic cascades and S3 file cleanups.

### Phase 3: Exam Enhancements & Audit Trails (Days 6–7)
- Add `timeLimit`, `instructions`, `passingScore`, and `maxAttempts` to `Exam` entity and DTOs.
- Implement publishing workflow endpoints (`PATCH /lessons/{id}/publish` and `POST /publish/bulk`).

### Phase 4: Pagination, Filtering, Security & Optimizations (Days 8–10)
- Add server-side pagination, search, and sorting to `/courses` and `/lessons`.
- Implement JWT Refresh Token rotation (`POST /auth/refresh`).
- Build aggregated `GET /dashboard/academic-progress` endpoint.
- Final API regression testing against `aljunaid-admin-dashboard`.
