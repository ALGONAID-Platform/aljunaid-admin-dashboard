/**
 * CourseStudentsPage — صفحة إدارة مشتركي الكورس
 * تتيح للأدمن استعراض المشتركين وإضافة مشتركين جدد وإلغاء تسجيلهم
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import {
  UserPlus,
  Search,
  RefreshCw,
  Trash2,
  UserCheck,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Users,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Pagination } from '../../../components/ui/Pagination';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CourseStudent {
  enrollmentId: number;
  enrolledAt: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  student: {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    academicId: string;
    joinedAt: string;
  };
  payment?: {
    id: number;
    amount?: number;
    currency?: string;
    status: string;
    createdAt: string;
  } | null;
}

interface EnrollmentsResponse {
  course: { id: number; title: string; isPaid: boolean };
  enrollments: CourseStudent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UserSearchResult {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  studentProfile?: { academicId?: string } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const errorMsg = (err: any): string => {
  const m = err?.response?.data?.message ?? err?.message ?? 'تعذرت العملية';
  return Array.isArray(m) ? m.join('، ') : String(m);
};

const statusBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return { label: 'نشط', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'CANCELLED':
      return { label: 'ملغي', cls: 'bg-red-50 text-red-800 border-red-200' };
    case 'COMPLETED':
      return { label: 'مكتمل', cls: 'bg-blue-50 text-blue-800 border-blue-200' };
    default:
      return { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

const paymentStatusBadge = (status?: string) => {
  if (!status) return null;
  switch (status?.toUpperCase()) {
    case 'APPROVED':
      return { label: 'مدفوع', icon: CheckCircle2, cls: 'text-emerald-700' };
    case 'PENDING':
      return { label: 'قيد المراجعة', icon: Clock, cls: 'text-amber-600' };
    case 'REJECTED':
      return { label: 'مرفوض', icon: XCircle, cls: 'text-red-600' };
    default:
      return { label: status, icon: CreditCard, cls: 'text-slate-500' };
  }
};

const currencies: Record<string, string> = {
  YER_OLD: 'ريال (قديم)',
  YER_NEW: 'ريال (جديد)',
  SAR: 'ريال سعودي',
  USD: 'دولار',
};

// ─── Add Student Modal ────────────────────────────────────────────────────────

function AddStudentModal({
  courseId,
  isPaid,
  onClose,
  onSuccess,
}: {
  courseId: string;
  isPaid: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const [createPayment, setCreatePayment] = useState(true);
  const [currency, setCurrency] = useState('YER_OLD');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get<any>('/users/unverified', {
        params: { search: q.trim(), limit: 10, page: 1 },
      });
      const root = data?.data ?? data;
      const users: UserSearchResult[] = Array.isArray(root)
        ? root
        : root?.users ?? root?.items ?? root?.results ?? [];
      setResults(users);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void search(query), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, search]);

  const handleEnroll = async () => {
    if (!selected) { toast.error('اختر مستخدماً أولاً'); return; }
    setEnrolling(true);
    try {
      await api.post('/payments/admin/enroll', {
        userId: selected.id,
        courseId: Number(courseId),
        createPayment: isPaid ? createPayment : false,
        ...(isPaid && createPayment && amount ? { amount: Number(amount) } : {}),
        ...(isPaid && createPayment ? { currency } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success(`تم تسجيل "${selected.name}" في الكورس بنجاح`);
      onSuccess();
    } catch (err) {
      toast.error(errorMsg(err));
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <UserPlus size={20} />
            </div>
            <h2 className="text-lg font-black text-slate-900">إضافة مشترك جديد</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          {/* Search */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">البحث عن مستخدم</label>
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-9 pl-4 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Search Results */}
            {(results.length > 0 || searching) && !selected && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border bg-white shadow-lg">
                {searching ? (
                  <div className="p-3 text-center text-sm text-slate-500">جارٍ البحث...</div>
                ) : results.length === 0 ? (
                  <div className="p-3 text-center text-sm text-slate-500">لا توجد نتائج</div>
                ) : (
                  results.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setSelected(u); setQuery(u.name); setResults([]); }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-right hover:bg-emerald-50 transition-colors"
                    >
                      <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                        {u.name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected User Badge */}
            {selected && (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                <UserCheck size={18} className="text-emerald-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-900">{selected.name}</p>
                  <p className="text-xs text-emerald-700">{selected.email}</p>
                </div>
                <button onClick={() => { setSelected(null); setQuery(''); }} className="text-emerald-600 hover:text-emerald-800">
                  <X size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Payment options (only for paid courses) */}
          {isPaid && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <CreditCard size={16} />
                <span className="text-sm font-bold">خيارات الدفع (كورس مدفوع)</span>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={createPayment}
                  onChange={(e) => setCreatePayment(e.target.checked)}
                  className="size-4 accent-emerald-600"
                />
                <span className="font-medium text-slate-700">تسجيل دفعة معتمدة تلقائياً</span>
              </label>

              {createPayment && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">العملة</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100"
                    >
                      {Object.entries(currencies).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">المبلغ (اختياري)</label>
                    <input
                      type="number"
                      placeholder="تلقائي من الكورس"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">ملاحظات (اختياري)</label>
            <textarea
              rows={2}
              placeholder="سبب التسجيل اليدوي، أو أي ملاحظة للسجلات..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t bg-slate-50 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleEnroll}
            disabled={enrolling || !selected}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {enrolling ? (
              <><RefreshCw size={15} className="animate-spin" /> جارٍ التسجيل...</>
            ) : (
              <><UserPlus size={15} /> تسجيل المستخدم</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface Props {
  scopedCourseId: string;
}

export function CourseStudentsPage({ scopedCourseId }: Props) {
  const [data, setData] = useState<EnrollmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const load = useCallback(async () => {
    if (!scopedCourseId) return;
    setLoading(true);
    try {
      const { data: res } = await api.get<EnrollmentsResponse>(
        `/payments/admin/enrollments/${scopedCourseId}`,
        { params: { page, limit, ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}) } },
      );
      setData(res);
    } catch (err) {
      toast.error(errorMsg(err));
    } finally {
      setLoading(false);
    }
  }, [scopedCourseId, page, limit, debouncedSearch]);

  useEffect(() => { void load(); }, [load]);

  const handleRemove = async (student: CourseStudent['student']) => {
    if (!confirm(`هل أنت متأكد من إلغاء تسجيل "${student.name}" من هذا الكورس؟`)) return;
    setRemovingId(student.id);
    try {
      await api.delete(`/payments/admin/enrollments/${scopedCourseId}/users/${student.id}`);
      toast.success(`تم إلغاء تسجيل "${student.name}" بنجاح`);
      void load();
    } catch (err) {
      toast.error(errorMsg(err));
    } finally {
      setRemovingId(null);
    }
  };

  if (!scopedCourseId) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
        اختر مقرراً لعرض المشتركين.
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900">المشتركون في الكورس</h3>
            {data && (
              <p className="text-xs text-slate-500">
                {data.total} مشترك{data.course.isPaid ? ' • كورس مدفوع' : ' • كورس مجاني'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-xl border border-slate-300 bg-white py-2 pr-9 pl-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <button
            onClick={() => void load()}
            title="تحديث"
            className="rounded-xl border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-emerald-700"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <UserPlus size={16} /> إضافة مشترك
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={28} className="mx-auto animate-spin text-emerald-500" />
            <p className="mt-3 text-sm">جارٍ تحميل بيانات المشتركين...</p>
          </div>
        ) : !data || data.enrollments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-slate-100">
              <AlertCircle size={24} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-600">
              {debouncedSearch ? 'لا توجد نتائج مطابقة' : 'لا يوجد مشتركون في هذا الكورس بعد'}
            </p>
            {!debouncedSearch && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <UserPlus size={15} /> إضافة أول مشترك
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-5 py-3.5 text-right text-xs font-black uppercase tracking-wide text-slate-500">المستخدم</th>
                  <th className="px-5 py-3.5 text-right text-xs font-black uppercase tracking-wide text-slate-500">الرقم الأكاديمي</th>
                  <th className="px-5 py-3.5 text-right text-xs font-black uppercase tracking-wide text-slate-500">تاريخ التسجيل</th>
                  <th className="px-5 py-3.5 text-right text-xs font-black uppercase tracking-wide text-slate-500">حالة الاشتراك</th>
                  {data.course.isPaid && (
                    <th className="px-5 py-3.5 text-right text-xs font-black uppercase tracking-wide text-slate-500">الدفع</th>
                  )}
                  <th className="px-5 py-3.5 text-center text-xs font-black uppercase tracking-wide text-slate-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.enrollments.map((item) => {
                  const badge = statusBadge(item.status);
                  const payBadge = item.payment ? paymentStatusBadge(item.payment.status) : null;
                  return (
                    <tr key={item.enrollmentId} className="hover:bg-slate-50 transition-colors">
                      {/* Student */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {item.student.avatar ? (
                            <img src={item.student.avatar} alt="" className="size-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="size-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                              {item.student.name?.charAt(0) ?? '?'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{item.student.name}</p>
                            <p className="text-xs text-slate-500 truncate">{item.student.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Academic ID */}
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">
                          {item.student.academicId}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {new Date(item.enrolledAt).toLocaleDateString('ar-SA', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      {/* Payment */}
                      {data.course.isPaid && (
                        <td className="px-5 py-4">
                          {payBadge ? (
                            <div className={`inline-flex items-center gap-1.5 ${payBadge.cls}`}>
                              <payBadge.icon size={14} />
                              <span className="text-xs font-bold">{payBadge.label}</span>
                              {item.payment?.amount ? (
                                <span className="text-xs text-slate-500">
                                  ({item.payment.amount} {currencies[item.payment.currency ?? ''] ?? item.payment.currency})
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      )}
                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        {item.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleRemove(item.student)}
                            disabled={removingId === item.student.id}
                            title="إلغاء التسجيل"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            {removingId === item.student.id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            إلغاء
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="border-t p-4">
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddStudentModal
          courseId={scopedCourseId}
          isPaid={data?.course.isPaid ?? false}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); void load(); }}
        />
      )}
    </div>
  );
}
