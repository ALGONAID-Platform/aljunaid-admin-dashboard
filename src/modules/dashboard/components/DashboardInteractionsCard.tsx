import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare, Star, Reply, Send, CheckCheck, Clock,
  RefreshCw, BookOpen, ClipboardList, AlertCircle,
  FileText, CornerDownLeft, Sparkles, X, ChevronDown, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  interactionsService,
  type MentionItem,
  type CourseReviewItem,
} from '../../../services/api/interactions.api';
import type { Course } from '../../../types';

interface Props {
  courses: Course[];
}

function timeAgo(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(seconds) || seconds < 0) return 'الآن';
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;

    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function DashboardInteractionsCard({ courses }: Props) {
  const [activeTab, setActiveTab] = useState<'interactions' | 'reviews'>('interactions');

  // Mentions / Comments state
  const [mentions, setMentions] = useState<MentionItem[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(true);
  const [mentionsError, setMentionsError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  // Replying state
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [sentReplies, setSentReplies] = useState<Record<number, { text: string; date: Date }>>({});

  // Reviews state
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<CourseReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Set default course for reviews when courses load
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  // Load Mentions
  const loadMentions = useCallback(async () => {
    setLoadingMentions(true);
    setMentionsError(null);
    try {
      const [mentionsRes, unreadRes] = await Promise.all([
        interactionsService.getMyMentions(1, 30),
        interactionsService.getUnreadCount(),
      ]);
      setMentions(mentionsRes.data || []);
      setUnreadCount(unreadRes);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'فشل في تحميل التعليقات والتفاعلات';
      setMentionsError(msg);
    } finally {
      setLoadingMentions(false);
    }
  }, []);

  // Load Reviews for selected course
  const loadReviews = useCallback(async (courseId: number) => {
    setLoadingReviews(true);
    setReviewsError(null);
    try {
      const data = await interactionsService.getCourseReviews(courseId);
      setReviews(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'فشل في تحميل تقييمات المقرر';
      setReviewsError(msg);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    void loadMentions();
  }, [loadMentions]);

  useEffect(() => {
    if (selectedCourseId) {
      void loadReviews(selectedCourseId);
    }
  }, [selectedCourseId, loadReviews]);

  // Mark a mention as read
  const handleMarkAsRead = async (mentionId: number) => {
    try {
      await interactionsService.markAsRead(mentionId);
      setMentions((prev) =>
        prev.map((m) => (m.id === mentionId ? { ...m, isRead: true } : m))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('تم تحديد الإشعار كمقروء');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر تحديث حالة القراءة');
    }
  };

  // Submit Reply
  const handleSendReply = async (mention: MentionItem) => {
    const text = replyText.trim();
    if (!text) {
      toast.error('يرجى كتابة نص الرد أولاً');
      return;
    }

    const commentData = mention.comment || mention.postComment;
    if (!commentData) {
      toast.error('بيانات التعليق الأصلية غير متوفرة');
      return;
    }

    setSubmittingReply(true);
    try {
      if (commentData.postId) {
        // Community post comment
        await interactionsService.replyToPostComment(commentData.postId, {
          text,
          parentId: commentData.id,
          mentionedUserIds: commentData.user?.id ? [commentData.user.id] : undefined,
        });
      } else {
        // Lesson or Exam comment
        const lessonId = commentData.lessonId ?? commentData.lesson?.id ?? undefined;
        const examId = commentData.examId ?? commentData.exam?.id ?? undefined;

        await interactionsService.replyToLessonOrExamComment({
          text,
          parentId: commentData.id,
          lessonId,
          examId,
          mentionedUserIds: commentData.user?.id ? [commentData.user.id] : undefined,
        });
      }

      // Automatically mark as read if unread
      if (!mention.isRead) {
        try {
          await interactionsService.markAsRead(mention.id);
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
          // ignore error marking as read
        }
      }

      // Record sent reply locally
      setSentReplies((prev) => ({
        ...prev,
        [mention.id]: { text, date: new Date() },
      }));

      // Update mention read status in state
      setMentions((prev) =>
        prev.map((m) => (m.id === mention.id ? { ...m, isRead: true } : m))
      );

      toast.success('تم إرسال ردك بنجاح');
      setReplyText('');
      setReplyingToId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر إرسال الرد، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Filter mentions
  const displayedMentions = filterUnreadOnly
    ? mentions.filter((m) => !m.isRead)
    : mentions;

  // Average rating for selected course reviews
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header with Navigation Tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Tab: Interactions & Comments */}
          <button
            type="button"
            onClick={() => setActiveTab('interactions')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'interactions'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <MessageSquare size={16} />
            <span>التعليقات والردود</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'interactions'
                    ? 'bg-white text-emerald-700'
                    : 'bg-emerald-600 text-white animate-pulse'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Tab: Course Ratings & Reviews */}
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'reviews'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Star size={16} className={activeTab === 'reviews' ? 'fill-white' : ''} />
            <span>تقييمات المقررات</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeTab === 'interactions' && (
            <button
              type="button"
              onClick={() => setFilterUnreadOnly((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                filterUnreadOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {filterUnreadOnly ? 'عرض الكل' : 'غير المقروء فقط'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'interactions') void loadMentions();
              else if (selectedCourseId) void loadReviews(selectedCourseId);
            }}
            title="تحديث البيانات"
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-emerald-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw
              size={15}
              className={loadingMentions || loadingReviews ? 'animate-spin text-emerald-600' : ''}
            />
          </button>
        </div>
      </div>

      {/* Tab 1 Content: Interactions & Rapid Replies */}
      {activeTab === 'interactions' && (
        <div className="flex-1 overflow-y-auto max-h-[500px] custom-scrollbar p-3 space-y-3">
          {loadingMentions && mentions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
              <RefreshCw size={26} className="animate-spin text-emerald-600 mb-3" />
              <p className="text-sm font-bold text-slate-600">جارٍ جلب التفاعلات والتعليقات...</p>
            </div>
          ) : mentionsError && mentions.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <AlertCircle size={32} className="text-red-500 mb-2" />
              <p className="text-sm font-bold text-slate-700 mb-2">{mentionsError}</p>
              <button
                onClick={() => void loadMentions()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : displayedMentions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-8 h-8 text-slate-300" />
              </div>
              <h4 className="text-slate-700 font-bold text-sm mb-1">
                {filterUnreadOnly ? 'لا توجد تعليقات غير مقروءة' : 'لا توجد تعليقات أو تفاعلات حالياً'}
              </h4>
              <p className="text-slate-400 text-xs">
                ستظهر هنا استفسارات الطلاب وردودهم على الدروس والاختبارات فور إرسالها.
              </p>
            </div>
          ) : (
            displayedMentions.map((item) => {
              const commentData = item.comment || item.postComment;
              const author = commentData?.user || item.post?.author;
              const hasRepliedLocally = Boolean(sentReplies[item.id]);

              // Determine context badge
              let contextIcon = BookOpen;
              let contextLabel = 'درس';
              let contextTitle = commentData?.lesson?.title;

              if (commentData?.exam) {
                contextIcon = ClipboardList;
                contextLabel = 'اختبار';
                contextTitle = commentData.exam.title;
              } else if (commentData?.post || item.post) {
                contextIcon = FileText;
                contextLabel = 'منشور';
                contextTitle = commentData?.post?.title || item.post?.title;
              }

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition-all duration-200 ${
                    !item.isRead
                      ? 'border-emerald-200 bg-emerald-50/30 shadow-xs'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  {/* Top Bar: Author, Context, Type Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar */}
                      {author?.avatar ? (
                        <img
                          src={author.avatar}
                          alt={author.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                          {author?.name ? author.name.charAt(0) : 'ط'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-800 truncate">
                            {author?.name || 'مستخدم'}
                          </span>
                          {!item.isRead && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                              <Sparkles size={10} /> جديد
                            </span>
                          )}
                        </div>

                        {/* Relative Time */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                          <Clock size={11} />
                          <span>{timeAgo(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Context Pill (Lesson / Exam / Post) */}
                    {contextTitle && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold max-w-[180px] sm:max-w-[240px] truncate shrink-0">
                        {contextLabel === 'درس' ? (
                          <BookOpen size={12} className="text-blue-600 shrink-0" />
                        ) : contextLabel === 'اختبار' ? (
                          <ClipboardList size={12} className="text-purple-600 shrink-0" />
                        ) : (
                          <FileText size={12} className="text-amber-600 shrink-0" />
                        )}
                        <span className="truncate">{contextTitle}</span>
                      </div>
                    )}
                  </div>

                  {/* Comment Text */}
                  <p className="text-slate-700 text-xs sm:text-sm font-medium leading-relaxed mb-3 whitespace-pre-wrap">
                    {commentData?.text || item.post?.content || 'لا يوجد نص'}
                  </p>

                  {/* Comment Image if attached */}
                  {commentData?.imageUrl && (
                    <div className="mb-3">
                      <img
                        src={commentData.imageUrl}
                        alt="مرفق التعليق"
                        className="max-h-48 rounded-xl border border-slate-200 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => window.open(commentData.imageUrl!, '_blank')}
                      />
                    </div>
                  )}

                  {/* Sent Reply Confirmation if teacher replied in this session */}
                  {hasRepliedLocally && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 mb-3 flex items-start gap-2.5">
                      <CornerDownLeft size={16} className="text-emerald-700 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-emerald-900">
                            ردك على الطالب:
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium">
                            {timeAgo(sentReplies[item.id].date.toISOString())}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-950 font-medium whitespace-pre-wrap">
                          {sentReplies[item.id].text}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80">
                    <div className="flex items-center gap-2">
                      {replyingToId !== item.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(item.id);
                            setReplyText('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors"
                        >
                          <Reply size={13} />
                          <span>رد الآن</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyText('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors"
                        >
                          <X size={13} />
                          <span>إلغاء</span>
                        </button>
                      )}
                    </div>

                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={() => void handleMarkAsRead(item.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-emerald-600 transition-colors"
                      >
                        <CheckCheck size={14} />
                        <span>تحديد كمقروء</span>
                      </button>
                    )}
                  </div>

                  {/* Inline Reply Form */}
                  {replyingToId === item.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 animate-in fade-in duration-200">
                      <div className="relative">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="اكتب ردك الأكاديمي للطالب هنا..."
                          rows={3}
                          disabled={submittingReply}
                          className="w-full rounded-xl border border-emerald-300 bg-white p-3 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all custom-scrollbar resize-none"
                        />
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(null);
                              setReplyText('');
                            }}
                            disabled={submittingReply}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSendReply(item)}
                            disabled={submittingReply || !replyText.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
                          >
                            {submittingReply ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>جارٍ الإرسال...</span>
                              </>
                            ) : (
                              <>
                                <Send size={13} />
                                <span>إرسال الرد</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2 Content: Course Ratings & Student Reviews */}
      {activeTab === 'reviews' && (
        <div className="flex-1 overflow-y-auto max-h-[500px] custom-scrollbar p-4 space-y-4">
          {/* Course Selector & Summary Box */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <label className="text-xs font-bold text-slate-700 shrink-0">
                اختر المقرر لعرض تقييمات الطلاب:
              </label>

              {courses.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedCourseId ?? ''}
                    onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                    className="w-full sm:w-64 appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-400">لا توجد مقررات بعد</span>
              )}
            </div>

            {/* Rating Summary Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-amber-600">{avgRating}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={
                        star <= Math.round(Number(avgRating))
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300'
                      }
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-slate-500">من 5 نجوم</span>
              </div>

              <div className="text-xs font-bold text-slate-600">
                {reviews.length} {reviews.length === 1 ? 'تقييم' : 'تقييمات'}
              </div>
            </div>
          </div>

          {/* Reviews List */}
          {loadingReviews ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
              <RefreshCw size={26} className="animate-spin text-amber-500 mb-3" />
              <p className="text-sm font-bold text-slate-600">جارٍ جلب تقييمات المقرر...</p>
            </div>
          ) : reviewsError ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <AlertCircle size={32} className="text-red-500 mb-2" />
              <p className="text-sm font-bold text-slate-700 mb-2">{reviewsError}</p>
              {selectedCourseId && (
                <button
                  onClick={() => void loadReviews(selectedCourseId)}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors"
                >
                  إعادة المحاولة
                </button>
              )}
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-3">
                <Star className="w-8 h-8 text-amber-300" />
              </div>
              <h4 className="text-slate-700 font-bold text-sm mb-1">لا توجد تقييمات لهذا المقرر بعد</h4>
              <p className="text-slate-400 text-xs">
                ستظهر هنا تقييمات الطلاب والتعليقات الإيجابية بمجرد تقديمها من التطبيق.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reviews.map((rev) => (
                <div key={rev.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      {rev.student?.user?.avatar ? (
                        <img
                          src={rev.student.user.avatar}
                          alt={rev.student.user.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {rev.student?.user?.name ? rev.student.user.name.charAt(0) : 'ط'}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {rev.student?.user?.name || 'طالب'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {timeAgo(rev.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          className={
                            s <= rev.rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-200'
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {rev.comment ? (
                    <p className="text-xs text-slate-700 font-medium mt-1 pr-10 whitespace-pre-wrap">
                      "{rev.comment}"
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-medium italic mt-1 pr-10">
                      (تقييم بالنجوم دون تعليق كتابي)
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
