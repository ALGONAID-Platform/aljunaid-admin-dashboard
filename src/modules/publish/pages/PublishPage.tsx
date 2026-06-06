import { useState, useEffect } from 'react';
import { Send, CheckCircle2, XCircle, AlertCircle, Loader2, Eye, BookMarked, FileText, ClipboardList } from 'lucide-react';
import { useLessonsStore, useContentStore, useQuizzesStore } from '../../../store';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { resolveErrorMessage } from '../../../lib/errors';
import type { Lesson, ContentItem, Quiz } from '../../../types';

type PublishStatus = 'idle' | 'loading' | 'success' | 'error';

interface Checklist {
  hasTitle: boolean;
  hasDescription: boolean;
  hasContent: boolean;
  hasQuiz: boolean;
}

function getChecklist(lesson: Lesson, content: ContentItem[], quizzes: Quiz[]): Checklist {
  return {
    hasTitle: !!lesson.title.trim(),
    hasDescription: !!lesson.description.trim(),
    hasContent: content.some(c => c.lessonId === lesson.id),
    hasQuiz: quizzes.some(q => q.lessonId === lesson.id),
  };
}

function isReady(cl: Checklist): boolean { return cl.hasTitle && cl.hasDescription && cl.hasContent; }
function readinessScore(cl: Checklist): number { return [cl.hasTitle, cl.hasDescription, cl.hasContent, cl.hasQuiz].filter(Boolean).length; }

export function PublishPage() {
  const { lessons, updateLesson, fetchLessons } = useLessonsStore();
  const { content, fetchContent } = useContentStore();
  const { quizzes, fetchQuizzes } = useQuizzesStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void fetchLessons();
    void fetchContent();
    void fetchQuizzes();
  }, [fetchLessons, fetchContent, fetchQuizzes]);
  const [publishStatus, setPublishStatus] = useState<Record<string, PublishStatus>>({});
  const [publishError, setPublishError] = useState<Record<string, string>>({});
  const [successModal, setSuccessModal] = useState<string | null>(null);

  const selectedLesson = lessons.find(l => l.id === selectedId);
  const selectedCL = selectedLesson ? getChecklist(selectedLesson, content, quizzes) : null;
  const canPublish = selectedCL ? isReady(selectedCL) && !selectedLesson?.isPublished : false;

  const handlePublish = async (lessonId: string) => {
    setPublishStatus(p => ({ ...p, [lessonId]: 'loading' }));
    setPublishError(p => { const x = { ...p }; delete x[lessonId]; return x; });
    try {
      await updateLesson({ id: lessonId, isPublished: true });
      setPublishStatus(p => ({ ...p, [lessonId]: 'success' }));
      setSuccessModal(lessonId);
    } catch (err) {
      setPublishStatus(p => ({ ...p, [lessonId]: 'error' }));
      setPublishError(p => ({ ...p, [lessonId]: resolveErrorMessage(err) }));
    }
  };

  const handleUnpublish = async (lessonId: string) => {
    setPublishStatus(p => ({ ...p, [lessonId]: 'loading' }));
    try {
      await updateLesson({ id: lessonId, isPublished: false });
      setPublishStatus(p => ({ ...p, [lessonId]: 'idle' }));
    } catch (err) {
      setPublishStatus(p => ({ ...p, [lessonId]: 'error' }));
      setPublishError(p => ({ ...p, [lessonId]: resolveErrorMessage(err) }));
    }
  };

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="mb-6">
        <h2 className="text-slate-800" style={{ fontSize: 20, fontWeight: 700 }}>نشر الدروس</h2>
        <p className="text-slate-400" style={{ fontSize: 13 }}>راجع متطلبات النشر وانشر دروسك للطلاب</p>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Send} title="لا توجد دروس للنشر" description="قم بإنشاء دروس أولاً من صفحة الدروس" />
        </div>
      ) : (
        <div className={`grid gap-6 ${selectedId ? 'grid-cols-1 lg:grid-cols-[320px_1fr]' : 'grid-cols-1'}`}>
          <div className="space-y-3">
            {selectedId && <p className="text-slate-500 mb-4" style={{ fontSize: 13, fontWeight: 600 }}>اختر درساً للمراجعة</p>}
            {lessons.map(lesson => {
              const cl = getChecklist(lesson, content, quizzes);
              const score = readinessScore(cl);
              const ready = isReady(cl);
              const isSelected = selectedId === lesson.id;

              return (
                <div key={lesson.id} onClick={() => setSelectedId(isSelected ? null : lesson.id)} className="bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm" style={{ borderColor: isSelected ? '#10B981' : '#E2E8F0', background: isSelected ? '#F0FDF4' : 'white' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-700 truncate" style={{ fontSize: 14, fontWeight: 600 }}>{lesson.title}</div>
                      <div className="text-slate-400 truncate" style={{ fontSize: 12 }}>{lesson.courseName}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lesson.isPublished ? (
                        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#ECFDF5', color: '#059669', fontWeight: 600 }}>منشور ✓</span>
                      ) : ready ? (
                        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#FFF7ED', color: '#D97706', fontWeight: 600 }}>جاهز للنشر</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#FEF2F2', color: '#EF4444', fontWeight: 600 }}>غير مكتمل</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400" style={{ fontSize: 11 }}>اكتمال البيانات</span>
                      <span style={{ fontSize: 11, color: ready ? '#10B981' : '#F59E0B', fontWeight: 600 }}>{score}/4</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(score / 4) * 100}%`, background: ready ? 'linear-gradient(90deg, #10B981, #0D9488)' : '#F59E0B' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedLesson && selectedCL && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-slate-800 mb-1" style={{ fontSize: 18, fontWeight: 700 }}>{selectedLesson.title}</h3>
                    <p className="text-slate-500" style={{ fontSize: 13 }}>{selectedLesson.courseName}</p>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <Eye className="w-4 h-4 text-slate-400" /><span className="text-slate-500" style={{ fontSize: 12 }}>معاينة</span>
                  </div>
                </div>
                <p className="text-slate-600 mt-3 leading-relaxed" style={{ fontSize: 14 }}>{selectedLesson.description}</p>
              </div>

              <div className="p-5 border-b border-slate-100">
                <h4 className="text-slate-700 mb-4" style={{ fontSize: 15, fontWeight: 600 }}>قائمة متطلبات النشر</h4>
                <div className="space-y-3">
                  <CheckItem ok={selectedCL.hasTitle} required label="عنوان الدرس" icon={BookMarked} />
                  <CheckItem ok={selectedCL.hasDescription} required label="وصف الدرس" icon={FileText} />
                  <CheckItem ok={selectedCL.hasContent} required label="محتوى الدرس (فيديو، PDF، أو أي ملف)" icon={FileText} />
                  <CheckItem ok={selectedCL.hasQuiz} required={false} label="اختبار مرتبط (اختياري)" icon={ClipboardList} />
                </div>
                {!isReady(selectedCL) && (
                  <div className="mt-4 flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span style={{ fontSize: 13 }}>يجب إكمال المتطلبات الإلزامية (✱) قبل النشر</span>
                  </div>
                )}
              </div>

              {publishStatus[selectedLesson.id] === 'error' && publishError[selectedLesson.id] && (
                <div className="mx-5 mt-4 flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span style={{ fontSize: 13 }}>{publishError[selectedLesson.id]}</span>
                </div>
              )}

              <div className="p-5">
                {selectedLesson.isPublished ? (
                  <div>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-emerald-700" style={{ fontSize: 14, fontWeight: 600 }}>هذا الدرس منشور ومتاح للطلاب</span>
                    </div>
                    <button onClick={() => handleUnpublish(selectedLesson.id)} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all" style={{ fontSize: 14, fontWeight: 500 }}>إلغاء النشر</button>
                  </div>
                ) : (
                  <button onClick={() => handlePublish(selectedLesson.id)} disabled={!canPublish || publishStatus[selectedLesson.id] === 'loading'} className="w-full py-3.5 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md" style={{ background: canPublish ? 'linear-gradient(135deg, #10B981, #0D9488)' : '#CBD5E1', boxShadow: canPublish ? '0 4px 14px rgba(16,185,129,0.35)' : 'none', fontSize: 15, fontWeight: 600 }}>
                    {publishStatus[selectedLesson.id] === 'loading' ? <><Loader2 className="w-5 h-5 animate-spin" />جارٍ النشر...</> : <><Send className="w-5 h-5" />نشر الدرس الآن</>}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-8 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)' }}>
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-slate-800 mb-2" style={{ fontSize: 20, fontWeight: 700 }}>تم النشر بنجاح!</h3>
            <p className="text-slate-500 mb-6" style={{ fontSize: 14 }}>تم نشر الدرس "{lessons.find(l => l.id === successModal)?.title}" وأصبح متاحاً للطلاب</p>
            <button onClick={() => setSuccessModal(null)} className="w-full py-3 text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14, fontWeight: 600 }}>حسناً</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckItem({ ok, required, label, icon: Icon }: { ok: boolean; required: boolean; label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border transition-all" style={{ background: ok ? '#F0FDF4' : '#FAFAFA', borderColor: ok ? '#D1FAE5' : '#E2E8F0' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ok ? '#ECFDF5' : '#F1F5F9' }}>
        {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-slate-300" />}
      </div>
      <div className="flex-1">
        <span className="text-slate-700" style={{ fontSize: 14, fontWeight: ok ? 600 : 400 }}>{label}</span>
        {required && <span className="text-red-400 mr-1" style={{ fontSize: 12 }}>✱ إلزامي</span>}
      </div>
      <Icon className="w-4 h-4 text-slate-300" />
    </div>
  );
}
