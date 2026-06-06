import { useEffect } from 'react';
import { useCoursesStore, useLessonsStore, useContentStore, useQuizzesStore } from '../store';

/**
 * Initializes all global data stores on app mount.
 * Call this once at the root of the authenticated app.
 */
export function useAppData() {
  const fetchCourses = useCoursesStore((s) => s.fetchCourses);
  const fetchLessons = useLessonsStore((s) => s.fetchLessons);
  const fetchContent = useContentStore((s) => s.fetchContent);
  const fetchQuizzes = useQuizzesStore((s) => s.fetchQuizzes);

  useEffect(() => {
    void fetchCourses();
    void fetchLessons();
    void fetchContent();
    void fetchQuizzes();
  }, [fetchCourses, fetchLessons, fetchContent, fetchQuizzes]);
}
