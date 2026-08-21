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
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
