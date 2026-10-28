import { useEffect, useState } from 'react';
import { AlertCircle, Check, RefreshCw, Search, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Pagination } from '../../../components/ui/Pagination';
import { usersService, type UnverifiedUser } from '../../../services/api/users.api';

const roleLabels: Record<string, string> = {
  STUDENT: 'طالب',
  TEACHER: 'معلم',
  ADMIN: 'مسؤول',
  OWNER: 'مالك',
};

const errorMessage = (error: any) => {
  const message = error?.response?.data?.message ?? error?.message ?? 'تعذر تحميل الحسابات غير الموثقة.';
  return Array.isArray(message) ? message.join('، ') : message;
};

function studentDetails(user: UnverifiedUser) {
  const details = user.studentProfile ?? user.student ?? user.profile ?? {};
  return {
    academicId: user.academicId ?? details.academicId ?? details.studentId,
    grade: user.grade ?? details.grade ?? details.gradeName ?? details.className,
  };
}

export function UnverifiedUsersPage() {
  const [users, setUsers] = useState<UnverifiedUser[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, limit]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void usersService.getUnverified({ page, limit, search: debouncedSearch })
      .then(result => {
        if (!active) return;
        setUsers(result.users);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
        if (result.meta.page !== page) setPage(result.meta.page);
        if (result.meta.limit !== limit) setLimit(result.meta.limit);
      })
      .catch(err => { if (active) setError(errorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, limit, debouncedSearch, refreshKey]);

  const handleVerify = async (user: UnverifiedUser) => {
    if (verifyingId) return;
    if (!window.confirm(`تأكيد توثيق حساب ${user.name || user.email || user.id}؟`)) return;
    const id = String(user.id);
    setVerifyingId(id);
    try {
      await usersService.verifyAccount(user.id);
      setUsers(current => current.filter(item => String(item.id) !== id));
      setTotal(current => Math.max(0, current - 1));
      toast.success('تم توثيق الحساب بنجاح.');
      if (users.length === 1 && page > 1) setPage(value => value - 1);
      else setRefreshKey(value => value + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <section dir="rtl" className="space-y-5" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-900"><ShieldCheck className="h-6 w-6 text-emerald-600" /> توثيق الحسابات</h1>
          <p className="mt-1 text-sm text-slate-500">راجع الحسابات غير الموثقة وأكّد حسابات المستخدمين.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey(value => value + 1)} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث القائمة
        </button>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="relative block max-w-xl">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث بالاسم أو البريد الإلكتروني" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-10 pl-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </label>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-500" />
          <p className="font-bold text-slate-800">تعذر تحميل الحسابات</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button type="button" onClick={() => setRefreshKey(value => value + 1)} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">إعادة المحاولة</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-right text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">رقم المستخدم</th>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">البريد الإلكتروني</th>
                  <th className="px-4 py-3">الدور</th>
                  <th className="px-4 py-3">حالة التوثيق</th>
                  <th className="px-4 py-3">تاريخ التسجيل</th>
                  <th className="px-4 py-3">الرقم الأكاديمي</th>
                  <th className="px-4 py-3">الصف</th>
                  <th className="px-4 py-3">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && users.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">جارٍ تحميل الحسابات…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center"><UserRoundCheck className="mx-auto mb-2 h-8 w-8 text-emerald-500" /><p className="font-bold text-slate-700">لا توجد حسابات غير موثقة</p><p className="mt-1 text-xs text-slate-400">جرّب تغيير كلمات البحث.</p></td></tr>
                ) : users.map(user => {
                  const details = studentDetails(user);
                  const verified = Boolean(user.emailVerified ?? user.isEmailVerified ?? user.verified);
                  const role = String(user.role ?? '').toUpperCase();
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{user.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{user.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600" dir="ltr">{user.email || '—'}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{roleLabels[role] ?? user.role ?? '—'}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{verified ? 'موثق' : 'غير موثق'}</span></td>
                      <td className="px-4 py-3 text-slate-500">{(user.createdAt ?? user.registeredAt) ? new Date(user.createdAt ?? user.registeredAt!).toLocaleDateString('ar') : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{details.academicId || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{details.grade || '—'}</td>
                      <td className="px-4 py-3"><button type="button" onClick={() => void handleVerify(user)} disabled={Boolean(verifyingId)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50"><Check className="h-3.5 w-3.5" />{verifyingId === String(user.id) ? 'جارٍ التوثيق…' : 'توثيق الحساب'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {loading && users.length > 0 && <div className="px-4 py-2 text-center text-xs text-slate-400">جارٍ تحديث النتائج…</div>}
          <Pagination currentPage={page} totalItems={total} itemsPerPage={limit} totalPages={totalPages} onPageChange={setPage} onItemsPerPageChange={setLimit} />
          <span className="sr-only">إجمالي الصفحات: {totalPages}</span>
        </div>
      )}
    </section>
  );
}
