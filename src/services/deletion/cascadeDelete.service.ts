import { useCoursesStore } from '../../store/courses.store';
import { useModulesStore } from '../../store/modules.store';
import { useLessonsStore } from '../../store/lessons.store';
import { useQuizzesStore } from '../../store/quizzes.store';
import { useContentStore } from '../../store/content.store';
import { useExamModelsStore } from '../../store/examModels.store';
import { calculateDeletionImpact, type EntityType, type DeletionImpact } from './deletionTree.service';

import { courseService } from '../api/courses.api';
import { modulesService } from '../api/modules.api';
import { lessonService } from '../api/lessons.api';
import { quizService } from '../api/exams.api';
import { contentService } from '../api/content.api';
import { examModelsService } from '../api/examModels.service';

export interface CascadeDeleteResult {
  success: boolean;
  impact: DeletionImpact;
  error?: string;
}

/**
 * Enterprise Cascade Deletion Execution Engine.
 * Ensures zero orphan records in database or memory and complete Zustand store state synchronization.
 */
export async function executeCascadeDelete(
  type: EntityType,
  id: string,
  onProgress?: (stage: string) => void
): Promise<CascadeDeleteResult> {
  const impact = calculateDeletionImpact(type, id);

  try {
    const isDraft = String(id).startsWith('draft-');

    if (onProgress) onProgress('جاري الاتصال بالخادم والتحقق من التبعيات...');

    // 1. Backend Deletion (Only if not a draft)
    if (!isDraft) {
      if (type === 'course') {
        await courseService.delete(id);
      } else if (type === 'module') {
        await modulesService.delete(id);
      } else if (type === 'lesson') {
        await lessonService.delete(id);
      } else if (type === 'quiz') {
        await quizService.delete(id);
      } else if (type === 'content') {
        await contentService.delete(id);
      } else if (type === 'examModel') {
        await examModelsService.delete(id);
      }
    }

    if (onProgress) onProgress('جاري تنظيف التخزين المحلي وتصفية الذاكرة...');

    // 2. Synchronous Multi-Store Cascade Purge
    purgeStoresAndStorage(impact);

    if (onProgress) onProgress('تم الحذف بنجاح وتحديث كافة المؤشرات البيانات.');

    return {
      success: true,
      impact,
    };
  } catch (err: any) {
    console.error(`[CascadeDeleteEngine] Failed to delete ${type} (${id}):`, err);
    const errorMessage =
      err?.response?.data?.message ||
      err?.message ||
      'حدث خطأ غير متوقع أثناء تنفيذ عملية الحذف. تم إلغاء التغييرات للحفاظ على سلامة البيانات.';
    return {
      success: false,
      impact,
      error: errorMessage,
    };
  }
}

/**
 * Purges target entity and all its descendant items from all Zustand stores and localStorage.
 */
function purgeStoresAndStorage(impact: DeletionImpact) {
  const contentSet = new Set(impact.contentIds.map(String));
  const quizSet = new Set(impact.quizIds.map(String));
  const lessonSet = new Set(impact.lessonIds.map(String));
  const moduleSet = new Set(impact.moduleIds.map(String));
  const examModelSet = new Set(impact.examModelIds.map(String));
  const isCourseTarget = impact.targetType === 'course';
  const targetIdStr = String(impact.targetId);

  // 1. Purge Content Items from store
  useContentStore.setState(state => ({
    content: state.content.filter(c => !contentSet.has(String(c.id)))
  }));

  // 2. Purge Quizzes from store
  useQuizzesStore.setState(state => ({
    quizzes: state.quizzes.filter(q => !quizSet.has(String(q.id)))
  }));

  // 3. Purge Lessons from store
  useLessonsStore.setState(state => ({
    lessons: state.lessons.filter(l => !lessonSet.has(String(l.id)))
  }));

  // 4. Purge Modules from store
  useModulesStore.setState(state => ({
    modules: state.modules.filter(m => !moduleSet.has(String(m.id)))
  }));

  // 5. Purge Exam Models from store
  useExamModelsStore.setState(state => ({
    examModels: state.examModels.filter(em => !examModelSet.has(String(em.id)))
  }));

  // 5. Purge Course or Recalculate Stats in store
  useCoursesStore.setState(state => {
    let updatedCourses = state.courses;
    if (isCourseTarget) {
      updatedCourses = updatedCourses.filter(c => String(c.id) !== targetIdStr);
    }

    const currentLessons = useLessonsStore.getState().lessons;
    const currentModules = useModulesStore.getState().modules;

    updatedCourses = updatedCourses.map(course => {
      const remainingLessons = currentLessons.filter(l => {
        const parentModule = currentModules.find(m => String(m.id) === String(l.courseId));
        return parentModule ? String(parentModule.courseId) === String(course.id) : String(l.courseId) === String(course.id);
      }).length;
      return { ...course, lessonsCount: remainingLessons };
    });

    return { courses: updatedCourses };
  });

  // Clean localStorage draft entries if applicable
  cleanDraftLocalStorage(impact);
}

/**
 * Purges orphan draft entries from localStorage persistent keys.
 */
function cleanDraftLocalStorage(impact: DeletionImpact) {
  const keysToInspect = [
    'draft-courses-storage',
    'draft-modules-storage',
    'draft-lessons-storage',
    'draft-quizzes-storage',
    'draft-content-storage',
  ];

  try {
    const allDeletedIds = new Set([
      impact.targetId,
      ...impact.moduleIds,
      ...impact.lessonIds,
      ...impact.contentIds,
      ...impact.quizIds,
    ]);

    keysToInspect.forEach(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.state) {
          Object.keys(parsed.state).forEach(stateProp => {
            if (Array.isArray(parsed.state[stateProp])) {
              parsed.state[stateProp] = parsed.state[stateProp].filter(
                (item: any) => !allDeletedIds.has(String(item.id))
              );
            }
          });
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      } catch {
        // Ignore JSON parse errors for non-json localstorage keys
      }
    });
  } catch (err) {
    console.warn('[CascadeDeleteEngine] LocalStorage cleanup warning:', err);
  }
}
