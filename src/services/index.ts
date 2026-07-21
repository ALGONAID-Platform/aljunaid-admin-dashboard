/**
 * src/services/index.ts
 * Central barrel for all services — real API calls only.
 */
export { apiClient } from './api.client';
export { authService } from './auth.service';
export { courseService } from './course.service';
export { lessonService } from './lesson.service';
export { contentService } from './content.service';
export { quizService } from './quiz.service';
export { publishService } from './publish.service';

// New services
export { modulesService } from './api/modules.api';
export { enrollmentService } from './api/enrollment.api';
export { progressService } from './api/progress.api';
export { usersService } from './api/users.api';
export { examModelsService } from './api/examModels.service';
