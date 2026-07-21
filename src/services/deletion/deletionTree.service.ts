import { useCoursesStore } from '../../store/courses.store';
import { useModulesStore } from '../../store/modules.store';
import { useLessonsStore } from '../../store/lessons.store';
import { useQuizzesStore } from '../../store/quizzes.store';
import { useContentStore } from '../../store/content.store';
import { useExamModelsStore } from '../../store/examModels.store';

export type EntityType = 'course' | 'module' | 'lesson' | 'quiz' | 'question' | 'content' | 'examModel';

export interface DeletionImpact {
  targetId: string;
  targetType: EntityType;
  targetTitle: string;
  isDraft: boolean;
  coursesCount: number;
  modulesCount: number;
  lessonsCount: number;
  contentsCount: number;
  quizzesCount: number;
  questionsCount: number;
  answersCount: number;
  examModelsCount: number;
  draftsCount: number;
  mediaFilesCount: number;
  
  // Specific IDs collected for cascading purge
  moduleIds: string[];
  lessonIds: string[];
  contentIds: string[];
  quizIds: string[];
  examModelIds: string[];
}

/**
 * Calculates the exact dynamic impact tree (descendants count) for any given target entity.
 */
export function calculateDeletionImpact(type: EntityType, id: string): DeletionImpact {
  const { courses } = useCoursesStore.getState();
  const { modules } = useModulesStore.getState();
  const { lessons } = useLessonsStore.getState();
  const { quizzes } = useQuizzesStore.getState();
  const { content } = useContentStore.getState();
  const { examModels } = useExamModelsStore.getState();

  const isDraft = String(id).startsWith('draft-');
  let targetTitle = '';
  
  const moduleIds: string[] = [];
  const lessonIds: string[] = [];
  const contentIds: string[] = [];
  const quizIds: string[] = [];
  const examModelIds: string[] = [];

  let questionsCount = 0;
  let answersCount = 0;
  let mediaFilesCount = 0;

  if (type === 'course') {
    const course = courses.find(c => String(c.id) === String(id));
    targetTitle = course?.name || 'مقرر دراسي';

    // Find modules belonging to this course
    const childModules = modules.filter(m => String(m.courseId) === String(id));
    childModules.forEach(m => moduleIds.push(String(m.id)));

    // Find lessons belonging to these modules or directly to course
    const childLessons = lessons.filter(l => 
      moduleIds.includes(String(l.courseId)) || String(l.courseId) === String(id)
    );
    childLessons.forEach(l => lessonIds.push(String(l.id)));

    // Find exam models belonging to this course
    const childExamModels = examModels.filter(em => String(em.courseId) === String(id));
    childExamModels.forEach(em => examModelIds.push(String(em.id)));

  } else if (type === 'module') {
    const module = modules.find(m => String(m.id) === String(id));
    targetTitle = module?.title || 'وحدة تعليمية';
    moduleIds.push(String(id));

    // Find lessons belonging to this module
    const childLessons = lessons.filter(l => String(l.courseId) === String(id));
    childLessons.forEach(l => lessonIds.push(String(l.id)));

    // Find exam models belonging to this module
    const childExamModels = examModels.filter(em => String(em.moduleId) === String(id));
    childExamModels.forEach(em => examModelIds.push(String(em.id)));

  } else if (type === 'examModel') {
    const model = examModels.find(em => String(em.id) === String(id));
    targetTitle = model?.title || 'نموذج امتحان';
    examModelIds.push(String(id));
  }
 else if (type === 'lesson') {
    const lesson = lessons.find(l => String(l.id) === String(id));
    targetTitle = lesson?.title || 'درس تعليمي';
    lessonIds.push(String(id));

  } else if (type === 'quiz') {
    const quiz = quizzes.find(q => String(q.id) === String(id));
    targetTitle = quiz?.title || 'اختبار تقييمي';
    quizIds.push(String(id));

  } else if (type === 'content') {
    const contentItem = content.find(c => String(c.id) === String(id));
    targetTitle = contentItem?.title || 'محتوى رقمي';
    contentIds.push(String(id));

  } else if (type === 'question') {
    targetTitle = 'سؤال تقييمي';
  }

  // If we collected lessonIds, gather their contents & quizzes
  if (lessonIds.length > 0) {
    const childContents = content.filter(c => lessonIds.includes(String(c.lessonId)));
    childContents.forEach(c => contentIds.push(String(c.id)));

    const childQuizzes = quizzes.filter(q => lessonIds.includes(String(q.lessonId)));
    childQuizzes.forEach(q => quizIds.push(String(q.id)));
  }

  // Calculate questions, answers, and media files from collected quizzes
  quizIds.forEach(qId => {
    const quiz = quizzes.find(q => String(q.id) === String(qId));
    if (quiz) {
      questionsCount += quiz.questions.length;
      quiz.questions.forEach(q => {
        if (q.options) answersCount += q.options.length;
        if (q.imageUrl) mediaFilesCount += 1;
      });
    }
  });

  // Calculate media files from collected content items
  contentIds.forEach(cId => {
    const item = content.find(c => String(c.id) === String(cId));
    if (item) {
      if (item.type === 'video' || (item as any).videoUrl) mediaFilesCount += 1;
      if ((item as any).pdfUrl) mediaFilesCount += 1;
    }
  });

  // Calculate total drafts among collected entities
  let draftsCount = 0;
  if (isDraft) draftsCount += 1;
  moduleIds.forEach(id => { if (id.startsWith('draft-')) draftsCount += 1; });
  lessonIds.forEach(id => { if (id.startsWith('draft-')) draftsCount += 1; });
  contentIds.forEach(id => { if (id.startsWith('draft-')) draftsCount += 1; });
  quizIds.forEach(id => { if (id.startsWith('draft-')) draftsCount += 1; });

  return {
    targetId: id,
    targetType: type,
    targetTitle,
    isDraft,
    coursesCount: type === 'course' ? 1 : 0,
    modulesCount: moduleIds.length,
    lessonsCount: lessonIds.length,
    contentsCount: contentIds.length,
    quizzesCount: quizIds.length,
    questionsCount,
    answersCount,
    examModelsCount: examModelIds.length,
    draftsCount,
    mediaFilesCount,
    moduleIds,
    lessonIds,
    contentIds,
    quizIds,
    examModelIds,
  };
}
