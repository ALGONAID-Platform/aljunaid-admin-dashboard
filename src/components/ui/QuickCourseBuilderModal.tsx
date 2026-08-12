import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, BookOpen, Layers, BookMarked, FileText, ClipboardList, CheckCircle2,
  Send, ChevronLeft, ChevronRight, X, Plus, Trash2, Edit3, Upload, Loader2,
  AlertCircle, PlayCircle, FileType2, Save, ArrowRight, Eye, RefreshCw, Link as LinkIcon, Image as ImageIcon, FileSpreadsheet
} from 'lucide-react';
import { useCoursesStore, useModulesStore, useLessonsStore, useContentStore, useQuizzesStore } from '../../store';
import { resolveErrorMessage } from '../../lib/errors';
import { courseService, lessonService, contentService, quizService, publishService } from '../../services';
import { uploadService } from '../../services/api/upload.api';
import { MarkdownQuestionEditor } from '../../modules/quizzes/components/MarkdownQuestionEditor';
import type { Course, Lesson, ContentItem, Quiz, Question } from '../../types';

type StepId = 'course' | 'modules' | 'lessons' | 'content' | 'quizzes' | 'review' | 'publish';

interface StepDefinition {
  id: StepId;
  label: string;
  subLabel: string;
  icon: React.ElementType;
}

const STEPS: StepDefinition[] = [
  { id: 'course', label: 'المقرر الرئيسي', subLabel: 'بيانات وإعدادات المقرر', icon: BookOpen },
  { id: 'modules', label: 'الوحدات التعليمية', subLabel: 'الهيكل التنظيمي للمقرر', icon: Layers },
  { id: 'lessons', label: 'صياغة الدروس', subLabel: 'إضافة عناوين الدروس', icon: BookMarked },
  { id: 'content', label: 'المادة العلمية', subLabel: 'فيديو أو مقال Markdown', icon: FileText },
  { id: 'quizzes', label: 'الاختبارات والتقييم', subLabel: 'أسئلة وتحديد درجات النجاح', icon: ClipboardList },
  { id: 'review', label: 'المراجعة الأكاديمية', subLabel: 'فحص اكتمال العناصر', icon: Eye },
  { id: 'publish', label: 'اعتماد النشر', subLabel: 'إتاحة المقرر للطلاب', icon: Send },
];

const QUESTION_TYPE_LABELS: Record<Question['type'], string> = {
  mcq: 'اختيار متعدد',
  truefalse: 'صح / خطأ',
};

function createQuestion(type: Question['type'] = 'mcq'): Question {
  return {
    id: Date.now().toString() + Math.random(),
    type,
    text: '',
    options: type === 'mcq' ? ['', '', '', ''] : type === 'truefalse' ? ['صح', 'خطأ'] : [],
    correctAnswer: type === 'truefalse' ? 'صح' : '',
    points: 1,
  };
}

interface QuickCourseBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourseId?: string;
}

export const QuickCourseBuilderModal: React.FC<QuickCourseBuilderModalProps> = ({
  isOpen,
  onClose,
  initialCourseId,
}) => {
  const { courses, fetchCourses, addCourse, updateCourse } = useCoursesStore();
  const { modules, fetchModules, addModule } = useModulesStore();
  const { lessons, fetchLessons, addLesson } = useLessonsStore();
  const { content, fetchContent, addContent } = useContentStore();
  const { quizzes, fetchQuizzes, addQuiz } = useQuizzesStore();

  const [currentStep, setCurrentStep] = useState<StepId>('course');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(initialCourseId || null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Status & Notification
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 1: Course Form State (Support Upload File AND Image URL)
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('url');
  const [courseImageUrl, setCourseImageUrl] = useState('');
  const [courseImageFile, setCourseImageFile] = useState<File | null>(null);
  const [courseImagePreview, setCourseImagePreview] = useState<string>('');

  // Step 2: Module Form State
  const [modTitle, setModTitle] = useState('');
  const [modDesc, setModDesc] = useState('');

  // Step 3: Lesson Form State
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonOrder, setLessonOrder] = useState<number>(1);

  // Step 4: Content Form State (Video OR Full Markdown)
  const [contentType, setContentType] = useState<'video' | 'markdown'>('video');
  const [contentTitle, setContentTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');

  // Step 5: Quiz Form State (Full Parity with QuizPage)
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [instructions, setInstructions] = useState('');
  const [passingScore, setPassingScore] = useState<number>(60);
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [questions, setQuestions] = useState<Question[]>([createQuestion('mcq')]);

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      void fetchCourses();
      void fetchModules();
      void fetchLessons();
      void fetchContent();
      void fetchQuizzes();

      if (initialCourseId) {
        setActiveCourseId(initialCourseId);
        const existing = courses.find(c => String(c.id) === String(initialCourseId));
        if (existing) {
          setCourseTitle(existing.name);
          setCourseDesc(existing.description || '');
          setCourseImagePreview(existing.imagePreview || '');
          setCourseImageUrl(existing.imagePreview || '');
        }
      }
    }
  }, [isOpen, initialCourseId]);

  // Active contextual entities
  const activeCourse = useMemo(() => courses.find(c => String(c.id) === String(activeCourseId)), [courses, activeCourseId]);

  const courseModules = useMemo(() => {
    if (!activeCourseId) return [];
    return modules.filter(m => String(m.courseId) === String(activeCourseId));
  }, [modules, activeCourseId]);

  const courseLessons = useMemo(() => {
    const modIds = courseModules.map(m => String(m.id));
    return lessons.filter(l => modIds.includes(String(l.courseId)));
  }, [lessons, courseModules]);

  const courseContent = useMemo(() => {
    const lessonIds = courseLessons.map(l => String(l.id));
    return content.filter(c => lessonIds.includes(String(c.lessonId)));
  }, [content, courseLessons]);

  const courseQuizzes = useMemo(() => {
    const lessonIds = courseLessons.map(l => String(l.id));
    return quizzes.filter(q => lessonIds.includes(String(q.lessonId)));
  }, [quizzes, courseLessons]);

  if (!isOpen) return null;

  // --- Step 1: Save Course ---
  const handleSaveCourse = async () => {
    if (!courseTitle.trim()) {
      setErrorMessage('عنوان المقرر مطلوب لإنشاء المسار الأكاديمي.');
      return false;
    }

    let finalThumbnail = courseImagePreview;
    if (imageInputMode === 'url' && courseImageUrl.trim()) {
      try {
        finalThumbnail = uploadService.validateUrl(courseImageUrl.trim());
      } catch (err: any) {
        setErrorMessage(err.message || 'رابط الصورة غير صالح.');
        return false;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (activeCourseId && !activeCourseId.startsWith('draft-')) {
        await updateCourse({
          id: activeCourseId,
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          thumbnail: imageInputMode === 'url' && courseImageUrl.trim() ? finalThumbnail : undefined,
          imageFile: imageInputMode === 'upload' ? (courseImageFile || undefined) : undefined,
        } as any);
        setSuccessMessage('تم تحديث بيانات المقرر بنجاح');
      } else {
        const created = await addCourse({
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          thumbnail: imageInputMode === 'url' && courseImageUrl.trim() ? finalThumbnail : undefined,
          imageFile: imageInputMode === 'upload' ? (courseImageFile || undefined) : undefined,
        } as any);
        setActiveCourseId(String(created.id));
        setSuccessMessage('تم تأسيس المقرر وإتاحة مرحلة الوحدات التعليمية');
      }
      setTimeout(() => setSuccessMessage(null), 2500);
      return true;
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر حفظ بيانات المقرر. حاول مجدداً.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // --- Step 2: Save Module ---
  const handleAddModule = async () => {
    if (!activeCourseId) {
      setErrorMessage('يرجى حفظ المقرر أولاً.');
      return;
    }
    if (!modTitle.trim()) {
      setErrorMessage('اسم الوحدة التعليمية مطلوب.');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const newMod = await addModule({
        courseId: Number(activeCourseId) || (activeCourseId as any),
        title: modTitle.trim(),
        description: modDesc.trim(),
      });
      setActiveModuleId(String(newMod.id));
      setModTitle('');
      setModDesc('');
      setSuccessMessage('تمت إضافة الوحدة بنجاح');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشلت إضافة الوحدة.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Step 3: Save Lesson ---
  const handleAddLesson = async () => {
    if (!activeModuleId && courseModules.length === 0) {
      setErrorMessage('يرجى إضافة وحدة تعليمية واحدة على الأقل قبل صياغة الدروس.');
      return;
    }
    const targetModId = activeModuleId || String(courseModules[0]?.id);
    if (!lessonTitle.trim()) {
      setErrorMessage('عنوان الدرس مطلوب.');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const created = await addLesson({
        courseId: targetModId,
        title: lessonTitle.trim(),
        description: lessonDesc.trim(),
        order: lessonOrder,
      });
      setActiveLessonId(String(created.id));
      setLessonTitle('');
      setLessonDesc('');
      setLessonOrder(prev => prev + 1);
      setSuccessMessage('تم إنشاء الدرس بنجاح');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشلت صياغة الدرس.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Step 4: Save Content (Video OR Markdown) ---
  const handleAddContent = async () => {
    if (!activeLessonId && courseLessons.length === 0) {
      setErrorMessage('يرجى اختيار أو إنشاء درس لإرفاق المادة العلمية.');
      return;
    }
    const targetLessonId = activeLessonId || String(courseLessons[0]?.id);
    const targetLesson = lessons.find(l => String(l.id) === targetLessonId);
    if (!targetLesson) return;

    if (!contentTitle.trim()) {
      setErrorMessage('عنوان عنصر المحتوى مطلوب.');
      return;
    }

    if (contentType === 'video' && !videoUrl.trim()) {
      setErrorMessage('رابط الفيديو مطلوب.');
      return;
    }

    if (contentType === 'markdown' && !markdownContent.trim()) {
      setErrorMessage('نص المقال التعليمي (Markdown) مطلوب.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await addContent({
        lessonId: targetLessonId,
        lessonTitle: targetLesson.title,
        title: contentTitle.trim(),
        type: contentType === 'video' ? 'video' : 'word',
        url: contentType === 'video' ? videoUrl.trim() : undefined,
        content: contentType === 'markdown' ? markdownContent : undefined,
      });
      setContentTitle('');
      setVideoUrl('');
      setMarkdownContent('');
      setSuccessMessage('تم إرفاق المادة العلمية بنجاح');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل إرفاق المحتوى.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Step 5: Save Quiz ---
  const handleAddQuiz = async () => {
    if (!activeLessonId && courseLessons.length === 0) {
      setErrorMessage('يرجى ربط الاختبار بدرس محدد.');
      return;
    }
    const targetLessonId = activeLessonId || String(courseLessons[0]?.id);

    if (!quizTitle.trim()) {
      setErrorMessage('عنوان التقييم مطلوب.');
      return;
    }

    const validQuestions = questions.filter(q => q.text.trim());
    if (validQuestions.length === 0) {
      setErrorMessage('يرجى إدخال نص سؤال واحد على الأقل.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await addQuiz({
        courseId: activeCourseId || '',
        lessonId: targetLessonId,
        title: quizTitle.trim(),
        description: quizDesc.trim(),
        instructions: instructions.trim() || 'أجب على جميع الأسئلة بعناية.',
        passingScore,
        timeLimit,
        questions: validQuestions.map(q => ({
          type: q.type,
          text: q.text,
          options: q.options.filter(opt => opt.trim()),
          correctAnswer: q.correctAnswer || q.options[0] || 'صح',
          points: q.points || 1,
        })),
      });
      setQuizTitle('');
      setQuizDesc('');
      setInstructions('');
      setSuccessMessage('تم إعداد التقييم الأكاديمي بنجاح');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      setErrorMessage(resolveErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // --- Step 7: Publish Entire Course ---
  const handlePublishAll = async () => {
    if (courseLessons.length === 0) {
      setErrorMessage('لا توجد دروس للنشر في هذا المقرر.');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const lessonIds = courseLessons.map(l => String(l.id));
      await publishService.publishAll(lessonIds);
      await fetchLessons();
      setSuccessMessage('🎉 تم نشر المقرر وجميع الدروس التابعة له بنجاح للطلاب!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر اعتماد النشر الكامل.');
    } finally {
      setIsSaving(false);
    }
  };

  // Navigation Logic
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const handleNext = async () => {
    if (currentStep === 'course') {
      const ok = await handleSaveCourse();
      if (!ok) return;
    }
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  // Readiness Score
  const readinessChecklist = {
    hasCourse: !!(courseTitle.trim() || activeCourse?.name),
    hasModules: courseModules.length > 0,
    hasLessons: courseLessons.length > 0,
    hasContent: courseContent.length > 0,
    hasQuizzes: courseQuizzes.length > 0,
  };

  const readyScore = Object.values(readinessChecklist).filter(Boolean).length;
  const readyPercent = Math.round((readyScore / 5) * 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-all" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="bg-white w-full h-full sm:h-[94vh] sm:max-w-7xl rounded-none sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border-0 sm:border border-emerald-100 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-4 sm:px-8 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shrink-0">
              <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-lg font-black tracking-tight text-white truncate">منشئ المقررات السريع</h3>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  Parity Ready
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">بناء وتنسيق المقرر والأبواب والدروس والاختبارات التفاعلية</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all border border-white/10 touch-target shrink-0"
            title="إغلاق المعالج"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between overflow-x-auto custom-scrollbar shrink-0 gap-2">
          {STEPS.map((step, idx) => {
            const isActive = step.id === currentStep;
            const isPassed = idx < currentStepIndex;
            const StepIcon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all shrink-0 text-right touch-target ${
                  isActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-extrabold' :
                  isPassed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' :
                  'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  isActive ? 'bg-white/20 text-white' :
                  isPassed ? 'bg-emerald-600 text-white' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {isPassed ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </div>
                <span className="text-xs leading-none whitespace-nowrap md:hidden font-bold">
                  {step.label}
                </span>
                <div className="hidden md:block">
                  <div className="text-xs leading-none mb-0.5">{step.label}</div>
                  <div className={`text-[10px] opacity-75 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{step.subLabel}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800"><X className="w-4 h-4" /></button>
          </div>
        )}

        {successMessage && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Grid: Interactive Tree + Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Left Column: Interactive Course Tree */}
          <div className="lg:col-span-3 bg-slate-900 text-slate-300 p-4 border-l border-slate-800 overflow-y-auto space-y-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" /> هرمية المقرر التفاعلية
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                {readyPercent}% جاهزية
              </span>
            </div>

            <div className="flex-1 space-y-3 custom-scrollbar text-xs">
              <div 
                onClick={() => setCurrentStep('course')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  currentStep === 'course' ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-sm' : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-100">
                  <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{courseTitle.trim() || activeCourse?.name || 'مقرر جديد'}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                  <span>{courseModules.length} وحدات</span>
                  <span>{courseLessons.length} دروس</span>
                </div>
              </div>

              {courseModules.map((mod, modIdx) => {
                const modLessons = courseLessons.filter(l => String(l.courseId) === String(mod.id));
                const isModActive = activeModuleId === String(mod.id);

                return (
                  <div key={mod.id} className="mr-3 border-r-2 border-slate-800 pr-3 space-y-2">
                    <div
                      onClick={() => {
                        setActiveModuleId(String(mod.id));
                        setCurrentStep('modules');
                      }}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isModActive && currentStep === 'modules' ? 'bg-indigo-950/60 border-indigo-500 text-white' : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate font-bold">
                        <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{modIdx + 1}. {mod.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{modLessons.length}</span>
                    </div>

                    <div className="mr-3 space-y-1.5 border-r border-slate-800/80 pr-2">
                      {modLessons.map(less => {
                        const isLessActive = activeLessonId === String(less.id);
                        const hasCont = courseContent.some(c => String(c.lessonId) === String(less.id));
                        const hasQuiz = courseQuizzes.some(q => String(q.lessonId) === String(less.id));

                        return (
                          <div
                            key={less.id}
                            onClick={() => {
                              setActiveLessonId(String(less.id));
                              setCurrentStep('lessons');
                            }}
                            className={`p-2 rounded-md transition-all cursor-pointer flex items-center justify-between text-[11px] ${
                              isLessActive ? 'bg-emerald-950/40 text-emerald-300 font-bold border border-emerald-800/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <BookMarked className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate">{less.title}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {hasCont && <FileText className="w-3 h-3 text-blue-400" title="محتوى مرفق" />}
                              {hasQuiz && <ClipboardList className="w-3 h-3 text-purple-400" title="اختبار مرفق" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400 font-bold">
                <span>نسبة الإنجاز الهيكلي</span>
                <span className="text-emerald-400">{readyPercent}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${readyPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Right Column: Workspace */}
          <div className="lg:col-span-9 p-6 sm:p-8 overflow-y-auto bg-slate-50/50 flex flex-col justify-between">
            
            {/* Step 1: Course (Upload File OR Image URL) */}
            {currentStep === 'course' && (
              <div className="space-y-6 max-w-3xl mx-auto w-full animate-in fade-in duration-300">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800">الخطوة الأولى: تأسيس المقرر الرئيسي</h4>
                    <p className="text-xs text-slate-500">تحديد البيانات الأساسية وغلاف المقرر (صورة مرفقة أو رابط مباشر).</p>
                  </div>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      عنوان المقرر الدراسي <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={courseTitle}
                      onChange={e => setCourseTitle(e.target.value)}
                      placeholder="مثال: دبلوم العلوم الإسلامية المعاصرة"
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">الوصف والنبذة التعريفية</label>
                    <textarea
                      value={courseDesc}
                      onChange={e => setCourseDesc(e.target.value)}
                      rows={3}
                      placeholder="وصف تفصيلي لأهداف وأهمية هذا المقرر الأكاديمي..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Dual Mode Thumbnail (File Upload OR Image URL) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">غلاف المقرر الدراسي</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => setImageInputMode('url')}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                            imageInputMode === 'url' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                          }`}
                        >
                          <LinkIcon className="w-3 h-3 inline ml-1" /> رابط صورة URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageInputMode('upload')}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                            imageInputMode === 'upload' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                          }`}
                        >
                          <Upload className="w-3 h-3 inline ml-1" /> رفع من الجهاز
                        </button>
                      </div>
                    </div>

                    {imageInputMode === 'url' ? (
                      <div className="space-y-3">
                        <input
                          type="url"
                          value={courseImageUrl}
                          onChange={e => {
                            setCourseImageUrl(e.target.value);
                            setCourseImagePreview(e.target.value);
                          }}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none focus:border-emerald-500"
                        />
                        {courseImagePreview && (
                          <div className="relative rounded-2xl overflow-hidden border h-36 bg-slate-100">
                            <img src={courseImagePreview} alt="معاينة الغلاف" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-200 p-4 rounded-xl text-center bg-slate-50">
                        <input
                          type="file"
                          accept="image/*"
                          id="course-thumbnail-upload-enhanced"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCourseImageFile(file);
                              setCourseImagePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                        <label htmlFor="course-thumbnail-upload-enhanced" className="cursor-pointer flex flex-col items-center gap-2">
                          {courseImagePreview ? (
                            <img src={courseImagePreview} alt="غلاف" className="h-32 object-cover rounded-xl shadow-md border" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-emerald-600 mb-1" />
                              <span className="text-xs font-bold text-slate-700">اضغط لرفع غلاف المصمم (PNG / JPG / WEBP)</span>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Modules Workspace */}
            {currentStep === 'modules' && (
              <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800">الخطوة الثانية: إضافة الوحدات التعليمية (Modules)</h4>
                      <p className="text-xs text-slate-500">تقسيم المقرر إلى أبواب وفصول تنظيمية لتسهيل استيعاب الطالب.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-600" /> إضافة وحدة جديدة لهذا المقرر
                    </h5>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">اسم الوحدة <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={modTitle}
                        onChange={e => setModTitle(e.target.value)}
                        placeholder="مثال: الوحدة الأولى - التمهيد والمفاهيم"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">نبذة عن الوحدة</label>
                      <textarea
                        value={modDesc}
                        onChange={e => setModDesc(e.target.value)}
                        rows={3}
                        placeholder="أبرز المفاهيم المغطاة..."
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-xs font-medium outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <button
                      onClick={handleAddModule}
                      disabled={isSaving}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> حفظ وإضافة الوحدة
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">الوحدات المسجلة ({courseModules.length})</h5>
                    {courseModules.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 text-xs">
                        لم تقم بإضافة وحدات لهذا المقرر بعد.
                      </div>
                    ) : (
                      courseModules.map((m, i) => (
                        <div key={m.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border">
                              {i + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{m.title}</div>
                              <div className="text-xs text-slate-400">{m.description || 'لا يوجد وصف'}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Lessons Workspace */}
            {currentStep === 'lessons' && (
              <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                      <BookMarked className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800">الخطوة الثالثة: صياغة الدروس</h4>
                      <p className="text-xs text-slate-500">إضافة عناوين الدروس التابعة للوحدات الدراسية المعتمدة.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الوحدة التابع لها الدرس <span className="text-red-500">*</span></label>
                      <select
                        value={activeModuleId || ''}
                        onChange={e => setActiveModuleId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="" disabled>اختر الوحدة...</option>
                        {courseModules.map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الدرس <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={lessonTitle}
                        onChange={e => setLessonTitle(e.target.value)}
                        placeholder="مثال: الدرس الأول - تعريف المصطلح وتاريخه"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ملخص الدرس</label>
                      <textarea
                        value={lessonDesc}
                        onChange={e => setLessonDesc(e.target.value)}
                        rows={2}
                        placeholder="نبذة موجزة..."
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-xs outline-none focus:border-blue-500 resize-none"
                      />
                    </div>
                    <button
                      onClick={handleAddLesson}
                      disabled={isSaving}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> حفظ الدرس
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">الدروس المضافة ({courseLessons.length})</h5>
                    {courseLessons.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 text-xs">
                        لم تضف دروساً بعد. اختر وحدة وأضف أوائل الدروس.
                      </div>
                    ) : (
                      courseLessons.map(l => (
                        <div key={l.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <BookMarked className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-bold text-slate-800 text-xs">{l.title}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Content Workspace (Video OR Rich Markdown Editor) */}
            {currentStep === 'content' && (
              <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-black">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800">الخطوة الرابعة: المادة العلمية (Video OR Markdown Document)</h4>
                      <p className="text-xs text-slate-500">إرفاق فيديو مرئي أو كتابة مقال تفاعلي بصيغة Markdown ودعم معادلات LaTeX وصور.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الدرس المربوط بالمحتوى <span className="text-red-500">*</span></label>
                      <select
                        value={activeLessonId || ''}
                        onChange={e => setActiveLessonId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none focus:border-teal-500 bg-white"
                      >
                        <option value="" disabled>اختر الدرس...</option>
                        {courseLessons.map(l => (
                          <option key={l.id} value={l.id}>{l.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">عنوان المادة <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={contentTitle}
                        onChange={e => setContentTitle(e.target.value)}
                        placeholder="مثال: المحاضرة المرئية / المقال المرجعي الشامل"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">نوع المادة التعليمية</label>
                    <div className="flex bg-slate-100 p-1 rounded-2xl gap-2 w-fit">
                      <button
                        type="button"
                        onClick={() => setContentType('video')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          contentType === 'video' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <PlayCircle className="w-4 h-4 inline ml-1.5" /> مقطع فيديو (Video URL)
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentType('markdown')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          contentType === 'markdown' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileText className="w-4 h-4 inline ml-1.5" /> مقال نصي كامل (Markdown Editor)
                      </button>
                    </div>
                  </div>

                  {contentType === 'video' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رابط الفيديو المباشر (YouTube / Vimeo / MP4)</label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={e => setVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none focus:border-teal-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">المحرر النصي المتقدم (Markdown + Live Preview + LaTeX Math)</label>
                      <MarkdownQuestionEditor
                        value={markdownContent}
                        onChange={setMarkdownContent}
                        placeholder="اكتب المحتوى النصي باستخدام Markdown... يدعم الجداول، الأكواد، ومعادلات LaTeX الرياضية."
                      />
                    </div>
                  )}

                  <button
                    onClick={handleAddContent}
                    disabled={isSaving}
                    className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> حفظ المادة التعليمية
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Quizzes Workspace (Full Parity with QuizPage) */}
            {currentStep === 'quizzes' && (
              <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800">الخطوة الخامسة: إعداد التقييمات والأشكال الاختبارية</h4>
                      <p className="text-xs text-slate-500">ضبط إعدادات الاختبار، درجة النجاح، المدة الزمنية وصياغة الأسئلة مع الخيارات.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الدرس المربوط بالتقييم <span className="text-red-500">*</span></label>
                      <select
                        value={activeLessonId || ''}
                        onChange={e => setActiveLessonId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none focus:border-purple-500 bg-white"
                      >
                        <option value="" disabled>اختر الدرس...</option>
                        {courseLessons.map(l => (
                          <option key={l.id} value={l.id}>{l.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الاختبار <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={quizTitle}
                        onChange={e => setQuizTitle(e.target.value)}
                        placeholder="مثال: التقييم الأكاديمي الشامل للدرس"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">درجة النجاح (%)</label>
                      <input
                        type="number"
                        value={passingScore}
                        onChange={e => setPassingScore(Number(e.target.value))}
                        min={0}
                        max={100}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المدة الزمنية (بالدقائق)</label>
                      <input
                        type="number"
                        value={timeLimit}
                        onChange={e => setTimeLimit(Number(e.target.value))}
                        min={1}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الحد الأقصى للمحاولات</label>
                      <input
                        type="number"
                        value={maxAttempts}
                        onChange={e => setMaxAttempts(Number(e.target.value))}
                        min={1}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تعليمات الاختبار للطلاب</label>
                    <textarea
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      rows={2}
                      placeholder="تعليمات وإرشادات مهمة تظهر للطالب قبل بدء التقييم..."
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-xs outline-none focus:border-purple-500 resize-none"
                    />
                  </div>

                  {/* Questions List with Markdown Editor */}
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>صياغة الأسئلة ({questions.length})</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuestions([...questions, createQuestion('mcq')])}
                          className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-xl font-bold border border-purple-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 inline ml-1" /> إضافة سؤال اختيار متعدد
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestions([...questions, createQuestion('truefalse')])}
                          className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-xl font-bold border border-purple-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 inline ml-1" /> إضافة سؤال (صح / خطأ)
                        </button>

                      </div>
                    </div>

                    {questions.map((q, qIdx) => (
                      <div key={qIdx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-purple-800">السؤال {qIdx + 1} ({QUESTION_TYPE_LABELS[q.type]})</span>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setQuestions(questions.filter((_, idx) => idx !== qIdx))}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title="حذف السؤال"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <MarkdownQuestionEditor
                          value={q.text}
                          onChange={val => {
                            const next = [...questions];
                            next[qIdx].text = val;
                            setQuestions(next);
                          }}
                          placeholder="اكتب نص السؤال هنا باستخدام Markdown..."
                        />

                        {/* Options */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-600">الخيارات والإجابة الصحيحة:</label>
                          {q.type === 'mcq' ? (
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct-${qIdx}`}
                                    checked={q.correctAnswer === opt && opt !== ''}
                                    onChange={() => {
                                      const next = [...questions];
                                      next[qIdx].correctAnswer = opt;
                                      setQuestions(next);
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={e => {
                                      const next = [...questions];
                                      const oldVal = next[qIdx].options[optIdx];
                                      next[qIdx].options[optIdx] = e.target.value;
                                      if (next[qIdx].correctAnswer === oldVal) {
                                        next[qIdx].correctAnswer = e.target.value;
                                      }
                                      setQuestions(next);
                                    }}
                                    placeholder={`الخيار ${optIdx + 1}`}
                                    className="flex-1 px-3 py-1.5 border rounded-lg text-xs font-medium bg-white"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex gap-4 text-xs font-bold">
                              {['صح', 'خطأ'].map(opt => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`correct-${qIdx}`}
                                    checked={q.correctAnswer === opt}
                                    onChange={() => {
                                      const next = [...questions];
                                      next[qIdx].correctAnswer = opt;
                                      setQuestions(next);
                                    }}
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleAddQuiz}
                    disabled={isSaving}
                    className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> حفظ وإضافة الاختبار
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Academic Review Workspace */}
            {currentStep === 'review' && (
              <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800">الخطوة السادسة: الفحص والمراجعة الأكاديمية</h4>
                      <p className="text-xs text-slate-500">التحقق من جاهزية كافة مكونات المقرر قبل إجراء عملية النشر للطلاب.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                    <div>
                      <div className="text-xs font-bold text-amber-900 uppercase">مؤشر الجاهزية الأكاديمية</div>
                      <div className="text-2xl font-black text-slate-800">{readyPercent}% مكتمل</div>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center font-black text-emerald-700 bg-white shadow-inner">
                      {readyScore}/5
                    </div>
                  </div>

                  <div className="space-y-3">
                    <CheckItem title="بيانات وتأسيس المقرر الرئيسي" isOk={readinessChecklist.hasCourse} text={courseTitle || 'غير محدد'} />
                    <CheckItem title="الوحدات التنظيمية التابعة" isOk={readinessChecklist.hasModules} text={`${courseModules.length} وحدات مضافة`} />
                    <CheckItem title="الدروس الصياغية" isOk={readinessChecklist.hasLessons} text={`${courseLessons.length} دروس صياغية`} />
                    <CheckItem title="المادة العلمية المرفقة (فيديو / Markdown)" isOk={readinessChecklist.hasContent} text={`${courseContent.length} عناصر محتوى`} />
                    <CheckItem title="الاختبارات والتقييم الأكاديمي" isOk={readinessChecklist.hasQuizzes} text={`${courseQuizzes.length} اختبارات مسجلة`} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Publish Workspace */}
            {currentStep === 'publish' && (
              <div className="space-y-6 max-w-3xl mx-auto w-full text-center animate-in fade-in duration-300 py-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-4 border-white">
                  <Send className="w-10 h-10 animate-bounce" />
                </div>

                <div>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">الاعتماد النهائي والنشر للطلاب</h4>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    بمجرد الضغط على زر الاعتماد، سيتم تحويل حالة المقرر وجميع الدروس التابعة له من "مسودة" إلى "منشور" وإتاحته فوراً في منصة الطلاب.
                  </p>
                </div>

                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl max-w-md mx-auto text-right text-xs font-bold text-emerald-900 space-y-2">
                  <div className="flex justify-between"><span>المقرر:</span> <span>{courseTitle}</span></div>
                  <div className="flex justify-between"><span>عدد الوحدات:</span> <span>{courseModules.length}</span></div>
                  <div className="flex justify-between"><span>إجمالي الدروس:</span> <span>{courseLessons.length}</span></div>
                </div>

                <button
                  onClick={handlePublishAll}
                  disabled={isSaving}
                  className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-base shadow-xl shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  <span>اعتماد ونشر المقرر الآن</span>
                </button>
              </div>
            )}

            {/* Footer Action Bar */}
            <div className="pt-4 mt-auto border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 bg-white pb-safe">
              <button
                onClick={onClose}
                className="px-3.5 sm:px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors touch-target shrink-0"
              >
                إلغاء
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                {currentStepIndex > 0 && (
                  <button
                    onClick={handleBack}
                    className="px-3.5 sm:px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all flex items-center gap-1 touch-target shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" /> السابق
                  </button>
                )}

                {currentStepIndex < STEPS.length - 1 && (
                  <button
                    onClick={handleNext}
                    disabled={isSaving}
                    className="px-4 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1 disabled:opacity-50 touch-target shrink-0"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

function CheckItem({ title, isOk, text }: { title: string; isOk: boolean; text: string }) {
  return (
    <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
      isOk ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' : 'bg-amber-50/50 border-amber-200 text-amber-950'
    }`}>
      <div className="flex items-center gap-2.5">
        {isOk ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
        <span>{title}</span>
      </div>
      <span className="text-[11px] opacity-75">{text}</span>
    </div>
  );
}
