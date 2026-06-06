/**
 * Route constants - single source of truth for all paths in the application
 */
export const ROUTES = {
  login: '/login',
  dashboard: '/',
  courses: '/courses',
  lessons: '/lessons',
  content: '/content',
  quiz: '/quiz',
  publish: '/publish',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
