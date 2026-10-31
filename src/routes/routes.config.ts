/**
 * Route constants - single source of truth for all paths in the application
 */
export const ROUTES = {
  login: '/login',
  home: '/',
  dashboard: '/admin',
  courses: '/admin/courses',
  lessons: '/admin/lessons',

  quiz: '/admin/quiz',
  examModels: '/admin/exam-models',
  publish: '/admin/publish',
  progress: '/admin/progress',
  media: '/admin/media',
  payments: '/admin/payments',
  accountVerification: '/admin/account-verification',
  assignments: '/admin/assignments',
  notifications: '/admin/notifications',
  databaseBackup: '/admin/backup',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
