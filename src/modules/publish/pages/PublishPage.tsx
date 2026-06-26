import { useState, useEffect, useMemo } from 'react';
import { 
  Send, CheckCircle2, XCircle, AlertCircle, Loader2, Eye, 
  BookMarked, FileText, ClipboardList, Search, Filter, 
  ArrowUpDown, X, Calendar, Settings2, PlayCircle, Clock, Edit3, Trash2
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
type FilterStatus = 'all' | 'published' | 'ready' | 'draft';
type SortOption = 'newest' | 'oldest' | 'title';

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

function isReady(cl: Checklist): boolean { return cl.hasTitle && cl.hasDescription && cl.hasContent && cl.hasQuiz; }
function readinessScore(cl: Checklist): number { return [cl.hasTitle, cl.hasDescription, cl.hasContent, cl.hasQuiz].filter(Boolean).length; }

export function PublishPage() {
  const navigate = useNavigate();
  const { lessons, updateLesson, deleteLesson, fetchLessons } = useLessonsStore();
  const { content, fetchContent } = useContentStore();
  const { quizzes, fetchQuizzes } = useQuizzesStore();
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<Record<string, PublishStatus>>({});
  const [publishError, setPublishError] = useState<Record<string, string>>({});
  const [successModal, setSuccessModal] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  useEffect(() => {
    void fetchLessons();
    void fetchContent();
    void fetchQuizzes();
    void useCoursesStore.getState().fetchCourses();
    void useModulesStore.getState().fetchModules();
  }, [fetchLessons, fetchContent, fetchQuizzes]);

  const handlePublish = async (lessonId: string) => {
    setPublishStatus(p => ({ ...p, [lessonId]: 'loading' }));
    setPublishError(p => { const x = { ...p }; delete x[lessonId]; return x; });
    try {
      const { courses } = useCoursesStore.getState();
      const { modules } = useModulesStore.getState();
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
          // Auto-healing: Draft course deleted locally but module still points to it
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
          if (coursePayload.imageFile && !(coursePayload.imageFile instanceof File)) {
             delete coursePayload.imageFile;
          }
          const createdCourse = await courseService.create(coursePayload);
          realCourseId = createdCourse.id;
          await useCoursesStore.getState().deleteCourse(parentCourse.id);
        }
      }

      // 2. If parent module is draft, publish it
      let realModuleId = lesson.courseId;
      if (String(lesson.courseId).startsWith('draft-')) {
        if (!parentModule) {
           // Auto-healing: Draft module deleted locally but lesson still points to it
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
          if (contentPayload.file && !(contentPayload.file instanceof File)) {
             delete contentPayload.file; // Fix for stripped File objects
          }
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

        // Publish all created draft lessons
        await lessonService.update({ id: createdLesson.id, isPublished: true });
        await useLessonsStore.getState().deleteLesson(draftLesson.id);
      }

      // If the clicked lesson was ALREADY NOT A DRAFT, publish it directly
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
    if (!confirm('تنبيه: هل أنت متأكد من إلغاء نشر هذا الدرس؟ سيؤدي ذلك إلى إخفائه فوراً عن جميع الطلاب ولن يتمكنوا من الوصول لمحتواه.')) return;
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

  const filteredAndSortedLessons = useMemo(() => {
    return lessons
      .filter(l => {
        const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || (l.courseName && l.courseName.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesSearch) return false;
        
        const cl = getChecklist(l, content, quizzes);
        const ready = isReady(cl);
        
        if (statusFilter === 'published') return l.isPublished;
        if (statusFilter === 'ready') return !l.isPublished && ready;
        if (statusFilter === 'draft') return !l.isPublished && !ready;
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'title') return a.title.localeCompare(b.title);
        if (sortOption === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [lessons, content, quizzes, searchQuery, statusFilter, sortOption]);

  const selectedLesson = lessons.find(l => l.id === selectedId);
  const selectedCL = selectedLesson ? getChecklist(selectedLesson, content, quizzes) : null;
  const canPublish = selectedCL ? isReady(selectedCL) && !selectedLesson?.isPublished : false;

  return (
    <div className="font-sans antialiased text-slate-800 space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1 flex items-center gap-2">
            مركز النشر والاعتماد
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            مراجعة وتقييم وتفعيل الدروس للطلاب بصلاحيات النشر الرسمية.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
             <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-bold tracking-wider uppercase">إجمالي المنشور</span>
              <span className="text-xl font-black text-emerald-600 flex items-center gap-1">
                {lessons.filter(l => l.isPublished).length} <span className="text-slate-400 text-sm font-bold">من {lessons.length}</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-inner">
              <Send className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 mb-6 sticky top-0 z-10">
        <div className="relative flex-1 group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث عن درس أو مقرر..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-11 py-3 rounded-xl border-2 border-slate-100 focus:border-emerald-500 bg-slate-50 focus:bg-white outline-none transition-all text-sm font-medium"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
          <div className="relative min-w-[180px]">
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="w-full pl-4 pr-11 py-3 rounded-xl border-2 border-slate-100 focus:border-emerald-500 outline-none appearance-none bg-slate-50 focus:bg-white text-sm font-bold text-slate-700 cursor-pointer transition-all"
            >
              <option value="all">التصفية: جميع الحالات</option>
              <option value="published">حالة: تم النشر مسبقاً</option>
              <option value="ready">حالة: مستوفى (جاهز)</option>
              <option value="draft">حالة: مسودة (يحتاج استكمال)</option>
            </select>
          </div>
          <div className="relative min-w-[180px]">
            <ArrowUpDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full pl-4 pr-11 py-3 rounded-xl border-2 border-slate-100 focus:border-emerald-500 outline-none appearance-none bg-slate-50 focus:bg-white text-sm font-bold text-slate-700 cursor-pointer transition-all"
            >
              <option value="newest">ترتيب: الأحدث أولاً</option>
              <option value="oldest">ترتيب: الأقدم أولاً</option>
              <option value="title">ترتيب: أبجدياً (أ-ي)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {lessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
          <EmptyState 
            icon={Send} 
            title="نظام النشر فارغ" 
            description="يجب عليك إضافة مقررات ودروس جديدة في المنصة لتتمكن من إدارتها ونشرها هنا." 
          />
        </div>
      ) : filteredAndSortedLessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
          <Filter className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد مسودات مطابقة للفلتر</h3>
          <p className="text-slate-400">حاول تغيير خيارات التصفية أو البحث عن اسم آخر.</p>
          <button onClick={() => {setSearchQuery(''); setStatusFilter('all');}} className="mt-4 text-emerald-600 font-semibold hover:underline">مسح عوامل التصفية</button>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-sm font-bold text-slate-500 whitespace-nowrap">الدرس / المرجع</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-500 whitespace-nowrap">الحالة واعتمادية النشر</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-500 whitespace-nowrap w-48">نسبة الجاهزية والاكتمال</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-500 text-center whitespace-nowrap">الإجراءات والأوامر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {filteredAndSortedLessons.map(lesson => {
                  const cl = getChecklist(lesson, content, quizzes);
                  const score = readinessScore(cl);
                  const ready = isReady(cl);
                  const isProcessing = publishStatus[lesson.id] === 'loading';
                  const quiz = quizzes.find(q => q.lessonId === lesson.id);

                  return (
                    <tr key={lesson.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 min-w-0 max-w-xs md:max-w-md">
                          <span className="font-bold text-slate-800 text-base truncate" title={lesson.title}>{lesson.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate">
                              {lesson.courseName || 'غير محدد'}
                            </span>
                            {lesson.isPublished && lesson.publishedAt && (
                              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                منذ {new Date(lesson.publishedAt).toLocaleDateString('ar-EG')}
                              </span>
                            )}
                            {lesson.isPublished && (
                              <span className="text-xs text-slate-400 font-medium">
                                Published by: {lesson.publishedBy ?? 'Unavailable'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {lesson.isPublished ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> معتمد ومنشور فعال
                          </span>
                        ) : ready ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                            <Send className="w-4 h-4" /> مستوفى الشروط للنشر
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 shadow-sm">
                            <Clock className="w-4 h-4" /> مسودة قيد التطوير
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-full max-w-[160px]">
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-600">الجاهزية الكلية</span>
                            <span className={`text-xs font-bold ${ready ? 'text-emerald-600' : 'text-slate-500'}`}>{Math.round((score / 4) * 100)}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner flex">
                            <div 
                              className="h-full transition-all duration-500 ease-out" 
                              style={{ 
                                width: `${(score / 4) * 100}%`, 
                                background: ready ? 'linear-gradient(90deg, #10B981, #059669)' : '#F59E0B' 
                              }} 
                            />
                          </div>
                          <div className="flex gap-0.5 mt-1">
                            {[1,2,3,4].map(i => (
                              <div key={i} className={`h-1 flex-1 rounded-sm ${i <= score ? (ready ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedId(lesson.id)} 
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100"
                            title="التدقيق والمراجعة الشاملة"
                          >
                            <Settings2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => navigate(ROUTES.lessons)}
                            className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100"
                            title="Edit Lesson"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(ROUTES.content)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                            title="Edit Content"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(ROUTES.quiz)}
                            disabled={!quiz}
                            className="p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-transparent hover:border-purple-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={quiz ? 'Edit Exam' : 'No exam to edit'}
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            disabled={isProcessing}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 disabled:opacity-40"
                            title="Delete Lesson"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                           
                          {lesson.isPublished ? (
                            <button 
                              onClick={() => handleUnpublish(lesson.id)}
                              disabled={isProcessing}
                              className="px-4 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-xl transition-all disabled:opacity-50 border border-red-100 shadow-sm flex items-center gap-2 w-[120px] justify-center"
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              إلغاء الظهور
                            </button>
                          ) : (
                            <button 
                              onClick={() => handlePublish(lesson.id)}
                              disabled={!ready || isProcessing}
                              className={`px-4 py-2.5 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-2 w-[120px] shadow-sm
                                ${ready && !isProcessing ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md' : 'bg-slate-300 cursor-not-allowed border border-slate-200'}`}
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              اعتماد ونشر
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ultra-Modern Review & Publish Modal */}
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
              
              {/* Lesson Card */}
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

              {/* Requirements Checklist */}
              <div>
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-slate-400" />
                  مؤشرات ومتطلبات الجاهزية (Checklist)
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <CheckItem ok={selectedCL.hasTitle} required label="العنوان الرئيسي مصاغ" icon={BookMarked} />
                  <CheckItem ok={selectedCL.hasDescription} required label="نبذة وصفية واضحة" icon={FileText} />
                  <CheckItem ok={selectedCL.hasContent} required label="مرفقات المادة العلمية (الفيديو / المذكرات)" icon={PlayCircle} />
                  <CheckItem ok={selectedCL.hasQuiz} required label="تكوين اختبار للتقييم" icon={ClipboardList} />
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
            <div className="p-6 border-t border-slate-100 bg-white rounded-b-[2rem] flex flex-col sm:flex-row gap-3 shrink-0">
              <button 
                onClick={() => setSelectedId(null)} 
                className="py-3 px-8 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-slate-200"
              >
                الرجوع للوحة النشر
              </button>
              
              <div className="flex-1" />

              {selectedLesson.isPublished ? (
                <button 
                  onClick={() => handleUnpublish(selectedLesson.id)} 
                  disabled={publishStatus[selectedLesson.id] === 'loading'}
                  className="py-3 px-8 rounded-xl border-2 border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100 hover:border-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {publishStatus[selectedLesson.id] === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                  إلغاء ظهور الدرس
                </button>
              ) : (
                <button 
                  onClick={() => handlePublish(selectedLesson.id)} 
                  disabled={!canPublish || publishStatus[selectedLesson.id] === 'loading'} 
                  className={`py-3 px-10 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-md
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
