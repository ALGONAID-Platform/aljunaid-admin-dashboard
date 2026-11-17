import { useCallback, useEffect, useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import {
  ExternalLink, RefreshCw, ClipboardCheck, Save, Plus, X,
  Paperclip, Trash2, BookOpen, ChevronDown, CheckCircle2,
  Clock, AlertCircle, FileText, Check, Send, MessageSquare,
  Sparkles, CheckSquare, Square
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../../lib/api';
import { lessonService } from '../../../services/api/lessons.api';
import { modulesService } from '../../../services/api/modules.api';
import { courseService } from '../../../services/api/courses.api';

type Assignment = {
  id: number;
  lessonId: number;
  title: string;
  description?: string;
  type: 'TASK' | 'QUIZ';
  maxScore: number;
  dueDate?: string | null;
  attachmentUrl?: string | null;
  lesson?: any;
  _count?: { submissions: number };
};

type Submission = {
  id: number;
  status: string;
  score?: number;
  content?: string;
  fileUrl?: string;
  submittedAt?: string;
  feedback?: string;
  feedbackImageUrl?: string;
  student?: any;
};

type ReviewRow = {
  assignment: Assignment;
  lessonTitle: string;
  courseTitle: string;
  courseId: string;
  submissions: Submission[];
};

interface LessonGroup {
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  assignments: ReviewRow[];
  totalSubmissions: number;
  pendingCount: number;
  gradedCount: number;
  resubmissionCount: number;
}

const resultOf = (d: any) => d?.data ?? d;

const listOf = (value: any): any[] => {
  let body = value;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(body)) return body;
    if (!body || typeof body !== 'object') return [];
    body = body.items ?? body.results ?? body.submissions ?? body.data;
  }
  return [];
};

const submissionPage = (response: any) => {
  let body = response;
  let meta: any;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) break;
    meta ??= body.meta ?? body.pagination;
    if (Array.isArray(body.items) || Array.isArray(body.results) || Array.isArray(body.submissions)) break;
    body = body.data;
  }
  return { items: listOf(response), totalPages: Number(meta?.totalPages ?? meta?.lastPage ?? meta?.pages) || null };
};

async function getAllSubmissions(assignmentId: number, status?: string): Promise<Submission[]> {
  const items: Submission[] = [];
  const limit = 100;
  let page = 1;
  let totalPages: number | null = null;
  const seenPages = new Set<string>();
  do {
    const { data } = await api.get(`/assignments/${assignmentId}/submissions`, {
      params: { page, limit, status: status || undefined },
    });
    const result = submissionPage(data);
    items.push(...result.items);
    const signature = result.items.map(item => String(item.id)).join(',');
    if (page > 1 && signature && seenPages.has(signature)) break;
    if (signature) seenPages.add(signature);
    totalPages = result.totalPages ?? (result.items.length === limit ? page + 1 : page);
    page += 1;
  } while (page <= totalPages);
  return [...new Map(items.map(item => [String(item.id), item])).values()];
}

const errorOf = (e: any) => e?.response?.data?.message ?? e?.message ?? 'تعذر تحميل التسليمات.';

function formatArabicDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function isImageUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(url);
}

function getStatusBadge(statusStr: string) {
  switch (statusStr) {
    case 'SUBMITTED':
      return {
        label: 'بانتظار التصحيح',
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
      };
    case 'GRADED':
      return {
        label: 'تم التقييم',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    case 'RESUBMISSION_REQUESTED':
      return {
        label: 'طلب إعادة التسليم',
        className: 'bg-purple-50 text-purple-700 border border-purple-200',
      };
    default:
      return {
        label: statusStr,
        className: 'bg-slate-100 text-slate-700 border border-slate-200',
      };
  }
}

export function AssignmentsPage({
  scopedCourseId,
  scopedLessonId,
}: { scopedCourseId?: string; scopedLessonId?: string } = {}) {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [availableLessons, setAvailableLessons] = useState<Array<{ id: string; title: string; courseTitle: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const [loadedLessonCount, setLoadedLessonCount] = useState(0);
  const [lessonOptions, setLessonOptions] = useState<Array<{ id: string; title: string; courseTitle: string }>>([]);
  const [assignmentForm, setAssignmentForm] = useState({
    lessonId: scopedLessonId ?? '',
    title: '',
    description: '',
    maxScore: '100',
    dueDate: '',
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [grades, setGrades] = useState<Record<number, { score: string; feedback: string; feedbackImageUrl: string; status: string }>>({});
  const [coursesList, setCoursesList] = useState<Array<{ id: number | string; title: string }>>([]);
  const [modalCourseId, setModalCourseId] = useState('');
  const [modalLoadingLessons, setModalLoadingLessons] = useState(false);
  const [modalLessons, setModalLessons] = useState<Array<{ id: string; title: string }>>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Bulk Grading & Mass Reply State
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<number>>(new Set());
  const [dirtySubmissionIds, setDirtySubmissionIds] = useState<Set<number>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTargetAssignment, setBulkTargetAssignment] = useState<{ assignment: Assignment; submissions: Submission[] } | null>(null);
  const [bulkForm, setBulkForm] = useState({
    feedback: '',
    scoreMode: 'FULL' as 'FULL' | 'CUSTOM' | 'KEEP',
    customScore: '100',
    status: 'GRADED',
    feedbackImageUrl: '',
    targetScope: 'ALL' as 'ALL' | 'PENDING' | 'SELECTED',
  });
  const [savingBulk, setSavingBulk] = useState(false);
  const [savingDirty, setSavingDirty] = useState(false);

  // Lesson Accordion & Filter State
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(() =>
    scopedLessonId ? new Set([String(scopedLessonId)]) : new Set()
  );
  const [lessonFilter, setLessonFilter] = useState<'ALL' | 'PENDING' | 'WITH_ASSIGNMENTS' | 'NO_ASSIGNMENTS'>('ALL');

  const handleModalCourseFilter = async (cid: string) => {
    setModalCourseId(cid);
    setModalLoadingLessons(true);
    try {
      const names = await lessonService.getLessonNames(cid || undefined);
      setModalLessons(names);
      if (names.length > 0 && !names.some(n => n.id === assignmentForm.lessonId)) {
        setAssignmentForm(cur => ({ ...cur, lessonId: names[0].id }));
      }
    } catch {
      setModalLessons([]);
    } finally {
      setModalLoadingLessons(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoadWarning('');
    try {
      const [courses, modules, lessonNames] = await Promise.all([
        courseService.getAll().catch(() => []),
        modulesService.getAll().catch(() => []),
        lessonService.getLessonNames(scopedCourseId ? String(scopedCourseId) : undefined).catch(() => [] as Array<{ id: string; title: string; courseTitle?: string }>),
      ]);
      setCoursesList(courses);

      const filteredNames = scopedLessonId
        ? lessonNames.filter(l => l.id === String(scopedLessonId))
        : lessonNames;

      setLoadedLessonCount(filteredNames.length);

      // Enrich with courseTitle from modules/courses lookup
      const resolvedLessons = filteredNames.map(lesson => {
        const module = modules.find(item => String(item.id) === String((lesson as any).moduleId ?? ''));
        const courseId = String(module?.courseId ?? '');
        const course = courses.find(item => String(item.id) === courseId);
        return { id: lesson.id, title: lesson.title, courseTitle: course?.title ?? lesson.courseTitle ?? '' };
      });
      setAvailableLessons(resolvedLessons);

      const requestErrors: string[] = [];
      let finalRows: ReviewRow[] = [];

      try {
        // Fast path: ONE single instant request to GET /assignments/admin/overview
        const params: Record<string, unknown> = {};
        if (scopedCourseId) params.courseId = scopedCourseId;
        if (scopedLessonId) params.lessonId = scopedLessonId;
        if (status) params.status = status;

        const res = await api.get<any>('/assignments/admin/overview', { params });
        const overviewData = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        finalRows = overviewData as ReviewRow[];
      } catch {
        // Fallback: one-by-one loop if overview endpoint is unavailable
        const BATCH = 5;
        for (let i = 0; i < resolvedLessons.length; i += BATCH) {
          const batch = resolvedLessons.slice(i, i + BATCH);
          const batchResults = await Promise.all(batch.map(async lesson => {
            try {
              const response = await api.get(`/assignments/lesson/${lesson.id}`);
              const assignment = resultOf(response.data) as Assignment | null;
              if (!assignment) return null;
              let submissions: Submission[] = [];
              if (assignment.type !== 'QUIZ') {
                submissions = await getAllSubmissions(assignment.id, status);
              }
              return { assignment, lessonTitle: lesson.title, courseTitle: lesson.courseTitle ?? '', courseId: '', submissions } as ReviewRow;
            } catch (e: any) {
              if (e?.response?.status !== 404) requestErrors.push(`${lesson.title}: ${errorOf(e)}`);
              return null;
            }
          }));
          finalRows.push(...batchResults.filter((r): r is ReviewRow => r !== null));
        }
      }

      setRows(finalRows);
      const lessonsWithoutAssignment = resolvedLessons.filter(lesson => !finalRows.some(row => String(row.assignment.lessonId) === lesson.id));
      setLessonOptions(lessonsWithoutAssignment);
      setAssignmentForm(current => ({
        ...current,
        lessonId: scopedLessonId ?? (lessonsWithoutAssignment.some(item => item.id === current.lessonId) ? current.lessonId : lessonsWithoutAssignment[0]?.id ?? '')
      }));
      if (requestErrors.length) setLoadWarning(`تعذر تحميل بعض الواجبات أو التسليمات (${requestErrors.length}). ${requestErrors[0]}`);
      setGrades(Object.fromEntries(finalRows.flatMap(row => row.submissions.map(sub => [
        sub.id,
        {
          score: String(sub.score ?? ''),
          feedback: sub.feedback ?? '',
          feedbackImageUrl: sub.feedbackImageUrl ?? '',
          status: sub.status === 'RESUBMISSION_REQUESTED' ? 'RESUBMISSION_REQUESTED' : 'GRADED'
        }
      ]))));
    } catch (e) {
      setError(errorOf(e));
    } finally {
      setLoading(false);
    }
  }, [status, scopedCourseId, scopedLessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Group assignments and submissions by lesson
  const lessonGroups = useMemo<LessonGroup[]>(() => {
    const groupsMap = new Map<string, LessonGroup>();

    // 1. Seed with all available lessons
    for (const lesson of availableLessons) {
      groupsMap.set(String(lesson.id), {
        lessonId: String(lesson.id),
        lessonTitle: lesson.title,
        courseTitle: lesson.courseTitle,
        assignments: [],
        totalSubmissions: 0,
        pendingCount: 0,
        gradedCount: 0,
        resubmissionCount: 0,
      });
    }

    // 2. Attach assignments and calculate counts
    for (const row of rows) {
      const lId = String(row.assignment.lessonId);
      let group = groupsMap.get(lId);
      if (!group) {
        group = {
          lessonId: lId,
          lessonTitle: row.lessonTitle || `الدرس ${lId}`,
          courseTitle: row.courseTitle || '',
          assignments: [],
          totalSubmissions: 0,
          pendingCount: 0,
          gradedCount: 0,
          resubmissionCount: 0,
        };
        groupsMap.set(lId, group);
      }
      group.assignments.push(row);
      for (const sub of row.submissions || []) {
        group.totalSubmissions += 1;
        if (sub.status === 'SUBMITTED') group.pendingCount += 1;
        else if (sub.status === 'GRADED') group.gradedCount += 1;
        else if (sub.status === 'RESUBMISSION_REQUESTED') group.resubmissionCount += 1;
      }
    }

    return Array.from(groupsMap.values());
  }, [availableLessons, rows]);

  // Global KPI statistics
  const stats = useMemo(() => {
    const totalLessons = lessonGroups.length;
    const lessonsWithAssignments = lessonGroups.filter(g => g.assignments.length > 0).length;
    const totalSubmissions = lessonGroups.reduce((acc, g) => acc + g.totalSubmissions, 0);
    const pendingSubmissions = lessonGroups.reduce((acc, g) => acc + g.pendingCount, 0);
    const gradedSubmissions = lessonGroups.reduce((acc, g) => acc + g.gradedCount, 0);

    return {
      totalLessons,
      lessonsWithAssignments,
      totalSubmissions,
      pendingSubmissions,
      gradedSubmissions,
    };
  }, [lessonGroups]);

  // Filter groups according to lessonFilter and query
  const filteredLessonGroups = useMemo(() => {
    const q = query.trim().toLowerCase();

    return lessonGroups.filter(group => {
      // 1. Status Filter
      if (lessonFilter === 'PENDING' && group.pendingCount === 0) return false;
      if (lessonFilter === 'WITH_ASSIGNMENTS' && group.assignments.length === 0) return false;
      if (lessonFilter === 'NO_ASSIGNMENTS' && group.assignments.length > 0) return false;

      // 2. Search Query Filter
      if (!q) return true;

      if (group.lessonTitle.toLowerCase().includes(q)) return true;
      if (group.courseTitle.toLowerCase().includes(q)) return true;

      return group.assignments.some(row => {
        if (row.assignment.title.toLowerCase().includes(q)) return true;
        if (row.assignment.description?.toLowerCase().includes(q)) return true;
        return row.submissions.some(sub => {
          const student = sub.student?.user ?? sub.student;
          const name = String(student?.name ?? '').toLowerCase();
          if (name.includes(q)) return true;
          if (sub.content?.toLowerCase().includes(q)) return true;
          return false;
        });
      });
    });
  }, [lessonGroups, query, lessonFilter]);

  // Auto-expand matching lessons when user searches
  useEffect(() => {
    if (query.trim()) {
      const matchIds = filteredLessonGroups.map(g => g.lessonId);
      setExpandedLessonIds(new Set(matchIds));
    }
  }, [query, filteredLessonGroups]);

  const toggleLesson = (lessonId: string) => {
    setExpandedLessonIds(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedLessonIds(new Set(filteredLessonGroups.map(g => g.lessonId)));
  };

  const collapseAll = () => {
    setExpandedLessonIds(new Set());
  };

  const handleOpenCreateForLesson = (lessonId: string) => {
    setCreateError('');
    setAssignmentForm(cur => ({ ...cur, lessonId }));
    setShowCreateModal(true);
  };

  const gradeSubmission = async (submission: Submission, assignment: Assignment) => {
    const form = grades[submission.id];
    const score = Number(form?.score);
    if (!Number.isInteger(score) || score < 0 || score > assignment.maxScore) {
      toast.error(`أدخل درجة صحيحة بين 0 و ${assignment.maxScore}.`);
      return;
    }
    setSaving(submission.id);
    setNotice('');
    try {
      await api.post(`/assignments/submissions/${submission.id}/grade`, {
        score,
        feedback: form.feedback || undefined,
        feedbackImageUrl: form.feedbackImageUrl || undefined,
        status: form.status,
      });
      toast.success('تم حفظ التقييم بنجاح.');
      setDirtySubmissionIds(prev => {
        const next = new Set(prev);
        next.delete(submission.id);
        return next;
      });
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setSaving(null);
    }
  };

  const patchGrade = (id: number, patch: Partial<{ score: string; feedback: string; feedbackImageUrl: string; status: string }>) => {
    setGrades(current => ({ ...current, [id]: { ...current[id], ...patch } }));
    setDirtySubmissionIds(prev => new Set(prev).add(id));
  };

  const toggleSelectSubmission = (id: number) => {
    setSelectedSubmissionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllInAssignment = (subs: Submission[], checked: boolean) => {
    setSelectedSubmissionIds(prev => {
      const next = new Set(prev);
      for (const s of subs) {
        if (checked) next.add(s.id);
        else next.delete(s.id);
      }
      return next;
    });
  };

  const openBulkReplyModal = (
    target: { assignment: Assignment; submissions: Submission[] },
    targetScope: 'ALL' | 'PENDING' | 'SELECTED' = 'ALL'
  ) => {
    setBulkTargetAssignment(target);
    const hasPending = target.submissions.some(s => s.status === 'SUBMITTED');
    const selectedCount = target.submissions.filter(s => selectedSubmissionIds.has(s.id)).length;
    const resolvedScope = targetScope === 'SELECTED' && selectedCount > 0
      ? 'SELECTED'
      : (hasPending ? 'PENDING' : 'ALL');

    setBulkForm({
      feedback: '',
      scoreMode: 'FULL',
      customScore: String(target.assignment.maxScore),
      status: 'GRADED',
      feedbackImageUrl: '',
      targetScope: resolvedScope,
    });
    setBulkModalOpen(true);
  };

  const executeBulkGrade = async (payload: {
    submissionIds?: number[];
    items?: Array<{ submissionId: number; score?: number; feedback?: string; feedbackImageUrl?: string; status?: string }>;
    commonScore?: number;
    commonFeedback?: string;
    commonFeedbackImageUrl?: string;
    commonStatus?: string;
  }) => {
    try {
      const res = await api.post('/assignments/submissions/bulk-grade', payload);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Fallback: batch individual submissions in parallel chunks
        const ids = payload.submissionIds || (payload.items?.map(it => it.submissionId) ?? []);
        const itemMap = new Map((payload.items || []).map(it => [it.submissionId, it]));
        const BATCH = 5;
        for (let i = 0; i < ids.length; i += BATCH) {
          const chunk = ids.slice(i, i + BATCH);
          await Promise.all(chunk.map(id => {
            const it = itemMap.get(id);
            const score = it?.score !== undefined ? it.score : payload.commonScore;
            const feedback = it?.feedback !== undefined ? it.feedback : payload.commonFeedback;
            const feedbackImageUrl = it?.feedbackImageUrl !== undefined ? it.feedbackImageUrl : payload.commonFeedbackImageUrl;
            const status = it?.status !== undefined ? it.status : (payload.commonStatus || 'GRADED');
            return api.post(`/assignments/submissions/${id}/grade`, {
              score,
              feedback,
              feedbackImageUrl,
              status,
            });
          }));
        }
        return { success: true, count: ids.length };
      }
      throw err;
    }
  };

  const handleSendBulkReply = async () => {
    if (!bulkTargetAssignment) return;
    const { assignment, submissions } = bulkTargetAssignment;

    let targets: Submission[] = [];
    if (bulkForm.targetScope === 'SELECTED') {
      targets = submissions.filter(s => selectedSubmissionIds.has(s.id));
      if (targets.length === 0) {
        toast.error('لم يتم تحديد أي طالب من القائمة.');
        return;
      }
    } else if (bulkForm.targetScope === 'PENDING') {
      targets = submissions.filter(s => s.status === 'SUBMITTED');
      if (targets.length === 0) {
        toast.error('لا توجد تسليمات بانتظار التصحيح في هذا التكليف.');
        return;
      }
    } else {
      targets = submissions;
      if (targets.length === 0) {
        toast.error('لا توجد تسليمات لهذا التكليف بعد.');
        return;
      }
    }

    let commonScore: number | undefined;
    if (bulkForm.scoreMode === 'FULL') {
      commonScore = assignment.maxScore;
    } else if (bulkForm.scoreMode === 'CUSTOM') {
      const parsed = Number(bulkForm.customScore);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > assignment.maxScore) {
        toast.error(`يرجى إدخال درجة صحيحة بين 0 و ${assignment.maxScore}.`);
        return;
      }
      commonScore = parsed;
    }

    if (!bulkForm.feedback.trim() && commonScore === undefined) {
      toast.error('يرجى كتابة نص الرد أو تحديد الدرجة الممنوحة.');
      return;
    }

    setSavingBulk(true);
    try {
      const submissionIds = targets.map(t => t.id);
      await executeBulkGrade({
        submissionIds,
        commonScore,
        commonFeedback: bulkForm.feedback.trim() || undefined,
        commonFeedbackImageUrl: bulkForm.feedbackImageUrl.trim() || undefined,
        commonStatus: bulkForm.status,
      });

      toast.success(`تم إرسال الرد والتقييم بنجاح إلى ${targets.length} طالب! 🎉`);
      setSelectedSubmissionIds(prev => {
        const next = new Set(prev);
        for (const id of submissionIds) next.delete(id);
        return next;
      });
      setDirtySubmissionIds(prev => {
        const next = new Set(prev);
        for (const id of submissionIds) next.delete(id);
        return next;
      });

      setBulkModalOpen(false);
      setBulkTargetAssignment(null);
      await load();
    } catch (e: any) {
      toast.error(errorOf(e));
    } finally {
      setSavingBulk(false);
    }
  };

  const saveAllDirtySubmissions = async () => {
    if (dirtySubmissionIds.size === 0) return;
    setSavingDirty(true);
    try {
      const dirtyIds = Array.from(dirtySubmissionIds);
      const itemsToSave: Array<{ submissionId: number; score: number; feedback?: string; feedbackImageUrl?: string; status: string }> = [];

      for (const subId of dirtyIds) {
        const form = grades[subId];
        const parentRow = rows.find(r => r.submissions.some(s => s.id === subId));
        const maxScore = parentRow?.assignment.maxScore ?? 100;
        const score = Number(form?.score);
        if (!Number.isInteger(score) || score < 0 || score > maxScore) {
          toast.error(`تحقق من صحة الدرجة المدخلة للتسليم #${subId} (بين 0 و ${maxScore}).`);
          setSavingDirty(false);
          return;
        }
        itemsToSave.push({
          submissionId: subId,
          score,
          feedback: form?.feedback || undefined,
          feedbackImageUrl: form?.feedbackImageUrl || undefined,
          status: form?.status || 'GRADED',
        });
      }

      await executeBulkGrade({ items: itemsToSave });
      toast.success(`تم حفظ وإرسال تقييمات ${itemsToSave.length} طالب بنجاح!`);
      setDirtySubmissionIds(new Set());
      await load();
    } catch (e: any) {
      toast.error(errorOf(e));
    } finally {
      setSavingDirty(false);
    }
  };

  const createAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const maxScore = Number(assignmentForm.maxScore);
    if (!assignmentForm.lessonId || !assignmentForm.title.trim() || !Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) {
      setCreateError('اختر درساً واكتب عنوان الواجب ودرجة قصوى صحيحة.');
      return;
    }
    setCreating(true);
    setCreateError('');
    setNotice('');
    try {
      const body = new FormData();
      body.append('lessonId', assignmentForm.lessonId);
      body.append('title', assignmentForm.title.trim());
      body.append('type', 'TASK');
      body.append('maxScore', String(maxScore));
      if (assignmentForm.description.trim()) body.append('description', assignmentForm.description.trim());
      if (assignmentForm.dueDate) body.append('dueDate', new Date(assignmentForm.dueDate).toISOString());
      if (attachmentFile) body.append('attachment', attachmentFile);
      await api.post('/assignments', body, { timeout: 0 });
      toast.success('تم إنشاء الواجب وربطه بالدرس بنجاح.');
      setShowCreateModal(false);
      setAssignmentForm(current => ({ ...current, title: '', description: '', dueDate: '' }));
      setAttachmentFile(null);
      await load();
    } catch (e) {
      setCreateError(errorOf(e));
    } finally {
      setCreating(false);
    }
  };


  const deleteAssignment = async (assignmentId: number) => {
    setDeletingId(assignmentId);
    setNotice('');
    try {
      await api.delete(`/assignments/${assignmentId}`);
      toast.success('تم حذف التكليف بنجاح.');
      setConfirmDeleteId(null);
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section dir="rtl" className="space-y-6 font-sans antialiased" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">مراجعة الواجبات والتسليمات</h2>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              استعراض تسليمات الطلاب مرتبة بحسب الدروس، مع إمكانية فتح أي درس لتقييم مهامه ورصد الدرجات.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setCreateError('');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>إضافة واجب لدرس</span>
          </button>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
            title="تحديث البيانات"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-emerald-600' : ''} />
            <span>تحديث</span>
          </button>
        </div>
      </header>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-slate-500">إجمالي الدروس</span>
            <BookOpen size={16} className="text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800">{stats.totalLessons}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">دروس المقرر المتاحة</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-slate-500">دروس بها تكاليف</span>
            <ClipboardCheck size={16} className="text-indigo-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800">
            {stats.lessonsWithAssignments}
            <span className="text-xs font-normal text-slate-400 mr-1.5">من {stats.totalLessons}</span>
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">تحتوي على واجبات نشطة</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-slate-500">إجمالي التسليمات</span>
            <FileText size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800">{stats.totalSubmissions}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">من كافة الطلاب</p>
        </div>

        <div className={`rounded-2xl border p-4 shadow-xs ${stats.pendingSubmissions > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-xs font-bold ${stats.pendingSubmissions > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
              بانتظار التصحيح
            </span>
            <Clock size={16} className={stats.pendingSubmissions > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'} />
          </div>
          <p className={`text-xl sm:text-2xl font-black ${stats.pendingSubmissions > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
            {stats.pendingSubmissions}
          </p>
          <p className={`text-[11px] font-medium mt-0.5 ${stats.pendingSubmissions > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {stats.pendingSubmissions > 0 ? 'تحتاج إلى مراجعة ورصد' : 'تم تصحيح كافة المهام'}
          </p>
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-800 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-800"><X size={16} /></button>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {loadWarning && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0 text-amber-600" />
          <span>{loadWarning}</span>
        </div>
      )}

      {/* Dirty Submissions Alert Bar */}
      {dirtySubmissionIds.size > 0 && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h4 className="font-black text-emerald-950 text-sm sm:text-base">
                لديك ({dirtySubmissionIds.size}) تقييمات فردية معدلة لم يتم حفظها بعد
              </h4>
              <p className="text-xs text-emerald-700 font-medium">
                يمكنك كتابة التقييم والرد لكل طالب على حدة، ثم حفظ كافة التعديلات الفردية وإرسالها لجميع هؤلاء الطلاب بنقرة واحدة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={savingDirty}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              تراجع عن التعديلات
            </button>
            <button
              type="button"
              onClick={() => void saveAllDirtySubmissions()}
              disabled={savingDirty}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {savingDirty ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>جارٍ حفظ كافة التعديلات...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>إرسال وحفظ كافة التعديلات الفردية الآن ({dirtySubmissionIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filter & Controls Bar */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="min-w-64 flex-1">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث باسم الدرس، عنوان التكليف، أو اسم الطالب..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Backend Submission Status Filter */}
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
          >
            <option value="">جميع حالات التسليم</option>
            <option value="SUBMITTED">بانتظار التصحيح (مسلّم)</option>
            <option value="GRADED">مقيّم ومصحح</option>
            <option value="RESUBMISSION_REQUESTED">مطلوب إعادة التسليم</option>
          </select>
        </div>

        {/* Lesson Filter Pills & Expand/Collapse All */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLessonFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lessonFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              جميع الدروس ({stats.totalLessons})
            </button>
            <button
              type="button"
              onClick={() => setLessonFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lessonFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              بانتظار التصحيح ({stats.pendingSubmissions})
            </button>
            <button
              type="button"
              onClick={() => setLessonFilter('WITH_ASSIGNMENTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lessonFilter === 'WITH_ASSIGNMENTS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              بها واجبات ({stats.lessonsWithAssignments})
            </button>
            <button
              type="button"
              onClick={() => setLessonFilter('NO_ASSIGNMENTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lessonFilter === 'NO_ASSIGNMENTS'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              بدون واجبات ({stats.totalLessons - stats.lessonsWithAssignments})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs font-bold text-slate-600 hover:text-emerald-700 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              توسيع كل الدروس
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs font-bold text-slate-600 hover:text-emerald-700 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              طي الكل
            </button>
          </div>
        </div>
      </div>

      {/* Main Lessons & Assignments List */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw size={28} className="animate-spin text-emerald-600" />
          <p className="text-base font-bold text-slate-700">جارٍ تحميل الدروس والتكليفات والتسليمات…</p>
          <p className="text-xs text-slate-400">يرجى الانتظار قليلاً ريثما تكتمل المزامنة</p>
        </div>
      ) : filteredLessonGroups.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center gap-3">
          <BookOpen size={40} className="text-slate-300" />
          <p className="text-base font-bold text-slate-700">
            {loadedLessonCount === 0
              ? 'لا توجد دروس متاحة ضمن النطاق المحدد.'
              : 'لم يُعثر على دروس أو تكليفات مطابقة لبحثك الحالي.'}
          </p>
          <p className="text-xs text-slate-400">يمكنك تعديل البحث أو إضافة تكليف جديد من الزر في الأعلى.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLessonGroups.map(group => {
            const isExpanded = expandedLessonIds.has(group.lessonId);
            const hasAssignments = group.assignments.length > 0;

            return (
              <div
                key={group.lessonId}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  isExpanded
                    ? 'border-emerald-300 bg-white ring-2 ring-emerald-500/10'
                    : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/40'
                }`}
              >
                {/* Lesson Header Accordion Toggle */}
                <div
                  onClick={() => toggleLesson(group.lessonId)}
                  className="px-5 py-4 cursor-pointer flex flex-wrap items-center justify-between gap-3 select-none"
                >
                  {/* Right side: Lesson Icon + Title + Course Name */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                        hasAssignments
                          ? group.pendingCount > 0
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      <BookOpen size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 text-base sm:text-lg truncate">
                          {group.lessonTitle}
                        </h3>
                        {group.courseTitle && !scopedCourseId && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold shrink-0">
                            {group.courseTitle}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hasAssignments
                          ? `${group.assignments.length} ${group.assignments.length === 1 ? 'تكليف دراسي' : 'تكليفات دراسية'} مسندة لهذا الدرس`
                          : 'لا يوجد تكليف مسند لهذا الدرس'}
                      </p>
                    </div>
                  </div>

                  {/* Left side: Badges + Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {hasAssignments ? (
                      <>
                        {group.totalSubmissions > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold">
                            <FileText size={13} />
                            <span>{group.totalSubmissions} تسليم</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold">
                            لا تسليمات بعد
                          </span>
                        )}

                        {group.pendingCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold animate-pulse">
                            <Clock size={13} />
                            <span>{group.pendingCount} بانتظار التصحيح</span>
                          </span>
                        ) : group.totalSubmissions > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 size={13} />
                            <span>مكتمل التقييم</span>
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold">
                        بدون تكاليف
                      </span>
                    )}

                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-emerald-600 bg-emerald-50' : 'hover:bg-slate-100'
                      }`}
                    >
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                {/* Expanded Lesson Body: Assignments & Submissions */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-6 space-y-5 animate-in fade-in duration-200">
                    {!hasAssignments ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                          <ClipboardCheck size={22} />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm sm:text-base mb-1">
                          لا يوجد تكليف مضاف لهذا الدرس حتى الآن
                        </h4>
                        <p className="text-xs text-slate-400 mb-4 max-w-sm">
                          يمكنك إضافة مهمة عملية أو تكليف للطلاب ليقوموا برفع حلولهم وتصحيحها هنا.
                        </p>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenCreateForLesson(group.lessonId);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                        >
                          <Plus size={15} />
                          <span>إضافة تكليف لهذا الدرس</span>
                        </button>
                      </div>
                    ) : (
                      group.assignments.map(({ assignment, submissions }) => (
                        <article
                          key={assignment.id}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
                        >
                          {/* Assignment Card Header */}
                          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                <ClipboardCheck size={18} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-slate-900 text-base">
                                    {assignment.title}
                                  </h4>
                                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                                    {assignment.type === 'TASK' ? 'مهمة عملية' : 'اختبار'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {assignment.type !== 'QUIZ' && submissions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openBulkReplyModal({ assignment, submissions }, 'ALL')}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all active:scale-95"
                                  title="كتابة رد أو حل نموذجي وإرساله لجميع الطلاب بنقرة واحدة"
                                >
                                  <MessageSquare size={14} />
                                  <span>رد جماعي للطلاب ({submissions.length})</span>
                                </button>
                              )}
                              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                                الدرجة القصوى: {assignment.maxScore}
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(assignment.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="حذف هذا التكليف"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </header>

                          {/* Assignment Instructions / Due Date / Attachment */}
                          {(assignment.description || assignment.dueDate || assignment.attachmentUrl) && (
                            <div className="space-y-2 border-b border-slate-100 bg-slate-50/30 px-5 py-3.5 text-xs sm:text-sm text-slate-600">
                              {assignment.description && (
                                <p className="whitespace-pre-wrap leading-relaxed font-medium">
                                  {assignment.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                                {assignment.dueDate && (
                                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
                                    <Clock size={14} className="text-slate-400" />
                                    <span>موعد التسليم: {formatArabicDate(assignment.dueDate)}</span>
                                  </span>
                                )}
                                {assignment.attachmentUrl && (
                                  <a
                                    className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-800 underline"
                                    href={assignment.attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <Paperclip size={13} />
                                    <span>فتح الملف المرفق للتكليف</span>
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Submissions Section */}
                          {assignment.type === 'QUIZ' ? (
                            <p className="p-5 text-center text-xs sm:text-sm text-slate-500">
                              اختبار آلي · لا يتطلب تصحيحاً يدوياً. إجمالي التسليمات:{' '}
                              {assignment._count?.submissions ?? 0}.
                            </p>
                          ) : submissions.length === 0 ? (
                            <div className="p-8 text-center text-xs sm:text-sm text-slate-400 flex flex-col items-center justify-center gap-1.5">
                              <FileText size={28} className="text-slate-200" />
                              <p className="font-bold text-slate-600">لم يقم أي طالب بتسليم هذا التكليف بعد</p>
                              <p className="text-[11px] text-slate-400">ستظهر تسليمات الطلاب هنا فور إرسالها من التطبيق أو الموقع.</p>
                            </div>
                          ) : (
                            <div>
                              {/* Submissions Quick Selection Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 border-b border-slate-100 px-4 py-2.5">
                                <div className="flex items-center gap-3">
                                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={submissions.length > 0 && submissions.every(s => selectedSubmissionIds.has(s.id))}
                                      onChange={(e) => toggleSelectAllInAssignment(submissions, e.target.checked)}
                                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span>تحديد جميع التسليمات ({submissions.length})</span>
                                  </label>
                                  {submissions.filter(s => selectedSubmissionIds.has(s.id)).length > 0 && (
                                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                                      تم تحديد {submissions.filter(s => selectedSubmissionIds.has(s.id)).length} طالب
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {submissions.filter(s => selectedSubmissionIds.has(s.id)).length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => openBulkReplyModal({ assignment, submissions }, 'SELECTED')}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
                                    >
                                      <Send size={13} />
                                      <span>رد وإرسال للمحددين ({submissions.filter(s => selectedSubmissionIds.has(s.id)).length})</span>
                                    </button>
                                  ) : null}

                                  {submissions.some(s => s.status === 'SUBMITTED') && (
                                    <button
                                      type="button"
                                      onClick={() => openBulkReplyModal({ assignment, submissions }, 'PENDING')}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 text-xs font-bold hover:bg-amber-200 transition-colors"
                                    >
                                      <Clock size={13} />
                                      <span>رد موحد على المعلقين ({submissions.filter(s => s.status === 'SUBMITTED').length})</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="divide-y divide-slate-100">
                                {submissions.map(sub => {
                                  const student = sub.student?.user ?? sub.student;
                                  const form = grades[sub.id] ?? {
                                    score: String(sub.score ?? ''),
                                    feedback: sub.feedback ?? '',
                                    feedbackImageUrl: sub.feedbackImageUrl ?? '',
                                    status: sub.status === 'RESUBMISSION_REQUESTED' ? 'RESUBMISSION_REQUESTED' : 'GRADED',
                                  };
                                  const badge = getStatusBadge(sub.status);
                                  const isSelected = selectedSubmissionIds.has(sub.id);
                                  const isDirty = dirtySubmissionIds.has(sub.id);

                                  return (
                                    <div
                                      key={sub.id}
                                      className={`grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.2fr_1fr] transition-colors ${
                                        isSelected ? 'bg-indigo-50/30' : 'bg-white hover:bg-slate-50/30'
                                      }`}
                                    >
                                      {/* Left: Student Submission Details */}
                                      <div className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2.5">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleSelectSubmission(sub.id)}
                                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                              title="تحديد الطالب للرد الجماعي"
                                            />
                                            {student?.avatar ? (
                                              <img
                                                src={student.avatar}
                                                alt={student.name}
                                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                              />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs border border-emerald-200">
                                                {student?.name ? student.name.charAt(0) : 'ط'}
                                              </div>
                                            )}
                                          <div>
                                            <strong className="text-sm font-black text-slate-900 block">
                                              {student?.name ?? 'طالب'}
                                            </strong>
                                            {student?.email && (
                                              <span className="text-[11px] text-slate-400 block -mt-0.5">
                                                {student.email}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>
                                            {badge.label}
                                          </span>
                                          <span className="text-[11px] text-slate-400">
                                            {formatArabicDate(sub.submittedAt)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Student Written Response */}
                                      {sub.content && (
                                        <div className="space-y-1">
                                          <span className="text-[11px] font-bold text-slate-400">إجابة الطالب:</span>
                                          <p className="whitespace-pre-wrap rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                                            {sub.content}
                                          </p>
                                        </div>
                                      )}

                                      {/* Student Attached File / Link */}
                                      {sub.fileUrl && (
                                        <div className="space-y-1.5 pt-1">
                                          <span className="text-[11px] font-bold text-slate-400">المرفق المرسل:</span>
                                          {isImageUrl(sub.fileUrl) ? (
                                            <div>
                                              <img
                                                src={sub.fileUrl}
                                                alt="مرفق إجابة الطالب"
                                                className="max-h-48 rounded-xl border border-slate-200 object-cover cursor-pointer hover:opacity-95 shadow-xs transition-opacity"
                                                onClick={() => window.open(sub.fileUrl, '_blank')}
                                              />
                                            </div>
                                          ) : (
                                            <div>
                                              <a
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                                                href={sub.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                <FileText size={14} />
                                                <span>فتح ومعاينة ملف الطالب</span>
                                                <ExternalLink size={12} />
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Currently Saved Score */}
                                      {sub.score != null && (
                                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                                          <Check size={13} />
                                          <span>الدرجة المرصودة حالياً: {sub.score} من {assignment.maxScore}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Right: Teacher Grading & Feedback Form */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                                      <h5 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-2">
                                        تصحيح التكليف ورصد الدرجة:
                                      </h5>

                                      <div className="grid gap-2.5 sm:grid-cols-2">
                                        <label className="text-xs font-bold text-slate-700">
                                          الدرجة (من {assignment.maxScore})
                                          <input
                                            type="number"
                                            min={0}
                                            max={assignment.maxScore}
                                            value={form.score}
                                            onChange={e => patchGrade(sub.id, { score: e.target.value })}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                                            placeholder="أدخل الدرجة"
                                          />
                                        </label>

                                        <label className="text-xs font-bold text-slate-700">
                                          حالة المراجعة
                                          <select
                                            value={form.status}
                                            onChange={e => patchGrade(sub.id, { status: e.target.value })}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
                                          >
                                            <option value="GRADED">تم التقييم (اعتماد)</option>
                                            <option value="RESUBMISSION_REQUESTED">طلب إعادة التسليم</option>
                                          </select>
                                        </label>

                                        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                                          ملاحظات التصحيح والتوجيه للطالب
                                          <textarea
                                            rows={2}
                                            value={form.feedback}
                                            onChange={e => patchGrade(sub.id, { feedback: e.target.value })}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 custom-scrollbar"
                                            placeholder="اكتب ملاحظاتك على إجابة الطالب..."
                                          />
                                        </label>

                                        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                                          رابط صورة التصحيح (اختياري)
                                          <input
                                            type="url"
                                            value={form.feedbackImageUrl}
                                            onChange={e => patchGrade(sub.id, { feedbackImageUrl: e.target.value })}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                                            dir="ltr"
                                            placeholder="https://..."
                                          />
                                        </label>

                                        <button
                                          disabled={saving === sub.id}
                                          onClick={() => void gradeSubmission(sub, assignment)}
                                          className={`sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 ${
                                            isDirty
                                              ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-400/40'
                                              : 'bg-emerald-600 hover:bg-emerald-700'
                                          }`}
                                        >
                                          {saving === sub.id ? (
                                            <>
                                              <RefreshCw size={14} className="animate-spin" />
                                              <span>جارٍ حفظ التقييم...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Save size={14} />
                                              <span>{isDirty ? 'حفظ التقييم لهذا الطالب (معدّل)' : 'حفظ التقييم لهذا الطالب'}</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            </div>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 animate-in fade-in duration-200"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !creating) setShowCreateModal(false);
          }}
        >
          <form
            onSubmit={createAssignment}
            className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-assignment-title"
          >
            <header className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <h3 id="create-assignment-title" className="text-base sm:text-lg font-black text-slate-900">
                  إضافة واجب لدرس
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                aria-label="إغلاق"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </header>

            {!scopedCourseId && coursesList.length > 0 && (
              <label className="block text-xs font-bold text-slate-700">
                المقرر (تصفية الدروس)
                <select
                  value={modalCourseId}
                  onChange={e => void handleModalCourseFilter(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 text-xs font-bold text-slate-800"
                >
                  <option value="">جميع المقررات</option>
                  {coursesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-xs font-bold text-slate-700">
              الدرس المستهدف
              <select
                required
                value={assignmentForm.lessonId}
                onChange={e => setAssignmentForm(current => ({ ...current, lessonId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"
                disabled={!!scopedLessonId}
              >
                <option value="">{modalLoadingLessons ? 'جارٍ تحميل الدروس…' : 'اختر الدرس'}</option>
                {(modalLessons.length > 0 ? modalLessons : lessonOptions).map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {(lesson as any).courseTitle ? `${(lesson as any).courseTitle} · ` : ''}
                    {lesson.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-slate-700">
              عنوان الواجب
              <input
                required
                maxLength={200}
                value={assignmentForm.title}
                onChange={e => setAssignmentForm(current => ({ ...current, title: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"
                placeholder="مثال: حل مسائل وتطبيق عملي للدرس الأول"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700">
                الدرجة القصوى
                <input
                  required
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={assignmentForm.maxScore}
                  onChange={e => setAssignmentForm(current => ({ ...current, maxScore: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                موعد التسليم (اختياري)
                <input
                  type="datetime-local"
                  value={assignmentForm.dueDate}
                  onChange={e => setAssignmentForm(current => ({ ...current, dueDate: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"
                />
              </label>
            </div>

            <label className="block text-xs font-bold text-slate-700">
              التعليمات والمطلوب من الطالب
              <textarea
                rows={3}
                value={assignmentForm.description}
                onChange={e => setAssignmentForm(current => ({ ...current, description: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 custom-scrollbar"
                placeholder="اشرح المطلوب بدقة، وكيفية تسليم الحل (ملف PDF، رابط، أو نص)..."
              />
            </label>

            <label className="block text-xs font-bold text-slate-700">
              ملف مرفق للطلاب (اختياري · PDF أو صورة توضيحية)
              <span className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                <Paperclip size={16} className="text-emerald-600" />
                <span className="truncate">{attachmentFile?.name ?? 'اضغط لاختيار ملف PDF أو صورة'}</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf,image/*"
                  className="sr-only"
                  onChange={event => setAttachmentFile(event.target.files?.[0] ?? null)}
                />
              </span>
            </label>

            {createError && <p role="alert" className="text-xs font-bold text-red-600">{createError}</p>}

            <button
              disabled={creating || !assignmentForm.lessonId}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {creating ? 'جارٍ إنشاء الواجب…' : 'إنشاء الواجب'}
            </button>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 size={20} />
              </span>
              <h3 className="text-base font-black text-slate-900">تأكيد حذف التكليف</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              هل أنت متأكد من حذف هذا التكليف؟ سيتم حذف جميع تسليمات الطلاب المرتبطة به نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => void deleteAssignment(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingId === confirmDeleteId ? 'جارٍ الحذف…' : 'نعم، تأكيد الحذف'}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId !== null}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar for Unsaved Individual Edits */}
      {dirtySubmissionIds.size > 0 && (
        <div className="sticky bottom-4 z-40 mx-auto max-w-4xl rounded-2xl border-2 border-emerald-500 bg-emerald-950/95 backdrop-blur-md p-4 text-white shadow-2xl animate-in slide-in-from-bottom-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/50 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-emerald-300 animate-pulse" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white">
                لديك ({dirtySubmissionIds.size}) تقييمات فردية معدلة لم تُرسل بعد
              </h4>
              <p className="text-xs text-emerald-200">
                تم تعديل درجات أو ملاحظات للطلاب فرادى، اضغط لحفظ وإرسال كافة التعديلات الفردية معاً بنقرة واحدة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={savingDirty}
              className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors"
            >
              تراجع عن التعديلات
            </button>
            <button
              type="button"
              onClick={() => void saveAllDirtySubmissions()}
              disabled={savingDirty}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs sm:text-sm font-black text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg disabled:opacity-50"
            >
              {savingDirty ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>جارٍ حفظ كافة التقييمات...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>إرسال وحفظ كافة التعديلات الفردية الآن ({dirtySubmissionIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Reply & Grading Modal */}
      {bulkModalOpen && bulkTargetAssignment && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4 animate-in fade-in duration-200 overflow-y-auto"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !savingBulk) {
              setBulkModalOpen(false);
              setBulkTargetAssignment(null);
            }
          }}
        >
          <div
            className="w-full max-w-2xl space-y-5 rounded-3xl bg-white p-6 sm:p-7 shadow-2xl my-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-reply-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 id="bulk-reply-title" className="text-lg font-black text-slate-900">
                    رد جماعي وتقييم لجميع الطلاب بنقرة واحدة
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    التكليف: <span className="font-bold text-slate-800">{bulkTargetAssignment.assignment.title}</span> (الدرجة القصوى: {bulkTargetAssignment.assignment.maxScore})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBulkModalOpen(false);
                  setBulkTargetAssignment(null);
                }}
                disabled={savingBulk}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Scope Selection */}
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
              <label className="text-xs font-bold text-slate-700 block">
                تحديد الطلاب المستهدفين بهذا الرد:
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {bulkTargetAssignment.submissions.filter(s => selectedSubmissionIds.has(s.id)).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBulkForm(p => ({ ...p, targetScope: 'SELECTED' }))}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-right transition-all flex items-center justify-between ${
                      bulkForm.targetScope === 'SELECTED'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>الطلاب المحددين فقط</span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                      {bulkTargetAssignment.submissions.filter(s => selectedSubmissionIds.has(s.id)).length}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setBulkForm(p => ({ ...p, targetScope: 'PENDING' }))}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-right transition-all flex items-center justify-between ${
                    bulkForm.targetScope === 'PENDING'
                      ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>بانتظار التصحيح فقط</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {bulkTargetAssignment.submissions.filter(s => s.status === 'SUBMITTED').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkForm(p => ({ ...p, targetScope: 'ALL' }))}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-right transition-all flex items-center justify-between ${
                    bulkForm.targetScope === 'ALL'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>جميع التسليمات (الكل)</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {bulkTargetAssignment.submissions.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Model Answer / Common Feedback */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>الإجابة النموذجية أو الرد المشترك لجميع الطلاب:</span>
                <span className="text-[11px] font-normal text-slate-400">سيصل كإشعار وملاحظة تصحيح لكل طالب</span>
              </label>

              {/* Template quick tags */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <span className="text-[11px] font-bold text-slate-400">عبارات جاهزة:</span>
                {[
                  'أحسنت! إجابة ممتازة ومكتملة 🌟',
                  'تمت مراجعة الحل واعتماده بنجاح ✅',
                  'حل جيد، ولكن انتبه للملاحظات والتفاصيل 📝',
                  'هذا هو الحل النموذجي للتكليف، يرجى مراجعته ومطابقته بحلك 💡',
                ].map(tmpl => (
                  <button
                    key={tmpl}
                    type="button"
                    onClick={() => setBulkForm(p => ({ ...p, feedback: p.feedback ? `${p.feedback}\n${tmpl}` : tmpl }))}
                    className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 transition-colors"
                  >
                    + {tmpl.split(' ')[0]} {tmpl.split(' ')[1]}
                  </button>
                ))}
              </div>

              <textarea
                rows={4}
                value={bulkForm.feedback}
                onChange={e => setBulkForm(p => ({ ...p, feedback: e.target.value }))}
                placeholder="اكتب هنا الرد الموحد أو الحل النموذجي وملاحظاتك للطلاب..."
                className="w-full rounded-2xl border border-slate-300 p-3.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 custom-scrollbar leading-relaxed"
              />
            </div>

            {/* Score & Evaluation Options */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Score Mode */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                <label className="text-xs font-bold text-slate-800 block">
                  الدرجة الممنوحة للطلاب:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="scoreMode"
                      checked={bulkForm.scoreMode === 'FULL'}
                      onChange={() => setBulkForm(p => ({ ...p, scoreMode: 'FULL' }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>منح الدرجة الكاملة ({bulkTargetAssignment.assignment.maxScore} من {bulkTargetAssignment.assignment.maxScore})</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="scoreMode"
                      checked={bulkForm.scoreMode === 'CUSTOM'}
                      onChange={() => setBulkForm(p => ({ ...p, scoreMode: 'CUSTOM' }))}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>تحديد درجة موحدة للجميع</span>
                  </label>

                  {bulkForm.scoreMode === 'CUSTOM' && (
                    <div className="pt-1 pr-5">
                      <input
                        type="number"
                        min={0}
                        max={bulkTargetAssignment.assignment.maxScore}
                        value={bulkForm.customScore}
                        onChange={e => setBulkForm(p => ({ ...p, customScore: e.target.value }))}
                        className="w-32 rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800"
                        placeholder="الدرجة"
                      />
                      <span className="text-xs text-slate-500 mr-2 font-medium">من {bulkTargetAssignment.assignment.maxScore}</span>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="scoreMode"
                      checked={bulkForm.scoreMode === 'KEEP'}
                      onChange={() => setBulkForm(p => ({ ...p, scoreMode: 'KEEP' }))}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <span>الإبقاء على درجات الطلاب المسجلة مسبقاً وتطبيق الرد فقط</span>
                  </label>
                </div>
              </div>

              {/* Status & Optional Image */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    حالة التسليمات بعد الإرسال:
                  </label>
                  <select
                    value={bulkForm.status}
                    onChange={e => setBulkForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="GRADED">تم التقييم (اعتماد رسمي)</option>
                    <option value="RESUBMISSION_REQUESTED">طلب إعادة التسليم</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    رابط صورة التوضيح أو الحل النموذجي (اختياري):
                  </label>
                  <input
                    type="url"
                    value={bulkForm.feedbackImageUrl}
                    onChange={e => setBulkForm(p => ({ ...p, feedbackImageUrl: e.target.value }))}
                    placeholder="https://..."
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Submit & Cancel Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                {(() => {
                  const targetCount = bulkForm.targetScope === 'SELECTED'
                    ? bulkTargetAssignment.submissions.filter(s => selectedSubmissionIds.has(s.id)).length
                    : bulkForm.targetScope === 'PENDING'
                      ? bulkTargetAssignment.submissions.filter(s => s.status === 'SUBMITTED').length
                      : bulkTargetAssignment.submissions.length;
                  return `سيتم إرسال الرد والإشعار إلى ${targetCount} طالب`;
                })()}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBulkModalOpen(false);
                    setBulkTargetAssignment(null);
                  }}
                  disabled={savingBulk}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendBulkReply()}
                  disabled={savingBulk}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {savingBulk ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>جارٍ إرسال الرد للجميع...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>إرسال الرد والتقييم للجميع الآن (مرة واحدة)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
