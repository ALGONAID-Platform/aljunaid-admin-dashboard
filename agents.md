## Task: Implement Exam and Question Management in Admin Dashboard

Implement exam editing and question management in the existing Admin Dashboard frontend only.

### 1. Exam Editing
- Fetch exam details and questions using `GET /api/v1/exams/:id`.
- Support editing exam metadata, settings, and questions through `PATCH /api/v1/exams/:id` or `PUT /api/v1/exams/:id`.
- Support fields including `title`, `description`, `imageUrl`, `passingScore`, `maxAttempts`, `timeLimit`, `examType`, `rankingCriteria`, `startTime`, `endTime`, `asAssignment`, and `questions`.
- Preserve existing data when loading the edit form.

### 2. Question Management
Support independent question operations without resubmitting the entire exam:

- **Add:** `POST /api/v1/exams/:examId/questions`
- **Edit:** `PATCH /api/v1/exams/questions/:questionId` or `PUT /api/v1/exams/questions/:questionId`
- **Delete:** `DELETE /api/v1/exams/questions/:questionId`

Support question fields `text`, `type`, `points`, `imageUrl`, and `options`. Each option contains `text` and `isCorrect`. Support multiple-choice and true/false questions.

### 3. Image Uploads
- Upload exam cover and question images using `POST /api/v1/exams/upload-image`.
- Use `multipart/form-data` with the `image` or `file` field.
- Support JPG, JPEG, PNG, WEBP, and GIF files up to 10 MB.
- Store the returned `imageUrl` in the corresponding exam or question field.

### 4. Authentication and Permissions
- Reuse the existing API client and Bearer token authentication.
- All listed endpoints require `ADMIN` or `OWNER` permissions.
- Follow existing error-handling and loading-state conventions.

### 5. Constraints
- Modify only the Admin Dashboard frontend.
- Reuse existing components, API utilities, and styling patterns.
- Do not modify the backend, database, mobile app, or public website.
- Preserve existing exam functionality and refresh the UI after successful operations.

### Acceptance Criteria
Administrators can load and edit exams, add/edit/delete individual questions and options, upload exam/question images, and save changes through the specified existing endpoints without breaking existing functionality.