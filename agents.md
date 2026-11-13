# Task: Integrate Course Grades APIs into the Frontend

Implement the Grades Management interface by integrating the existing backend APIs. Do not recreate backend functionality or introduce duplicate API endpoints.

## 1. Authentication & Permissions
- Use the existing JWT authentication mechanism.
- Include `Authorization: Bearer <token>` and `Content-Type: application/json`.
- Respect existing roles and permissions:
  - ADMIN / OWNER: Full access.
  - TEACHER: Access only to courses assigned to them.
  - STUDENT: Read-only access to their own grades.

## 2. Course Grades Overview
When opening the Grades tab for a course, call:

`GET /api/v1/grades/courses/:courseId`

Use the response to build the three main sections:

- **Overview:** Display enrolled students count, assessment count, and available academic performance statistics.
- **Student Grades:** Display all enrolled students and their performance summaries.
- **Assessments:** Display all available assignments and exams, including their titles, types, lesson associations, and maximum scores.

Use the `assessments`, `students`, and `gradeRecords` arrays to populate the interface.

## 3. Individual Student Grades
When selecting a student, call:

`GET /api/v1/grades/courses/:courseId/students/:studentId`

Use the returned data to display:

- Student and course information.
- Enrollment information.
- Attendance statistics.
- Assignment grades and submission details.
- Exam grades and results.
- Overall earned points, possible points, GPA, percentage, and letter grade.
- Detailed lesson-by-lesson performance.
- Teacher feedback and grading information.

Render lessons dynamically using the returned `lessons` array. Support both assignments and exams, including lessons containing only one assessment type or neither.

The API also supports the alternative route:

`GET /api/v1/courses/:courseId/students/:studentId/grades`

## 4. Bulk Assessment Grading
Inside the Assessments section:

- Allow the teacher to select an assignment or exam.
- Display all enrolled students in a grading table.
- Show each student's existing grade or an empty state if not graded.
- Allow direct grade entry and editing.
- Collect modified grades and submit them in one request.

Endpoint:

`POST /api/v1/grades/courses/:courseId/bulk`

Request body:

`{ "grades": [{ "studentId": 5, "assessmentId": 201, "score": 9, "note": "Feedback" }] }`

The API also accepts `assignmentId` instead of `assessmentId`.

Display the saved results and update the interface without unnecessary full-page reloads.

## 5. Individual Grade Updates
For editing an individual assignment grade, use:

`PATCH /api/v1/grades/courses/:courseId/students/:studentId/assignments/:assignmentId`

Request body:

`{ "score": 10, "feedback": "Teacher feedback" }`

The API also accepts `note` instead of `feedback`, and supports PUT as an alternative method.

## 6. Frontend Data Mapping
Use the documented response structures directly:

- `course`: Course information.
- `enrolledStudentsCount`: Number of enrolled students.
- `assessments`: Available assessments and maximum scores.
- `students`: Student information and performance summaries.
- `gradeRecords`: Individual assessment grade records.
- `summary`: Student-level performance statistics.
- `lessons`: Detailed lesson-level grading and attendance data.
- `courseExams`: Course-level exam results.

Build responsive tables, summary cards, and assessment details using the existing frontend components and design system.

## 7. Validation & Error Handling
Handle the documented HTTP errors:

- 400: Invalid grade, maximum score exceeded, or student not enrolled.
- 401: Missing or expired authentication token.
- 403: Insufficient permissions.
- 404: Course, student, or assessment not found.

Validate grade inputs against the maximum score and display clear Arabic error messages.

## 8. Implementation Constraints
- Inspect the existing frontend architecture before making changes.
- Reuse existing API services, authentication, components, and state management.
- Follow the existing UI design and Arabic RTL conventions.
- Support desktop, tablet, and mobile layouts.
- Implement loading, empty, success, and error states.
- Avoid mock data and hardcoded assessments.
- Do not duplicate backend functionality or modify unrelated features.
- Ensure all displayed grades and statistics come from actual API responses.

## 9. Acceptance Criteria
Verify that:
1. Course grades load correctly.
2. Student lists and assessment lists display accurate data.
3. Individual student records load correctly.
4. Lesson-level grades and attendance display correctly.
5. Individual grade updates work.
6. Bulk grade entry and saving work.
7. Missing grades are clearly distinguished from zero grades.
8. API validation and authorization errors are handled correctly.
9. Existing platform functionality remains unaffected.

**Important:** This task focuses on frontend implementation and integration with the documented existing backend APIs. Do not rebuild backend endpoints or database models.