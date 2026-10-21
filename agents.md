# Admin Dashboard Implementation Requirements — Paid Courses System

## 1. Paid Course Management

- Implement interfaces for creating and editing paid courses, including recorded courses and live bootcamps.
- Add support for regular and discounted prices in the following currencies:
  - Old Yemeni Rial.
  - New Yemeni Rial.
  - Saudi Riyal.
  - US Dollar.
- Add a `maxStudents` field to configure course capacity, allowing unlimited enrollment when no limit is specified.
- Add course start date, end date, duration in weeks, weekly schedule, and course objectives fields.
- Add `certificateMinScore` and `certificateMinAttendance` fields to configure certificate eligibility requirements.
- Display enrolled student counts, remaining seats, and course capacity status in course details.
- Provide an action to convert a live course into a recorded course, allowing price updates during conversion.

## 2. Payment Requests and Enrollment Management

- Create a page for reviewing student-submitted manual payment requests.
- Display the following information for each payment request:
  - Student name and academic information.
  - Course details.
  - Payment amount and currency.
  - Selected receiving bank account or payment wallet.
  - Transaction number.
  - Payment receipt image with a clear preview.
  - Student notes and payment status.
- Provide actions to approve or reject payment requests.
- Require a rejection reason when rejecting a payment request.
- Display payment statuses clearly, including `PENDING`, `APPROVED`, and `REJECTED`, where supported by the existing system.
- Display success or error messages after approval or rejection.
- Provide filters for payment status, course, student, and currency when supported by the available data and API.
- Display the enrollment status associated with each payment request.

## 3. Payment Accounts and Wallet Management

- Create a page for managing bank accounts and payment wallets used to receive course payments.
- Provide forms for adding and editing payment accounts.
- Support the following account fields:
  - Bank or payment provider name.
  - Account holder name.
  - Account number.
  - Currency.
  - Payment instructions.
  - QR code image URL, when available.
  - Activation status (`isActive`).
  - Display order (`order`).
- Allow administrators to activate or deactivate accounts and change their display order.
- Clearly display each account's currency to prevent confusion between different currencies.

## 4. Course Lessons and Modules Management

- Implement interfaces for creating and editing lessons and associating them with the appropriate modules and courses.
- Add fields for lesson title, description, day number, and display order.
- Support scheduled lesson dates through `scheduledAt` and lesson duration in minutes.
- Add an `isMandatory` option to distinguish mandatory lessons from optional lessons.
- Add an `isFreePreview` option to identify lessons available for free preview.
- Support the lesson content types required by the existing system, including recorded videos, reading materials, live lectures, files, assignments, and exams, where applicable.
- Provide controls for updating live lecture status, including `SCHEDULED` and `LIVE_NOW`, according to the statuses supported by the API.
- Display clear validation errors when the API rejects a scheduled lesson date because it falls outside the course start and end dates.
- Display lessons in the correct daily and manual order using the data returned by the existing system.

## 5. Lesson Video Uploads

- Provide an interface for uploading video files and associating them with the appropriate course and lesson.
- Allow administrators to select video files and display upload status and progress when supported.
- Support the documented video formats: MP4, MOV, AVI, MKV, and WebM.
- Respect the documented maximum file size of 1 GB.
- After a successful upload, use the video URL returned by the API and associate it with the relevant lesson.
- Display the file name, size, URL, and upload status.
- Show clear error messages when an upload fails.

## 6. Student Academic Evaluation

- Create a page for viewing a student's academic evaluation within a specific course.
- Display student and course information alongside the academic summary, including:
  - Overall progress percentage.
  - Cumulative GPA (`cumulativeGpa`).
  - Letter grade (`gradeLetter`).
  - Attendance percentage.
  - Completed lessons and total counted lessons.
  - Submitted assignments and total assignments.
  - Assignment average score.
  - Passed exams and total exams.
  - Quiz average score.
- Display the student's daily timeline, including attendance and completion status for each lesson.
- Display the status and score of each associated assignment when available.
- Display certificate eligibility requirements, including minimum attendance and score, along with eligibility and issuance statuses.
- Use the evaluation results returned by the existing API. Do not reimplement GPA calculation formulas in the dashboard.

## 7. Assignment and Homework Review

- Create an interface for viewing student-submitted assignments.
- Display the assignment type, status, student information, and associated course and lesson.
- Allow administrators to open submitted files and links, including PDF files, ZIP files, GitHub repositories, and Figma links, according to the attachment type.
- Provide an interface for manually grading practical assignments.
- Allow administrators to enter a score and written feedback.
- Support attaching corrective images or code through `feedbackImageUrl` if supported by the existing system.
- Display the grading status and saved score after evaluation.
- Distinguish practical assignments (`TASK`) from automatically graded quizzes (`QUIZ`). Do not add manual grading controls for quizzes unless required by the existing system.

## 8. Certificate Management

- Provide a page for reviewing certificates issued to students in each course.
- Display the certificate serial number, student name, course, final grade, and issue date.
- Display the verification URL and QR code when available.
- Show certificate eligibility and issuance status within the student's academic evaluation page.
- Do not introduce a manual certificate issuance process that bypasses the system's eligibility requirements unless an explicitly authorized capability already exists.

## 9. User Experience and Permissions

- Organize the features into clear sections within the existing Admin Dashboard.
- Reuse the project's existing components, styling, and design patterns.
- Provide loading states, success and error messages, and empty states for each page.
- Display API errors in a clear and understandable format for administrators.
- Hide actions that the current administrator does not have permission to perform, according to the existing authorization system.
- Integrate all functionality with the existing API. Do not create a new backend or modify API contracts as part of this task.
- Preserve existing dashboard functionality and avoid unrelated changes to other project areas.

## Implementation Instructions for the Agent

1. Inspect the existing Admin Dashboard project and identify its current pages, components, services, and architecture.
2. Implement the requirements above exclusively within the Admin Dashboard, reusing existing code wherever possible.
3. Integrate the interfaces with the existing API endpoints documented in the project. Do not assume undocumented endpoints exist.
4. If a feature requires an unavailable endpoint or field, document the limitation instead of modifying the API.
5. Do not modify the Flutter mobile application, public website, backend API, database, or Prisma schema.
6. Avoid broad refactoring, architectural changes, or technology migrations unrelated to these requirements.
7. Test the dashboard pages and available operations, including course management, payment approval and rejection, video uploads, assignment grading, and academic evaluation.
8. At completion, provide a summary of implemented features, incomplete features, and any API dependencies preventing full implementation.