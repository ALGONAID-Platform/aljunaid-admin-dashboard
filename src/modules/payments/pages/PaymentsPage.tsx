import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { Check, X, RefreshCw, Plus, WalletCards, ReceiptText, History, Search, Zap, ShieldCheck } from 'lucide-react';
import { Pagination } from '../../../components/ui/Pagination';
import { getPaymentMethod } from '../utils/paymentType';
import { toast } from 'react-hot-toast';

type Account = { id: number | string; providerTitle: string; accountHolder: string; accountNumber: string; currency?: string; instructions?: string; qrCodeUrl?: string; isActive: boolean; order: number };
type Payment = { id: number | string; status: string; amount?: number; currency?: string; transactionNumber?: string; paymentAccountId?: number | string; reviewedById?: number | string; receiptUrl?: string; receiptImageUrl?: string; notes?: string; createdAt?: string; reviewedAt?: string; rejectionReason?: string; student?: any; course?: any; paymentAccount?: Account; enrollment?: { status?: string } };
type PaymentTab = 'pending' | 'history' | 'accounts';
const currencies = ['YER_OLD', 'YER_NEW', 'SAR', 'USD'];
const unwrap = (data: any) => data?.data ?? data;
const rowsFrom = (data: any): Payment[] => {
  const payload = unwrap(data);
  if (Array.isArray(payload)) return payload;
  const rows = payload?.payments ?? payload?.items ?? payload?.results ?? payload?.data ?? [];
  return Array.isArray(rows) ? rows : [];
};
const errorText = (error: any) => error?.response?.data?.message ?? error?.message ?? 'تعذر إتمام العملية';
const statusLabel = (status: string) => ({ APPROVED: 'معتمد', PENDING: 'قيد المراجعة', REJECTED: 'مرفوض' }[status?.toUpperCase()] ?? status);
const statusClass = (status: string) => status?.toUpperCase() === 'APPROVED'
  ? 'bg-emerald-50 text-emerald-800'
  : status?.toUpperCase() === 'PENDING'
    ? 'bg-amber-50 text-amber-800'
    : status?.toUpperCase() === 'REJECTED'
      ? 'bg-red-50 text-red-800'
      : 'bg-slate-100 text-slate-700';

export function PaymentsPage() {
  const [tab, setTab] = useState<PaymentTab>('pending');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'automated' | 'manual'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [form, setForm] = useState<any>({ providerTitle: '', accountHolder: '', accountNumber: '', currency: 'YER_OLD', instructions: '', qrCodeUrl: '', isActive: true, order: 0 });

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const endpoint = tab === 'history' ? '/payments' : '/payments/pending';
      const response = await api.get(endpoint);
      let accountList: Account[] = [];
      try {
        const accountResponse = await api.get('/payments/accounts/all');
        const accountPayload = unwrap(accountResponse.data);
        accountList = Array.isArray(accountPayload) ? accountPayload : accountPayload?.accounts ?? [];
        setAccounts(accountList);
      } catch { /* Account details are optional; payment records remain usable without them. */ }
      const paymentList = rowsFrom(response.data).map(payment => ({
        ...payment,
        paymentAccount: payment.paymentAccount ?? accountList.find(account => String(account.id) === String(payment.paymentAccountId)),
      }));
      setPayments(tab === 'pending' ? paymentList.filter(payment => getPaymentMethod(payment).kind !== 'automated') : paymentList);
    } catch (error) {
      setPayments([]);
      setMessage(errorText(error));
      setMessageKind('error');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.get('/payments/accounts/all');
      const result = unwrap(data);
      setAccounts(Array.isArray(result) ? result : result?.accounts ?? []);
    } catch (error) {
      setMessage(errorText(error));
      setMessageKind('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'accounts') void loadAccounts();
    else void loadPayments();
  }, [tab, loadPayments, loadAccounts]);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, methodFilter, search, tab]);

  const filteredPayments = useMemo(() => payments.filter(payment => {
    const statusMatches = tab !== 'history' || !statusFilter || payment.status?.toUpperCase() === statusFilter;
    const method = getPaymentMethod(payment).kind;
    const methodMatches = methodFilter === 'all' || method === methodFilter;
    const studentProfile = payment.student;
    const student = studentProfile?.user ?? studentProfile;
    const searchText = [payment.id, payment.transactionNumber, student?.name, student?.email, payment.course?.title].filter(Boolean).join(' ').toLowerCase();
    return statusMatches && methodMatches && (!search.trim() || searchText.includes(search.trim().toLowerCase()));
  }), [payments, statusFilter, methodFilter, search, tab]);
  const pagedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const decide = async (payment: Payment, action: 'approve' | 'reject') => {
    let reason = '';
    if (action === 'reject') { reason = window.prompt('سبب رفض طلب الدفع:')?.trim() ?? ''; if (!reason) return; }
    setBusy(String(payment.id)); setMessage('');
    try {
      await api.patch(`/payments/${payment.id}/${action}`, action === 'reject' ? { reason } : undefined);
      setMessage(action === 'approve' ? 'تم اعتماد الدفع وتفعيل التسجيل.' : 'تم رفض طلب الدفع.');
      setMessageKind('success');
      toast.success(action === 'approve' ? 'تم اعتماد الدفع وتفعيل التسجيل' : 'تم رفض طلب الدفع');
      await loadPayments();
    } catch (error) { setMessage(errorText(error)); setMessageKind('error'); toast.error(errorText(error)); }
    finally { setBusy(null); }
  };

  const openAccount = (account?: Account) => {
    setEditing(account ?? null); setAccountFormOpen(true);
    setForm(account ? { ...account } : { providerTitle: '', accountHolder: '', accountNumber: '', currency: 'YER_OLD', instructions: '', qrCodeUrl: '', isActive: true, order: 0 });
  };
  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    try {
      if (editing) await api.patch(`/payments/accounts/${editing.id}`, form);
      else await api.post('/payments/accounts', form);
      setEditing(null); setAccountFormOpen(false); setMessage('تم حفظ حساب الدفع.'); setMessageKind('success'); toast.success('تم حفظ حساب الدفع'); await loadAccounts();
    } catch (error) { setMessage(errorText(error)); setMessageKind('error'); toast.error(errorText(error)); }
  };
  const updateAccount = async (account: Account, patch: Partial<Account>) => {
    setBusy(String(account.id)); setMessage('');
    try { await api.patch(`/payments/accounts/${account.id}`, patch); await loadAccounts(); toast.success(patch.isActive === undefined ? 'تم تحديث حساب الدفع' : patch.isActive ? 'تم تفعيل حساب الدفع' : 'تم إيقاف حساب الدفع'); }
    catch (error) { setMessage(errorText(error)); setMessageKind('error'); toast.error(errorText(error)); }
    finally { setBusy(null); }
  };

  const tabButton = (key: PaymentTab, label: string, Icon: typeof ReceiptText) => <button onClick={() => { setTab(key); setMessage(''); }} className={`rounded-xl px-4 py-2 font-bold ${tab === key ? 'bg-emerald-600 text-white' : 'border bg-white text-slate-600'}`}><Icon className="ml-2 inline" size={17}/>{label}</button>;

  return <section dir="rtl" className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-slate-900">المدفوعات والحسابات</h2><p className="mt-1 text-sm text-slate-500">مراجعة طلبات الدفع، سجل معاملات كارتي، وإدارة حسابات استقبال الرسوم.</p></div><button onClick={() => tab === 'accounts' ? void loadAccounts() : void loadPayments()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold"><RefreshCw size={16}/> تحديث</button></header>
    <div className="flex flex-wrap gap-2">{tabButton('pending', 'طلبات قيد المراجعة', ReceiptText)}{tabButton('history', 'سجل المدفوعات', History)}{tabButton('accounts', 'الحسابات والمحافظ', WalletCards)}</div>
    {message && <div role={messageKind === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm font-semibold ${messageKind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message}</div>}

    {tab !== 'accounts' ? <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4">
        <label className="text-sm font-bold">نوع الدفع</label><select className="rounded-lg border px-3 py-2" value={methodFilter} onChange={event => setMethodFilter(event.target.value as typeof methodFilter)}><option value="all">كل المدفوعات</option><option value="automated">سداد آلي (كارتي)</option><option value="manual">سداد يدوي (سند تحويل)</option></select>
        {tab === 'history' && <><label className="text-sm font-bold">حالة الدفع</label><select className="rounded-lg border px-3 py-2" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">كل الحالات</option><option value="PENDING">قيد المراجعة</option><option value="APPROVED">معتمد</option><option value="REJECTED">مرفوض</option></select></>}
        <label className="relative min-w-48 flex-1"><Search className="absolute right-3 top-2.5 text-slate-400" size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث بالطالب أو المقرر أو رقم العملية" className="w-full rounded-lg border py-2 pr-9 pl-3 text-sm"/></label>
        <span className="text-sm text-slate-500">{filteredPayments.length} عملية</span>
      </div>
      {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل {tab === 'history' ? 'سجل المدفوعات' : 'طلبات الدفع'}…</div> : filteredPayments.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">{tab === 'pending' ? 'لا توجد طلبات دفع معلقة بهذه التصفية.' : 'لا توجد معاملات مطابقة لهذه التصفية.'}</div> : <>
        <div className="space-y-4">{pagedPayments.map(payment => {
          const studentProfile = payment.student;
          const student = studentProfile?.user ?? studentProfile;
          const paymentType = getPaymentMethod(payment);
          const PaymentIcon = paymentType.Icon;
          const isPending = payment.status?.toUpperCase() === 'PENDING' && tab === 'pending' && paymentType.kind !== 'automated';
          const accountLabel = payment.paymentAccount?.providerTitle ?? (payment.paymentAccountId != null ? `حساب #${payment.paymentAccountId}` : paymentType.kind === 'automated' ? 'تطبيق كارتي' : '—');
          return <article key={payment.id} className="grid gap-4 rounded-2xl border bg-white p-4 lg:grid-cols-[1fr_250px]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900">{student?.name ?? 'طالب'}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(payment.status)}`}>{statusLabel(payment.status)}</span><span className="text-xs text-slate-500">#{payment.id}</span></div>
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold ${paymentType.badgeClassName}`}><PaymentIcon size={14}/>{paymentType.label}</div>
              <div className="grid gap-2 text-sm sm:grid-cols-2"><p><b>المقرر:</b> {payment.course?.title ?? '—'}</p><p><b>المبلغ:</b> {payment.amount ?? '—'} {payment.currency ?? ''}</p><p><b>الحساب:</b> {accountLabel} ({payment.paymentAccount?.currency ?? payment.currency ?? '—'})</p><p><b>رقم العملية:</b> {payment.transactionNumber ?? '—'}</p><p><b>التسجيل:</b> {payment.enrollment?.status ?? (payment.status?.toUpperCase() === 'APPROVED' ? 'ACTIVE' : 'غير مفعّل')}</p><p><b>البريد:</b> {student?.email ?? '—'}</p><p><b>الرقم الأكاديمي:</b> {studentProfile?.academicId ?? '—'}</p><p><b>الصف الدراسي:</b> {studentProfile?.grade ?? '—'}</p><p><b>تاريخ الدفع:</b> {payment.createdAt ? new Date(payment.createdAt).toLocaleString('ar') : '—'}</p><p><b>تاريخ الاعتماد:</b> {payment.reviewedAt ? new Date(payment.reviewedAt).toLocaleString('ar') : '—'}</p></div>
              {payment.notes && <p className="rounded-lg bg-slate-50 p-3 text-sm"><b>ملاحظات الطالب:</b> {payment.notes}</p>}
              {payment.rejectionReason && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700"><b>سبب الرفض:</b> {payment.rejectionReason}</p>}
              {isPending && <div className="flex gap-2"><button disabled={busy === String(payment.id)} onClick={() => void decide(payment, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Check className="ml-1 inline" size={16}/>اعتماد الدفع</button><button disabled={busy === String(payment.id)} onClick={() => void decide(payment, 'reject')} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50"><X className="ml-1 inline" size={16}/>رفض</button></div>}
            </div>
            <div className="flex min-h-40 flex-col items-center justify-center rounded-xl bg-slate-50 p-4">
              {paymentType.kind === 'automated' ? <div className="text-center"><div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-700"><ShieldCheck size={23}/></div><p className="text-xs font-bold text-violet-800">تم التحقق عبر كارتي</p><p className="mt-2 flex items-center justify-center gap-1.5 break-all text-sm font-bold text-slate-800"><Zap size={15} className="shrink-0 text-violet-600"/>{payment.transactionNumber || 'رقم العملية غير متاح'}</p></div>
                : paymentType.hasReceiptImage && paymentType.receiptImageUrl ? <button type="button" onClick={() => setReceiptPreview(paymentType.receiptImageUrl!)} className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-sky-100 bg-white text-sm font-bold text-sky-800 hover:bg-sky-50"><ReceiptText size={28}/><span>معاينة السند</span></button>
                  : <div className="text-center text-sm text-slate-400">لا توجد صورة إيصال</div>}
            </div>
          </article>;
        })}</div>
        <Pagination currentPage={currentPage} totalItems={filteredPayments.length} itemsPerPage={itemsPerPage} isLoading={loading} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage}/>
      </>}
    </> : <>
      <div className="flex justify-end"><button onClick={() => openAccount()} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"><Plus className="ml-2 inline" size={17}/>إضافة حساب</button></div>
      {accountFormOpen && <form onSubmit={saveAccount} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">{[['providerTitle','البنك أو مزود الدفع'],['accountHolder','اسم صاحب الحساب'],['accountNumber','رقم الحساب'],['qrCodeUrl','رابط QR'],['instructions','تعليمات الدفع']].map(([key,label])=><label key={key} className="text-sm font-bold text-slate-700">{label}<input required={['providerTitle','accountHolder','accountNumber'].includes(key)} value={form[key] ?? ''} onChange={event=>setForm({...form,[key]:event.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>)}<label className="text-sm font-bold">العملة<select value={form.currency ?? ''} onChange={event=>setForm({...form,currency:event.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2">{currencies.map(currency=><option key={currency}>{currency}</option>)}</select></label><label className="text-sm font-bold">ترتيب العرض<input type="number" value={form.order ?? 0} onChange={event=>setForm({...form,order:Number(event.target.value)})} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!form.isActive} onChange={event=>setForm({...form,isActive:event.target.checked})}/>نشط</label><div className="flex items-center gap-2"><button className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white">حفظ</button><button type="button" onClick={()=>setAccountFormOpen(false)} className="rounded-lg border px-4 py-2">إلغاء</button></div></form>}
      {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل الحسابات…</div> : accounts.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">لم تتم إضافة حسابات دفع.</div> : <div className="grid gap-4 md:grid-cols-2">{accounts.map(account=><article key={account.id} className="space-y-3 rounded-2xl border bg-white p-4"><div className="flex items-start justify-between"><div><h3 className="font-extrabold">{account.providerTitle}</h3><p className="text-sm text-slate-500">{account.accountHolder} · {account.accountNumber}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-extrabold text-blue-800">{account.currency ?? 'جميع العملات'}</span></div>{account.qrCodeUrl && <img src={account.qrCodeUrl} alt="رمز الدفع QR" referrerPolicy="no-referrer" className="h-32 w-32 rounded-lg border object-contain"/>}{account.instructions && <p className="text-sm text-slate-600">{account.instructions}</p>}<div className="flex items-center justify-between border-t pt-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={account.isActive} disabled={busy===String(account.id)} onChange={event=>void updateAccount(account,{isActive:event.target.checked})}/>نشط</label><span className="text-xs text-slate-500">ترتيب {account.order}</span><button onClick={()=>openAccount(account)} className="rounded-lg border px-3 py-1.5 text-sm font-bold">تعديل</button></div></article>)}</div>}
    </>}

    {receiptPreview && <div role="dialog" aria-modal="true" aria-label="معاينة سند الدفع" className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setReceiptPreview(null)}><div className="relative max-h-[95vh] max-w-5xl" onClick={event => event.stopPropagation()}><button type="button" onClick={() => setReceiptPreview(null)} className="absolute -top-3 -left-3 z-10 rounded-full bg-white p-2 text-slate-700 shadow-lg" aria-label="إغلاق المعاينة"><X size={20}/></button><img src={receiptPreview} alt="سند تحويل يدوي" className="max-h-[90vh] max-w-full rounded-xl bg-white object-contain"/></div></div>}
  </section>;
}
