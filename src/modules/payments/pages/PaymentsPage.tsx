import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Check, X, RefreshCw, Plus, WalletCards, ReceiptText } from 'lucide-react';

type Account = { id: number; providerTitle: string; accountHolder: string; accountNumber: string; currency?: string; instructions?: string; qrCodeUrl?: string; isActive: boolean; order: number };
type Payment = { id: number; status: string; amount?: number; currency?: string; transactionNumber?: string; paymentAccountId?: number; receiptUrl?: string; receiptImageUrl?: string; notes?: string; createdAt?: string; reviewedAt?: string; rejectionReason?: string; student?: any; course?: any; paymentAccount?: Account; enrollment?: { status?: string } };
const currencies = ['YER_OLD', 'YER_NEW', 'SAR', 'USD'];
const unwrap = (d: any) => d?.data ?? d;
const errorText = (e: any) => e?.response?.data?.message ?? e?.message ?? 'تعذر إتمام العملية';

export function PaymentsPage() {
  const [tab, setTab] = useState<'requests' | 'accounts'>('requests');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<Account | null>(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [form, setForm] = useState<any>({ providerTitle: '', accountHolder: '', accountNumber: '', currency: 'YER_OLD', instructions: '', qrCodeUrl: '', isActive: true, order: 0 });

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentResponse, accountResponse] = await Promise.all([
        api.get('/payments', { params: { status: statusFilter || undefined, page: 1, limit: 50 } }),
        api.get('/payments/accounts/all'),
      ]);
      const result = unwrap(paymentResponse.data);
      const paymentList: Payment[] = Array.isArray(result) ? result : result?.payments ?? [];
      const accountResult = unwrap(accountResponse.data);
      const accountList: Account[] = Array.isArray(accountResult) ? accountResult : accountResult?.accounts ?? [];
      setPayments(paymentList.map(payment => ({ ...payment, paymentAccount: accountList.find(account => account.id === payment.paymentAccountId) })));
    }
    catch (e) { setMessage(errorText(e)); }
    finally { setLoading(false); }
  }, [statusFilter]);
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/payments/accounts/all'); const result = unwrap(data); setAccounts(Array.isArray(result) ? result : result?.accounts ?? []); }
    catch (e) { setMessage(errorText(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { setMessage(''); if (tab === 'requests') void loadPayments(); else void loadAccounts(); }, [tab, loadPayments, loadAccounts]);

  const decide = async (payment: Payment, action: 'approve' | 'reject') => {
    let reason = '';
    if (action === 'reject') { reason = window.prompt('سبب رفض طلب الدفع:')?.trim() ?? ''; if (!reason) return; }
    setBusy(payment.id); setMessage('');
    try { await api.patch(`/payments/${payment.id}/${action}`, action === 'reject' ? { reason } : undefined); setMessage(action === 'approve' ? 'تم اعتماد الدفع وتفعيل التسجيل.' : 'تم رفض طلب الدفع.'); await loadPayments(); }
    catch (e) { setMessage(errorText(e)); }
    finally { setBusy(null); }
  };

  const openAccount = (account?: Account) => { setEditing(account ?? null); setAccountFormOpen(true); setForm(account ? { ...account } : { providerTitle: '', accountHolder: '', accountNumber: '', currency: 'YER_OLD', instructions: '', qrCodeUrl: '', isActive: true, order: 0 }); };
  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage('');
    try {
      if (editing) await api.patch(`/payments/accounts/${editing.id}`, form);
      else await api.post('/payments/accounts', form);
      setEditing(null); setAccountFormOpen(false); setMessage('تم حفظ حساب الدفع.'); await loadAccounts();
    } catch (err) { setMessage(errorText(err)); }
  };
  const updateAccount = async (account: Account, patch: Partial<Account>) => {
    setBusy(account.id); setMessage('');
    try { await api.patch(`/payments/accounts/${account.id}`, patch); await loadAccounts(); }
    catch (e) { setMessage(errorText(e)); }
    finally { setBusy(null); }
  };

  return <section dir="rtl" className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-slate-900">المدفوعات والحسابات</h2><p className="mt-1 text-sm text-slate-500">مراجعة إيصالات الطلاب وإدارة حسابات استقبال الرسوم.</p></div><button onClick={() => tab === 'requests' ? void loadPayments() : void loadAccounts()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold"><RefreshCw size={16}/> تحديث</button></header>
    <div className="flex gap-2"><button onClick={() => setTab('requests')} className={`rounded-xl px-4 py-2 font-bold ${tab === 'requests' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'}`}><ReceiptText className="inline ml-2" size={17}/>طلبات الدفع</button><button onClick={() => setTab('accounts')} className={`rounded-xl px-4 py-2 font-bold ${tab === 'accounts' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'}`}><WalletCards className="inline ml-2" size={17}/>الحسابات والمحافظ</button></div>
    {message && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{message}</div>}
    {tab === 'requests' ? <><div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4"><label className="text-sm font-bold">حالة الدفع</label><select className="rounded-lg border px-3 py-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">الكل</option><option value="PENDING">قيد المراجعة</option><option value="APPROVED">معتمد</option><option value="REJECTED">مرفوض</option></select><span className="mr-auto text-sm text-slate-500">{payments.length} طلب</span></div>
      {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل طلبات الدفع…</div> : payments.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">لا توجد طلبات دفع لهذه الحالة.</div> : <div className="space-y-4">{payments.map(p => { const studentProfile = p.student; const student = studentProfile?.user ?? studentProfile; const receipt = p.receiptUrl ?? p.receiptImageUrl; return <article key={p.id} className="grid gap-4 rounded-2xl border bg-white p-4 lg:grid-cols-[1fr_220px]"><div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900">{student?.name ?? 'طالب'}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{p.status}</span><span className="text-xs text-slate-500">#{p.id}</span></div><div className="grid gap-2 text-sm sm:grid-cols-2"><p><b>المقرر:</b> {p.course?.title ?? '—'}</p><p><b>المبلغ:</b> {p.amount ?? '—'} {p.currency ?? ''}</p><p><b>الحساب:</b> {p.paymentAccount?.providerTitle ?? (p.paymentAccountId ? `حساب #${p.paymentAccountId}` : '—')} ({p.paymentAccount?.currency ?? p.currency ?? '—'})</p><p><b>رقم العملية:</b> {p.transactionNumber ?? '—'}</p><p><b>التسجيل:</b> {p.enrollment?.status ?? (p.status === 'APPROVED' ? 'ACTIVE' : 'غير مفعّل')}</p><p><b>البريد:</b> {student?.email ?? '—'}</p><p><b>الرقم الأكاديمي:</b> {studentProfile?.academicId ?? '—'}</p><p><b>الصف الدراسي:</b> {studentProfile?.grade ?? '—'}</p><p><b>تاريخ الطلب:</b> {p.createdAt ? new Date(p.createdAt).toLocaleString('ar') : '—'}</p><p><b>تاريخ اعتماد التسجيل:</b> {p.reviewedAt ? new Date(p.reviewedAt).toLocaleString('ar') : '—'}</p></div>{p.notes && <p className="rounded-lg bg-slate-50 p-3 text-sm"><b>ملاحظات الطالب:</b> {p.notes}</p>}{p.rejectionReason && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700"><b>سبب الرفض:</b> {p.rejectionReason}</p>}{['PENDING','pending'].includes(p.status) && <div className="flex gap-2"><button disabled={busy === p.id} onClick={() => void decide(p, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Check className="inline ml-1" size={16}/>اعتماد الدفع</button><button disabled={busy === p.id} onClick={() => void decide(p, 'reject')} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50"><X className="inline ml-1" size={16}/>رفض</button></div>}</div>{receipt ? <a href={receipt} target="_blank" rel="noreferrer" className="block"><img src={receipt} alt="إيصال التحويل" className="h-44 w-full rounded-xl border bg-slate-50 object-contain"/><span className="mt-1 block text-center text-xs font-bold text-emerald-700">فتح صورة الإيصال</span></a> : <div className="flex h-44 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">لا توجد صورة إيصال</div>}</article>; })}</div>}</> : <>
      <div className="flex justify-end"><button onClick={() => openAccount()} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"><Plus className="inline ml-2" size={17}/>إضافة حساب</button></div>
      {accountFormOpen && <form onSubmit={saveAccount} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">{[['providerTitle','البنك أو مزود الدفع'],['accountHolder','اسم صاحب الحساب'],['accountNumber','رقم الحساب'],['qrCodeUrl','رابط QR'],['instructions','تعليمات الدفع']].map(([key,label])=><label key={key} className="text-sm font-bold text-slate-700">{label}<input required={['providerTitle','accountHolder','accountNumber'].includes(key)} value={form[key] ?? ''} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>)}<label className="text-sm font-bold">العملة<select value={form.currency ?? ''} onChange={e=>setForm({...form,currency:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2">{currencies.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-sm font-bold">ترتيب العرض<input type="number" value={form.order ?? 0} onChange={e=>setForm({...form,order:Number(e.target.value)})} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/>نشط</label><div className="flex items-center gap-2"><button className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white">حفظ</button><button type="button" onClick={()=>setAccountFormOpen(false)} className="rounded-lg border px-4 py-2">إلغاء</button></div></form>}
      {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل الحسابات…</div> : accounts.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">لم تتم إضافة حسابات دفع.</div> : <div className="grid gap-4 md:grid-cols-2">{accounts.map(a=><article key={a.id} className="space-y-3 rounded-2xl border bg-white p-4"><div className="flex items-start justify-between"><div><h3 className="font-extrabold">{a.providerTitle}</h3><p className="text-sm text-slate-500">{a.accountHolder} · {a.accountNumber}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-extrabold text-blue-800">{a.currency ?? 'جميع العملات'}</span></div>{a.qrCodeUrl && <img src={a.qrCodeUrl} alt="رمز الدفع QR" className="h-32 w-32 rounded-lg border object-contain"/>}{a.instructions && <p className="text-sm text-slate-600">{a.instructions}</p>}<div className="flex items-center justify-between border-t pt-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.isActive} disabled={busy===a.id} onChange={e=>void updateAccount(a,{isActive:e.target.checked})}/>نشط</label><span className="text-xs text-slate-500">ترتيب {a.order}</span><button onClick={()=>openAccount(a)} className="rounded-lg border px-3 py-1.5 text-sm font-bold">تعديل</button></div></article>)}</div>}
    </>}
  </section>;
}
