import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, CheckCircle2, XCircle, AlertCircle, Loader2,
  BookMarked, FileText, ClipboardList, 
  X, Calendar, Settings2, PlayCircle, Clock, Edit3, Trash2,
  ChevronDown, ChevronUp, Layers, Video, FileType2, Search, Filter, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useCoursesStore, useLessonsStore, useContentStore, useQuizzesStore, useModulesStore } from '../../../store';
import { courseService, lessonService, contentService, quizService } from '../../../services';
import { modulesService } from '../../../services/api/modules.api';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { resolveErrorMessage } from '../../../lib/errors';
import { ROUTES } from '../../../routes/routes.config';
import type { Lesson, ContentItem, Quiz } from '../../../types';

type PublishStatus = 'idle' | 'loading' | 'success' | 'error';
type TabStatus = 'all' | 'published' | 'draft' | 'incomplete' | 'recent';

interface Checklist {
  hasTitle: boolean;
  hasDescription: boolean;
  hasContent: boolean;
  hasQuiz: boolean;
}

function getChecklist(lesson: Lesson, content: ContentItem[], quizzes: Quiz[]): Checklist {
  return {
    hasTitle: !!lesson.title.trim(),
    hasDescription: !!(lesson.description && lesson.description.trim()),
    hasContent: content.some(c => c.lessonId === lesson.id),
    hasQuiz: quizzes.some(q => q.lessonId === lesson.id),
  };
}

function isReady(cl: Checklist): boolean { return cl.hasTitle && cl.hasDescription && cl.hasContent; }
function readinessScore(cl: Checklist): number { return [cl.hasTitle, cl.hasDescription, cl.hasContent, cl.hasQuiz].filter(Boolean).length; }

export function PublishPage() {
  const navigate = useNavigate();
  const { lessons, updateLesson, deleteLesson, fetchLessons } = useLessonsStore();
  const { content, fetchContent } = useContentStore();
  const { quizzes, fetchQuizzes } = useQuizzesStore();
  const { courses } = useCoursesStore();
  const { modules } = useModulesStore();
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<Record<string, PublishStatus>>({});
  const [publishError, setPublishError] = useState<Record<string, string>>({});
  const [successModal, setSuccessModal] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void fetchLessons();
    void fetchContent();
    void fetchQuizzes();
    void useCoursesStore.getState().fetchCourses();
    void useModulesStore.getState().fetchModules();
  }, [fetchLessons, fetchContent, fetchQuizzes]);

  // Exact preservation of business logic and backend interactions
  const handlePublish = async (lessonId: string) => {
    setPublishStatus(p => ({ ...p, [lessonId]: 'loading' }));
    setPublishError(p => { const x = { ...p }; delete x[lessonId]; return x; });
    try {
      const allLessons = useLessonsStore.getState().lessons;
      const allContent = useContentStore.getState().content;
      const allQuizzes = useQuizzesStore.getState().quizzes;
      const lesson = allLessons.find(l => l.id === lessonId);
      if (!lesson) throw new Error("الدرس غير موجود");

      const parentModule = modules.find(m => String(m.id) === String(lesson.courseId));
      let realCourseId = parentModule?.courseId;
      const parentCourse = parentModule ? courses.find(c => String(c.id) === String(parentModule.courseId)) : undefined;

      // 1. If parent course is draft, publish it
      if (parentModule && String(parentModule.courseId).startsWith('draft-')) {
        if (!parentCourse) {
          const existingCourse = courses.find(c => c.name === lesson.courseName && !String(c.id).startsWith('draft-'));
          if (existingCourse) {
            realCourseId = existingCourse.id;
          } else {
            const createdCourse = await courseService.create({ name: lesson.courseName || 'مقرر جديد', description: lesson.courseName || '' });
            realCourseId = createdCourse.id;
          }
          parentModule.courseId = realCourseId as any;
        } else {
          const coursePayload = (parentCourse as any)._draftPayload || {
            name: parentCourse.name,
            description: parentCourse.description,
            imagePreview: parentCourse.imagePreview
          };
          if (coursePayload.imageFile && !(coursePayload.imageFile instanceof File)) delete coursePayload.imageFile;
          const createdCourse = await courseService.create(coursePayload);
          realCourseId = createdCourse.id;
          await useCoursesStore.getState().deleteCourse(parentCourse.id);
        }
      }

      // 2. If parent module is draft, publish it
      let realModuleId = lesson.courseId;
      if (String(lesson.courseId).startsWith('draft-')) {
        if (!parentModule) {
           let fallbackCourseId = realCourseId;
           if (!fallbackCourseId) {
             const existingCourse = courses.find(c => c.name === lesson.courseName && !String(c.id).startsWith('draft-'));
             if (existingCourse) fallbackCourseId = existingCourse.id;
             else {
               const createdCourse = await courseService.create({ name: lesson.courseName || 'مقرر جديد', description: lesson.courseName || '' });
               fallbackCourseId = createdCourse.id;
             }
           }
           const createdModule = await modulesService.create({
             title: 'الوحدة الأساسية - ' + (lesson.courseName || 'بدون اسم'),
             description: '',
             courseId: Number(fallbackCourseId)
           });
           realModuleId = String(createdModule.id);
        } else {
          const modulePayload = (parentModule as any)._draftPayload || {
            title: parentModule.title,
            description: parentModule.description || ''
          };
          const createdModule = await modulesService.create({
            ...modulePayload,
            courseId: Number(realCourseId)
          });
          realModuleId = String(createdModule.id);
          await useModulesStore.getState().deleteModule(parentModule.id);
        }
      }

      // 3. Find ALL draft lessons for this module
      const moduleLessons = allLessons.filter(l => 
        (String(l.courseId) === String(lesson.courseId) || String(l.courseId) === String(realModuleId)) && 
        String(l.id).startsWith('draft-')
      );

      for (const draftLesson of moduleLessons) {
        const baseLessonPayload = (draftLesson as any)._draftPayload || {
          title: draftLesson.title,
          description: draftLesson.description,
          order: 1
        };
        const lessonPayload = { ...baseLessonPayload, courseId: realModuleId };
        const createdLesson = await lessonService.create(lessonPayload);

        const lessonContents = allContent.filter(c => c.lessonId === draftLesson.id && String(c.id).startsWith('draft-'));
        for (const draftContent of lessonContents) {
          const baseContentPayload = (draftContent as any)._draftPayload || {
            title: draftContent.title,
            type: draftContent.type,
            url: draftContent.url
          };
          const contentPayload = { ...baseContentPayload, lessonId: createdLesson.id };
          if (contentPayload.file && !(contentPayload.file instanceof File)) delete contentPayload.file;
          await contentService.create(contentPayload);
          await useContentStore.getState().deleteContent(draftContent.id);
        }

        const draftQuiz = allQuizzes.find(q => q.lessonId === draftLesson.id && String(q.id).startsWith('draft-'));
        if (draftQuiz) {
          const baseQuizPayload = (draftQuiz as any)._draftPayload || {
            title: draftQuiz.title,
            description: draftQuiz.description,
            passingScore: draftQuiz.passingScore,
            questions: draftQuiz.questions
          };
          const quizPayload = { ...baseQuizPayload, lessonId: createdLesson.id };
          await quizService.create(quizPayload);
          await useQuizzesStore.getState().deleteQuiz(draftQuiz.id);
        }

        await lessonService.update({ id: createdLesson.id, isPublished: true });
        await useLessonsStore.getState().deleteLesson(draftLesson.id);
      }

      if (!String(lessonId).startsWith('draft-')) {
        await lessonService.update({ id: lessonId, isPublished: true });
      }

      // 4. Refetch all stores
      await useCoursesStore.getState().fetchCourses();
      await useModulesStore.getState().fetchModules();
      await useLessonsStore.getState().fetchLessons();
      await useContentStore.getState().fetchContent();
      await useQuizzesStore.getState().fetchQuizzes();

      setPublishStatus(p => ({ ...p, [lessonId]: 'success' }));
      setSuccessModal(lessonId);
    } catch (err: any) {
      console.error('Publish Error:', err);
      alert(`فشل النشر: ${err.message || 'حدث خطأ غير متوقع'}`);
      setPublishStatus(p => ({ ...p, [lessonId]: 'error' }));
      setPublishError(p => ({ ...p, [lessonId]: resolveErrorMessage(err) }));
    }
  };

  const handleUnpublish = async (lessonId: string) => {
    if (!confirm('تنبيه: هل أنت متأكد من إلغاء نشر هذا الدرس؟ سيؤدي ذلك إلى إخفائه فوراً عن جميع الطلاب.')) return;
    setPublishStatus(p => ({ ...p, [lessonId]: 'loading' }));
    try {
      await updateLesson({ id: lessonId, isPublished: false });
      setPublishStatus(p => ({ ...p, [lessonId]: 'idle' }));
    } catch (err) {
      setPublishStatus(p => ({ ...p, [lessonId]: 'error' }));
      setPublishError(p => ({ ...p, [lessonId]: resolveErrorMessage(err) }));
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('تنبيه: حذف الدرس سيحذف ارتباطاته التعليمية. هل تريد المتابعة؟')) return;
    setPublishStatus(p => ({ ...p, [lessonId]: 'loading' }));
    try {
      await deleteLesson(lessonId);
      setPublishStatus(p => ({ ...p, [lessonId]: 'idle' }));
      setSelectedId(null);
    } catch (err) {
      setPublishStatus(p => ({ ...p, [lessonId]: 'error' }));
      setPublishError(p => ({ ...p, [lessonId]: resolveErrorMessage(err) }));
    }
  };

  const handlePublishAll = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    const courseModuleIds = modules.filter(m => String(m.courseId) === String(courseId)).map(m => String(m.id));
    const courseLessons = lessons.filter(l => courseModuleIds.includes(String(l.courseId)) || String(l.courseId) === String(courseId));
    
    const readyToPublish = courseLessons.filter(l => !l.isPublished && isReady(getChecklist(l, content, quizzes)));
    if (readyToPublish.length === 0) {
      alert('لا توجد مسودات مستوفية الشروط وجاهزة للنشر في هذا المقرر.');
      return;
    }
    
    if (!confirm(`سيتم نشر ${readyToPublish.length} درس. هل تريد المتابعة؟`)) return;

    for (const l of readyToPublish) {
      await handlePublish(l.id);
    }
  };

  const handleArchiveAll = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    const courseModuleIds = modules.filter(m => String(m.courseId) === String(courseId)).map(m => String(m.id));
    const courseLessons = lessons.filter(l => courseModuleIds.includes(String(l.courseId)) || String(l.courseId) === String(courseId));
    
    const published = courseLessons.filter(l => l.isPublished);
    if (published.length === 0) return;
    
    if (!confirm(`سيتم إخفاء ${published.length} درس منشور عن الطلاب. هل تريد المتابعة؟`)) return;

    for (const l of published) {
      await handleUnpublish(l.id);
    }
  };

  const getCourseLessons = (courseId: string) => {
    const courseModuleIds = modules.filter(m => String(m.courseId) === String(courseId)).map(m => String(m.id));
    return lessons.filter(l => courseModuleIds.includes(String(l.courseId)) || String(l.courseId) === String(courseId));
  };

  // Filter Courses based on active tab
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const cLessons = getCourseLessons(String(course.id));
      if (activeTab === 'all') return true;
      if (activeTab === 'published') return cLessons.some(l => l.isPublished);
      if (activeTab === 'draft') return cLessons.some(l => !l.isPublished);
      if (activeTab === 'incomplete') return cLessons.some(l => !isReady(getChecklist(l, content, quizzes)));
      if (activeTab === 'recent') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return cLessons.some(l => new Date(l.updatedAt || l.createdAt || 0) > weekAgo);
      }
      return true;
    });
  }, [courses, lessons, modules, activeTab, content, quizzes]);

  // Statistics
  const totalCourses = courses.length;
  const totalModules = modules.length;
  const totalLessons = lessons.length;
  const publishedCount = lessons.filter(l => l.isPublished).length;
  const draftCount = totalLessons - publishedCount;
  const completionPercent = totalLessons ? Math.round((publishedCount / totalLessons) * 100) : 0;

  const selectedLesson = lessons.find(l => l.id === selectedId);
  const selectedCL = selectedLesson ? getChecklist(selectedLesson, content, quizzes) : null;
  const canPublish = selectedCL ? isReady(selectedCL) && !selectedLesson?.isPublished : false;

  return (
    <div className="font-sans antialiased text-slate-800 space-y-6 pb-20" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1 flex items-center gap-2">
            مركز النشر والاعتماد
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            مراجعة وتقييم وتفعيل الدروس للطلاب بصلاحيات النشر الرسمية.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatWidget label="المقررات" value={totalCourses} icon={BookOpen} color="#6366F1" bg="#EEF2FF" />
        <StatWidget label="الوحدات" value={totalModules} icon={Layers} color="#8B5CF6" bg="#F5F3FF" />
        <StatWidget label="كل الدروس" value={totalLessons} icon={BookMarked} color="#3B82F6" bg="#EFF6FF" />
        <StatWidget label="المنشور" value={publishedCount} icon={CheckCircle2} color="#10B981" bg="#ECFDF5" />
        <StatWidget label="مسودة" value={draftCount} icon={Clock} color="#F59E0B" bg="#FFFBEB" />
        <StatWidget label="الاكتمال" value={`${completionPercent}%`} icon={PlayCircle} color="#EC4899" bg="#FDF2F8" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'published', label: 'المنشورة' },
          { id: 'draft', label: 'تحتوي مسودات' },
          { id: 'incomplete', label: 'غير مكتملة' },
          { id: 'recent', label: 'تحديثات حديثة' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabStatus)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
              activeTab === tab.id 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Course Containers */}
      <div className="space-y-6">
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
            <Layers className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد مقررات مطابقة</h3>
            <p className="text-slate-400">حاول تغيير خيارات التصفية.</p>
          </div>
        ) : (
          filteredCourses.map(course => {
            const isExpanded = expandedCourses[course.id];
            const courseModules = modules.filter(m => String(m.courseId) === String(course.id));
            const cLessons = getCourseLessons(String(course.id));
            const cPublished = cLessons.filter(l => l.isPublished).length;
            const cDrafts = cLessons.length - cPublished;
            const cPercent = cLessons.length ? Math.round((cPublished / cLessons.length) * 100) : 0;

            return (
              <div key={course.id} className={`bg-white rounded-[2rem] border transition-all duration-300 shadow-sm overflow-hidden ${isExpanded ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-100 hover:border-slate-300'}`}>
                {/* Course Header */}
                <div 
                  className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedCourses(p => ({ ...p, [course.id]: !p[course.id] }))}
                >
                  <div className="flex items-center gap-5 flex-1">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-sm flex items-center justify-center">
                      {course.imagePreview ? (
                        <img src={course.imagePreview} alt={course.name} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-2 truncate">{course.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <span className="flex items-center gap-1.5 font-bold text-slate-500"><Layers className="w-4 h-4 text-indigo-500" /> {courseModules.length} وحدة</span>
                        <span className="flex items-center gap-1.5 font-bold text-slate-500"><BookMarked className="w-4 h-4 text-blue-500" /> {cLessons.length} درس</span>
                        <span className="flex items-center gap-1.5 font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4" /> {cPublished} منشور</span>
                        <span className="flex items-center gap-1.5 font-bold text-amber-600"><Clock className="w-4 h-4" /> {cDrafts} مسودة</span>
                        
                        <div className="hidden sm:flex items-center gap-3 w-48 mt-1 lg:mt-0">
                          <span className="text-[10px] font-black text-slate-400">الاكتمال</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${cPercent}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-slate-700">{cPercent}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Course Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button 
                      onClick={(e) => handlePublishAll(e, String(course.id))}
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-xl text-xs font-bold transition-colors border border-emerald-100 flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" /> نشر الكل
                    </button>
                    <button 
                      onClick={(e) => handleArchiveAll(e, String(course.id))}
                      className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-200 flex items-center gap-2"
                    >
                      <XCircle className="w-3.5 h-3.5" /> سحب النشر
                    </button>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Modules Expansion */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 space-y-4">
                    {courseModules.length === 0 ? (
                      <div className="text-center py-6 text-sm text-slate-400 font-bold">لا توجد وحدات في هذا المقرر.</div>
                    ) : (
                      courseModules.map(module => {
                        const mExpanded = expandedModules[module.id];
                        const mLessons = lessons.filter(l => String(l.courseId) === String(module.id));
                        
                        return (
                          <div key={module.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div 
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setExpandedModules(p => ({ ...p, [module.id]: !p[module.id] }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <h4 className="font-bold text-slate-800">{module.title}</h4>
                                <span className="text-xs text-slate-400 font-bold px-2 py-1 bg-slate-100 rounded-md">{mLessons.length} دروس</span>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${mExpanded ? 'rotate-180' : ''}`} />
                            </div>

                            {mExpanded && (
                              <div className="border-t border-slate-100 p-2 sm:p-4 bg-slate-50/30 flex flex-col gap-2">
                                {mLessons.length === 0 ? (
                                  <div className="text-center py-4 text-xs text-slate-400 font-bold">لا توجد دروس في هذه الوحدة.</div>
                                ) : (
                                  mLessons.map(lesson => {
                                    const cl = getChecklist(lesson, content, quizzes);
                                    const ready = isReady(cl);
                                    const cItems = content.filter(c => c.lessonId === lesson.id);
                                    const hasVideo = cItems.some(c => c.type === 'video');
                                    const hasPdf = cItems.some(c => c.type === 'pdf');
                                    
                                    return (
                                      <div key={lesson.id} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-emerald-200 transition-colors group shadow-sm hover:shadow-md">
                                        <div className="flex items-start gap-4">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${lesson.isPublished ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {lesson.isPublished ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                          </div>
                                          <div>
                                            <h5 className="font-bold text-slate-800 text-sm sm:text-base mb-1 group-hover:text-emerald-600 transition-colors">{lesson.title}</h5>
                                            <div className="flex flex-wrap items-center gap-2">
                                              
                                              {/* Status Badge */}
                                              {lesson.isPublished ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">منشور</span>
                                              ) : ready ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded">مستوفى وجاهز</span>
                                              ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded">مسودة غير مكتملة</span>
                                              )}

                                              {/* Content Indicators */}
                                              {hasVideo && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded flex items-center gap-1"><Video className="w-3 h-3" /> فيديو</span>}
                                              {hasPdf && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded flex items-center gap-1"><FileType2 className="w-3 h-3" /> PDF</span>}
                                              
                                              {/* Health Indicators */}
                                              {!cl.hasDescription && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> ينقصه وصف</span>}
                                              {!cl.hasContent && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> ينقصه محتوى</span>}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Lesson Quick Actions */}
                                        <div className="flex items-center gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => setSelectedId(lesson.id)}
                                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                          >
                                            <Settings2 className="w-3.5 h-3.5" /> التدقيق
                                          </button>
                                          
                                          {lesson.isPublished ? (
                                            <button 
                                              onClick={() => handleUnpublish(lesson.id)}
                                              disabled={publishStatus[lesson.id] === 'loading'}
                                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                            >
                                              {publishStatus[lesson.id] === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'إلغاء النشر'}
                                            </button>
                                          ) : (
                                            <button 
                                              onClick={() => handlePublish(lesson.id)}
                                              disabled={!ready || publishStatus[lesson.id] === 'loading'}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5
                                                ${ready ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                            >
                                              {publishStatus[lesson.id] === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                              اعتماد
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Ultra-Modern Review & Publish Modal (Preserved exactly as before for the "Manage/Settings" action) */}
      {selectedLesson && selectedCL && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-white rounded-t-[2rem]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm">
                  <Settings2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">التدقيق الفني قبل الاعتماد</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">تأكد من استيفاء الدرس لكافة معايير الجودة الأكاديمية.</p>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 rounded-xl transition-all border border-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-slate-50/50">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">المرجع</span>
                        <span className="text-sm text-blue-600 font-bold">{selectedLesson.courseName}</span>
                      </div>
                      <h4 className="text-2xl font-black text-slate-800 leading-tight">{selectedLesson.title}</h4>
                    </div>
                    {selectedLesson.isPublished && (
                      <span className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> معتمد
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-2xl bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedLesson.description || 'لم يتم كتابة وصف تفصيلي لهذا الدرس حتى الآن.'}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-slate-400" />
                  مؤشرات ومتطلبات الجاهزية (Checklist)
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <CheckItem ok={selectedCL.hasTitle} required label="العنوان الرئيسي مصاغ" icon={BookMarked} />
                  <CheckItem ok={selectedCL.hasDescription} required label="نبذة وصفية واضحة" icon={FileText} />
                  <CheckItem ok={selectedCL.hasContent} required label="مرفقات المادة العلمية (الفيديو / المذكرات)" icon={PlayCircle} />
                  <CheckItem ok={selectedCL.hasQuiz} required={false} label="تكوين اختبار للتقييم" icon={ClipboardList} />
                </div>
                {!isReady(selectedCL) && (
                  <div className="mt-6 flex items-start gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 shadow-sm">
                    <div className="bg-amber-100 p-2 rounded-full shrink-0">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h5 className="font-bold mb-1">الدرس غير مؤهل للاعتماد والنشر</h5>
                      <p className="text-sm font-medium opacity-90 leading-relaxed">
                        يُرجى العودة إلى قائمة <span className="font-bold underline underline-offset-4">الدروس أو المحتوى</span> واستكمال بناء المتطلبات الإلزامية (المشار إليها باللون الأحمر) لتتمكن من رفع حالة الدرس للمنصة.
                      </p>
                    </div>
                  </div>
                )}
                {publishStatus[selectedLesson.id] === 'error' && publishError[selectedLesson.id] && (
                  <div className="mt-6 flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-2xl text-red-800 shadow-sm animate-in fade-in">
                    <XCircle className="w-6 h-6 shrink-0 text-red-500" />
                    <span className="text-sm font-bold">{publishError[selectedLesson.id]}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-white rounded-b-[2rem] flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button 
                onClick={() => setSelectedId(null)} 
                className="w-full sm:w-auto py-3 px-8 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-slate-200 order-2 sm:order-1"
              >
                الرجوع للوحة النشر
              </button>
              <div className="hidden sm:block flex-1" />
              {selectedLesson.isPublished ? (
                <button 
                  onClick={() => handleUnpublish(selectedLesson.id)} 
                  disabled={publishStatus[selectedLesson.id] === 'loading'}
                  className="w-full sm:w-auto py-3 px-8 rounded-xl border-2 border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100 hover:border-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm order-1 sm:order-2"
                >
                  {publishStatus[selectedLesson.id] === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                  إلغاء ظهور الدرس
                </button>
              ) : (
                <button 
                  onClick={() => handlePublish(selectedLesson.id)} 
                  disabled={!canPublish || publishStatus[selectedLesson.id] === 'loading'} 
                  className={`w-full sm:w-auto py-3 px-10 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-md order-1 sm:order-2
                    ${canPublish ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5' : 'bg-slate-300 cursor-not-allowed'}`}
                  style={canPublish ? { background: 'linear-gradient(135deg, #10B981, #059669)' } : {}}
                >
                  {publishStatus[selectedLesson.id] === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {publishStatus[selectedLesson.id] === 'loading' ? 'جاري الاعتماد...' : 'اعتماد ونشر الدرس رسمياً'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6 shadow-inner relative">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin opacity-20" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center shadow-lg relative z-10">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">تم الاعتماد بنجاح!</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
              تم نشر الدرس المسمى <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">"{lessons.find(l => l.id === successModal)?.title}"</span> وهو متاح الآن عبر المنصة التعليمية لجميع الطلاب المسجلين.
            </p>
            <button 
              onClick={() => { setSuccessModal(null); setSelectedId(null); }} 
              className="w-full py-4 text-white rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-emerald-500/20 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
            >
              الاستمرار وإغلاق النافذة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component Helpers ────────────────────────────────────────────────────────

function StatWidget({ label, value, icon: Icon, color, bg }: { label: string, value: string | number, icon: any, color: string, bg: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg, color: color }}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        <p className="text-lg font-black text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function CheckItem({ ok, required, label, icon: Icon }: { ok: boolean; required: boolean; label: string; icon: React.ElementType }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${ok ? 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-colors ${ok ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-slate-200 text-slate-400'}`}>
        {ok ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className={`text-sm font-bold truncate mb-1 ${ok ? 'text-emerald-800' : 'text-slate-700'}`}>{label}</span>
        <div className="flex items-center gap-2">
          {required && !ok && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 border border-red-200 text-red-700 rounded-md whitespace-nowrap shadow-sm">
              إلزامي لاستكمال النشر
            </span>
          )}
          {required && ok && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-md whitespace-nowrap shadow-sm">
              مستوفى
            </span>
          )}
          {!required && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-md whitespace-nowrap shadow-sm">
              عنصر اختياري
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
