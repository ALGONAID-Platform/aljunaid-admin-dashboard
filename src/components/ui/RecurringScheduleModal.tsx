import { useState, useMemo, useEffect } from 'react';
import {
  CalendarClock, X, Check, Loader2, Sparkles, AlertCircle,
  Calendar, Clock, CheckCircle2, ChevronRight, Layers, ArrowLeft
} from 'lucide-react';
import { useLessonsStore, useCoursesStore, useModulesStore } from '../../store';
import { lessonService } from '../../services/api/lessons.api';
import { toast } from 'react-hot-toast';
import type { Lesson } from '../../types';

interface RecurringScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
  courseTitle?: string;
  fallbackLessons?: Lesson[];
  onSuccess?: () => void;
}

const WEEK_DAYS = [
  { id: 6, label: 'السبت', short: 'سبت' },
  { id: 0, label: 'الأحد', short: 'أحد' },
  { id: 1, label: 'الاثنين', short: 'اثنين' },
  { id: 2, label: 'الثلاثاء', short: 'ثلاثاء' },
  { id: 3, label: 'الأربعاء', short: 'أربعاء' },
  { id: 4, label: 'الخميس', short: 'خميس' },
  { id: 5, label: 'الجمعة', short: 'جمعة' },
];

const PRESETS = [
  { label: 'سبت - إثنين - أربعاء', days: [6, 1, 3] },
  { label: 'أحد - ثلاثاء - خميس', days: [0, 2, 4] },
  { label: 'سبت - أحد - إثنين', days: [6, 0, 1] },
  { label: 'يومياً (ما عدا الجمعة)', days: [6, 0, 1, 2, 3, 4] },
];

export function RecurringScheduleModal({
  isOpen,
  onClose,
  courseId: initialCourseId,
  courseTitle: initialCourseTitle,
  fallbackLessons,
  onSuccess,
}: RecurringScheduleModalProps) {
  const { courses, fetchCourses } = useCoursesStore();
  const { lessons: storeLessons, scheduleRecurring, fetchLessonsPage, fetchLessons } = useLessonsStore();
  const { modules: allModules, fetchModules } = useModulesStore();

  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || '');
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [isFetchingLessons, setIsFetchingLessons] = useState(false);

  // Range selection state
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('custom');
  const [startLessonId, setStartLessonId] = useState<string>('');
  const [endLessonId, setEndLessonId] = useState<string>('');
  const [startDayNumber, setStartDayNumber] = useState<number>(1);

  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedDays, setSelectedDays] = useState<number[]>([6, 0, 1]); // Default: Sat, Sun, Mon
  const [time, setTime] = useState<string>('18:00');
  const [durationMinutes, setDurationMinutes] = useState<string>('60');
  const [updateDayNumber, setUpdateDayNumber] = useState<boolean>(true);
  const [intervalWeeks, setIntervalWeeks] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllPreview, setShowAllPreview] = useState(false);

  // Sync course selection
  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(String(courses[0].id));
    }
  }, [initialCourseId, courses, selectedCourseId]);

  // Make sure courses and modules are loaded
  useEffect(() => {
    if (courses.length === 0) {
      void fetchCourses();
    }
    if (allModules.length === 0) {
      void fetchModules();
    }
  }, [courses.length, allModules.length, fetchCourses, fetchModules]);

  // Effective course
  const effectiveCourseId = initialCourseId || selectedCourseId || (courses[0]?.id ? String(courses[0].id) : '');
  const currentCourse = courses.find((c) => String(c.id) === String(effectiveCourseId));

  // Fetch all lessons for the selected course directly
  useEffect(() => {
    if (!isOpen || !effectiveCourseId) {
      setCourseLessons([]);
      return;
    }

    let isCancelled = false;
    setIsFetchingLessons(true);

    const load = async () => {
      try {
        // 1. Fetch full course lessons directly via getCoursePage with high limit
        const res = await lessonService.getCoursePage(effectiveCourseId, 1, 500);
        if (!isCancelled && res.items && res.items.length > 0) {
          setCourseLessons(res.items);
          setIsFetchingLessons(false);
          return;
        }
      } catch (e) {
        console.warn('Failed getCoursePage in RecurringScheduleModal', e);
      }

      try {
        // 2. Fallback: getByCourseId
        const items = await lessonService.getByCourseId(effectiveCourseId);
        if (!isCancelled && items && items.length > 0) {
          setCourseLessons(items);
          setIsFetchingLessons(false);
          return;
        }
      } catch (e) {
        console.warn('Failed getByCourseId in RecurringScheduleModal', e);
      }

      // 3. Fallback: check fallbackLessons prop if supplied and matching
      if (!isCancelled && fallbackLessons && fallbackLessons.length > 0) {
        setCourseLessons(fallbackLessons);
        setIsFetchingLessons(false);
        return;
      }

      // 4. Fallback: check lessons from store using module resolution
      if (!isCancelled) {
        const matched = storeLessons.filter((l) => {
          if (String(l.courseId) === String(effectiveCourseId)) return true;
          const mod = allModules.find((m) => String(m.id) === String(l.courseId));
          return String(mod?.courseId) === String(effectiveCourseId);
        });
        setCourseLessons(matched);
        setIsFetchingLessons(false);
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, effectiveCourseId, fallbackLessons, storeLessons, allModules]);

  // Full sorted lessons in the course
  const sortedAllLessons = useMemo(() => {
    return [...courseLessons].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [courseLessons]);

  // Default start and end lesson IDs when lessons load
  useEffect(() => {
    if (sortedAllLessons.length > 0) {
      const firstId = String(sortedAllLessons[0].id);
      const lastId = String(sortedAllLessons[sortedAllLessons.length - 1].id);
      setStartLessonId((prev) => (sortedAllLessons.some((l) => String(l.id) === prev) ? prev : firstId));
      setEndLessonId((prev) => (sortedAllLessons.some((l) => String(l.id) === prev) ? prev : lastId));
    } else {
      setStartLessonId('');
      setEndLessonId('');
    }
  }, [sortedAllLessons]);

  // Sliced target lessons based on range selection
  const { targetLessons, startIndex, endIndex } = useMemo(() => {
    if (sortedAllLessons.length === 0) {
      return { targetLessons: [], startIndex: 0, endIndex: 0 };
    }
    if (rangeMode === 'all') {
      return {
        targetLessons: sortedAllLessons,
        startIndex: 0,
        endIndex: sortedAllLessons.length - 1,
      };
    }

    let sIdx = sortedAllLessons.findIndex((l) => String(l.id) === String(startLessonId));
    let eIdx = sortedAllLessons.findIndex((l) => String(l.id) === String(endLessonId));

    if (sIdx === -1) sIdx = 0;
    if (eIdx === -1) eIdx = sortedAllLessons.length - 1;

    if (sIdx > eIdx) {
      const tmp = sIdx;
      sIdx = eIdx;
      eIdx = tmp;
    }

    const sliced = sortedAllLessons.slice(sIdx, eIdx + 1);
    return { targetLessons: sliced, startIndex: sIdx, endIndex: eIdx };
  }, [sortedAllLessons, rangeMode, startLessonId, endLessonId]);

  // Auto-sync startDayNumber with startIndex
  useEffect(() => {
    if (rangeMode === 'custom') {
      setStartDayNumber(startIndex + 1);
    } else {
      setStartDayNumber(1);
    }
  }, [startIndex, rangeMode]);

  // Toggle single day
  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) {
          toast.error('يجب اختيار يوم واحد على الأقل للتدريس');
          return prev;
        }
        return prev.filter((d) => d !== dayId);
      }
      return [...prev, dayId];
    });
  };

  // Live preview calculation
  const previewSchedule = useMemo(() => {
    if (!startDate || selectedDays.length === 0 || !time || targetLessons.length === 0) {
      return [];
    }

    const weekOrder = [6, 0, 1, 2, 3, 4, 5];
    const sortedDays = [...selectedDays].sort(
      (a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b)
    );

    const [hours, minutes] = time.split(':').map(Number);
    const dateParts = startDate.split('-').map(Number);
    if (dateParts.length < 3) return [];
    const [year, month, day] = dateParts;

    let curY = year;
    let curM = month;
    let curD = day;

    let testDate = new Date(curY, curM - 1, curD, 12, 0, 0);
    while (!sortedDays.includes(testDate.getDay())) {
      testDate.setDate(testDate.getDate() + 1);
    }

    let dayIndex = sortedDays.indexOf(testDate.getDay());
    const stepWeeks = Math.max(1, intervalWeeks || 1);

    const result: Array<{
      lesson: Lesson;
      date: Date;
      dayNumber: number;
      dayName: string;
      formattedDate: string;
      formattedTime: string;
    }> = [];

    const arabicDayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    for (let i = 0; i < targetLessons.length; i++) {
      const lesson = targetLessons[i];
      if (i > 0) {
        const prevIndex = dayIndex;
        dayIndex = (dayIndex + 1) % sortedDays.length;
        const targetDay = sortedDays[dayIndex];

        testDate.setDate(testDate.getDate() + 1);
        while (testDate.getDay() !== targetDay) {
          testDate.setDate(testDate.getDate() + 1);
        }

        if (dayIndex === 0 && prevIndex === sortedDays.length - 1 && stepWeeks > 1) {
          testDate.setDate(testDate.getDate() + (stepWeeks - 1) * 7);
        }
      }

      const scheduledDate = new Date(
        testDate.getFullYear(),
        testDate.getMonth(),
        testDate.getDate(),
        hours,
        minutes
      );

      result.push({
        lesson,
        date: scheduledDate,
        dayNumber: startDayNumber + i,
        dayName: arabicDayNames[scheduledDate.getDay()],
        formattedDate: scheduledDate.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        formattedTime: scheduledDate.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      });
    }

    return result;
  }, [startDate, selectedDays, time, targetLessons, intervalWeeks, startDayNumber]);

  const handleApply = async () => {
    if (!effectiveCourseId) {
      toast.error('يرجى تحديد المقرر أولاً.');
      return;
    }
    if (selectedDays.length === 0) {
      toast.error('يرجى اختيار يوم واحد على الأقل للتدريس في الأسبوع.');
      return;
    }
    if (!startDate) {
      toast.error('يرجى تحديد تاريخ البدء.');
      return;
    }
    if (!time) {
      toast.error('يرجى تحديد توقيت الدرس.');
      return;
    }
    if (targetLessons.length === 0) {
      toast.error('لا توجد دروس في النطاق المحدد لجدولتها.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        startDate,
        daysOfWeek: selectedDays,
        time,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        updateDayNumber,
        startDayNumber: updateDayNumber ? Number(startDayNumber) : undefined,
        intervalWeeks,
        lessonIds: targetLessons.map((l) => Number(l.id)),
        timezoneOffset: new Date().getTimezoneOffset(),
      };

      const response = await scheduleRecurring(effectiveCourseId, payload);
      toast.success(
        response?.message || `تمت جدولة ${targetLessons.length} درساً بنجاح بنمط أسبوعي منتظم 🎉`
      );

      // Refresh lessons list
      if (initialCourseId) {
        await fetchLessonsPage(initialCourseId, 1, 10);
      } else {
        await fetchLessons(effectiveCourseId);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'فشلت عملية الجدولة.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-l from-indigo-50/70 via-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                الجدولة الأسبوعية التلقائية للدروس
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                  ذكي وآلي
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                توزيع مواعيد الدروس تسلسلياً على أيام أسبوعية محددة وبشكل منتظم لكامل المقرر.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Course Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">المقرر المستهدف للجدولة</label>
            {courses.length > 0 ? (
              <select
                value={effectiveCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                {currentCourse?.title || initialCourseTitle || 'المقرر المحدد'}
              </div>
            )}
          </div>

          {/* Quick Info Badge */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                المقرر: <strong className="font-black text-indigo-950">{currentCourse?.title || initialCourseTitle || 'المقرر المحدد'}</strong>
              </span>
            </div>
            {isFetchingLessons ? (
              <span className="flex items-center gap-1.5 font-bold bg-white px-3 py-1 rounded-xl border border-indigo-200 text-indigo-700 shadow-2xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                جارٍ جلب الدروس...
              </span>
            ) : sortedAllLessons.length > 0 ? (
              <span className="font-bold bg-emerald-100/90 px-3 py-1 rounded-xl border border-emerald-300 text-emerald-800 shadow-2xs">
                {sortedAllLessons.length} درس متاح في المقرر ✅
              </span>
            ) : (
              <span className="font-bold bg-amber-100/90 px-3 py-1 rounded-xl border border-amber-300 text-amber-800 shadow-2xs">
                0 درس متاح في هذا المقرر ⚠️
              </span>
            )}
          </div>

          {/* Lessons Range Selection (من الدرس ... إلى الدرس ...) */}
          {sortedAllLessons.length > 0 && (
            <div className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-slate-50 to-white space-y-3 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  تحديد نطاق الدروس المراد جدولتها
                </label>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setRangeMode('custom')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      rangeMode === 'custom'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    نطاق مخصص (من - إلى)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangeMode('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      rangeMode === 'all'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    جميع الدروس ({sortedAllLessons.length})
                  </button>
                </div>
              </div>

              {rangeMode === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Start Lesson */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <span>البداية من الدرس:</span>
                      <span className="text-indigo-600 font-black">({startIndex + 1})</span>
                    </label>
                    <select
                      value={startLessonId}
                      onChange={(e) => setStartLessonId(e.target.value)}
                      disabled={sortedAllLessons.length === 0}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {sortedAllLessons.map((l, idx) => (
                        <option key={l.id} value={l.id}>
                          {idx + 1}. {l.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* End Lesson */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <span>النهاية عند الدرس:</span>
                      <span className="text-indigo-600 font-black">({endIndex + 1})</span>
                    </label>
                    <select
                      value={endLessonId}
                      onChange={(e) => setEndLessonId(e.target.value)}
                      disabled={sortedAllLessons.length === 0}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {sortedAllLessons.map((l, idx) => (
                        <option key={l.id} value={l.id}>
                          {idx + 1}. {l.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Range Summary Info */}
              <div className="text-[11px] font-bold text-indigo-800 bg-white/90 px-3 py-2 rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-1 shadow-2xs">
                <span>
                  المحدد للجدولة: <strong className="text-indigo-950 font-black">{targetLessons.length}</strong> درس
                  {rangeMode === 'custom' ? ` (من الدرس ${startIndex + 1} إلى ${endIndex + 1})` : ''}
                </span>
                <span className="text-slate-500 font-normal">
                  {sortedAllLessons.length - targetLessons.length > 0
                    ? `باقي الدروس (${sortedAllLessons.length - targetLessons.length}) لن تتأثر مواعيدها`
                    : 'كامل دروس المقرر مشمولة'}
                </span>
              </div>
            </div>
          )}

          {/* Start Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                تاريخ بداية التدريس
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 block">
                يبدأ توزيع أول درس في هذا اليوم أو أقرب يوم تدريس يليه.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                توقيت الدرس اليومي
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 block">
                الوقت الموحد الذي ستبدأ عنده جميع الدروس المجدولة.
              </span>
            </div>
          </div>

          {/* Days of Week Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 block">
                أيام التدريس الأسبوعية <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-indigo-600 font-bold">
                {selectedDays.length} أيام مختارة أسبوعياً
              </span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setSelectedDays(preset.days)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200/70 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Day Toggles */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {WEEK_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200 ring-2 ring-indigo-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold">{day.short}</span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isSelected ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">مدة الدرس بالدقائق</label>
              <input
                type="number"
                min="10"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="60"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-2 pt-1 sm:pt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateDayNumber}
                  onChange={(e) => setUpdateDayNumber(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700">
                  تحديث رقم اليوم (اليوم 1، 2، 3...) تسلسلياً
                </span>
              </label>

              {updateDayNumber && (
                <div className="flex items-center gap-2 pr-6">
                  <span className="text-[11px] font-bold text-slate-600">بدء ترقيم الأيام من:</span>
                  <input
                    type="number"
                    min="1"
                    value={startDayNumber}
                    onChange={(e) => setStartDayNumber(Math.max(1, Number(e.target.value)))}
                    className="w-16 px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-center text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 font-medium">(اليوم {startDayNumber} فصاعداً)</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                معاينة الجدول الزمني المولد ({previewSchedule.length} درس)
              </h4>
              {previewSchedule.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllPreview((p) => !p)}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  {showAllPreview ? 'عرض أقل' : `عرض الكل (${previewSchedule.length})`}
                </button>
              )}
            </div>

            {isFetchingLessons ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="font-semibold">جارٍ فحص وتحميل دروس هذا المقرر وتوليد الجدول الزمني...</span>
              </div>
            ) : previewSchedule.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">لا توجد دروس مضافة لهذا المقرر حتى الآن أو لم يتم اختيار أيام تدريس.</p>
                <p className="text-[11px] text-slate-400">أضف بعض الدروس للمقرر أولاً لتتمكن من جدولتها أسبوعياً بشكل تلقائي.</p>
              </div>
            ) : (
              <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80 max-h-56 overflow-y-auto custom-scrollbar">
                {(showAllPreview ? previewSchedule : previewSchedule.slice(0, 5)).map((item) => (
                  <div
                    key={item.lesson.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0 font-mono">
                        {item.dayNumber}
                      </span>
                      <span className="font-bold text-slate-800 truncate" title={item.lesson.title}>
                        {item.lesson.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-slate-600 font-medium text-[11px] mr-2">
                      <span className="font-bold text-indigo-900 bg-indigo-50/60 px-2 py-0.5 rounded-md">
                        {item.dayName}
                      </span>
                      <span>{item.formattedDate}</span>
                      <span className="font-mono text-slate-500">{item.formattedTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors"
          >
            إلغاء الأمر
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isLoading || targetLessons.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #059669)',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ حفظ الجدولة...</span>
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4" />
                <span>تطبيق الجدولة على الدروس المحددة ({targetLessons.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
