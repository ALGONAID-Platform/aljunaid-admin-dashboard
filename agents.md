## STRICT PROJECT SCOPE

This is the Admin Dashboard repository.

You are authorized to read and modify files inside this repository only.

Never modify files in the API, client website, or mobile application repositories.

If a requested feature requires backend changes, do not implement those changes.
Explain the limitation and implement only the Admin Dashboard portion using the existing API.

Before finishing, verify that all modified files belong to this repository.

# Admin Dashboard Development Instructions

## 1. Project Scope
This project is the Admin Dashboard for the Algonaid platform.

All code changes must be limited to the Admin Dashboard project only.

- Do not modify the backend API project (`algonaid-api`).
- Do not modify the client website project.
- Do not modify the mobile application.
- Do not modify files outside the Admin Dashboard project directory.
- Treat the backend API as an existing service to integrate with, not as a codebase to modify.

## 2. Backend API Integration
The backend API base URL is:

`https://api.algonaid.online`

Use the existing API client, authentication mechanism, access-token handling, and project conventions whenever available.

Follow the API documentation provided in the project instructions or relevant documentation files.

For every request:
- Use the appropriate HTTP method and endpoint.
- Send the required authentication headers.
- Handle loading, success, empty, and error states.
- Follow the documented request and response schemas.
- Do not invent endpoints, fields, or response structures.
- If the API does not support a required feature, report the limitation instead of modifying the backend.

## 3. Existing Codebase
Before implementing a feature:
- Inspect the relevant pages, components, routes, hooks, services, and types.
- Reuse existing components and utilities where appropriate.
- Follow the current architecture, naming conventions, styling system, and state-management approach.
- Avoid unnecessary refactoring and unrelated changes.
- Do not replace existing implementations without understanding their dependencies.

## 4. Implementation Rules
- Implement requested features completely within the Admin Dashboard.
- Keep the interface responsive and consistent with the existing dashboard design.
- Include appropriate form validation and user feedback.
- Handle API errors gracefully.
- Maintain type safety and follow the project's existing TypeScript conventions.
- Do not introduce new dependencies unless they are genuinely necessary.
- Never hardcode authentication tokens or secrets.
- Do not remove existing functionality unrelated to the requested task.

## 5. Exam and Quiz Management
When working on course exams, lesson quizzes, challenges, or practice exams, follow the API documentation for these features.

Supported exam types:
- `LESSON_QUIZ`
- `COURSE_QUIZ`
- `CHALLENGE`

Supported ranking criteria:
- `BOTH`
- `SCORE`
- `SPEED`

Supported question types:
- `MULTIPLE_CHOICE`
- `TRUE_FALSE`

Important rules:
- Lesson quizzes use `lessonId`; course exams and challenges use `courseId`. Never send both fields together.
- Challenges require valid `startTime` and `endTime` values in ISO 8601 format.
- Support `passingScore`, `maxAttempts`, `timeLimit`, and `rankingCriteria` according to the API schema.
- Support `asAssignment` for lesson quizzes when applicable.
- Allow questions to include their text, type, points, optional image, and answer options.
- When updating questions, send the complete updated `questions` array if required by the API.
- Support exam image uploads using the documented upload endpoint.
- Implement exam statistics, leaderboards, and practice exam PDF management only through documented API endpoints.

## 6. Verification
After making changes:
- Run the available linting, type-checking, and build commands when practical.
- Fix errors introduced by the changes.
- Review the final changes to ensure they are limited to the Admin Dashboard.
- Report the files changed, features implemented, verification results, and any remaining issues.

## 7. Working Process
For each request:
1. Understand the requested feature.
2. Inspect the existing Admin Dashboard implementation.
3. Identify the minimum files that need modification.
4. Implement the feature without unrelated changes.
5. Verify the implementation.
6. Summarize the changes and any limitations.

If a requirement is ambiguous or the API documentation is insufficient, explain the uncertainty before making assumptions that could affect functionality.

## 8. Execution Status
- [x] Expose `maxAttempts` in lesson quiz creation and editing, and send the configured value through the existing exams API.
- [x] Support question replacement using the API's full-array update contract and require an explicit confirmation before replacing existing questions.
- [x] Add lesson quizzes, course quizzes, and scheduled challenges with the documented association, timing, ranking, assignment, scoring, attempts, time-limit, and question fields.
- [x] Add exam cover and question image uploads through `POST /exams/upload-image`.
- [x] Add exam statistics and leaderboard views through the documented endpoints.
- [x] Keep practice exam PDF management available through the existing `/practice-exams` dashboard screen.
- [ ] API authorization needs alignment before the dashboard's `ADMIN` account can manage exams or practice PDFs: the API controllers/docs allow `ADMIN`, but the service permission checks currently allow only course instructors or `OWNER`. Do not change the API repository without authorization.
- [ ] The API's `GET /exams/:id` response omits question text/options, so editing questions requires explicit full-bank replacement in the dashboard. The page warns and confirms before replacing the bank.
