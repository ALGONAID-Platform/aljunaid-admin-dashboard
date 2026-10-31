import { useEffect, useState } from 'react';
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  HardDrive,
  RefreshCw,
  Plus,
  Upload,
  Clock,
  FileText,
  KeyRound,
  X,
  Layers,
  Search,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { backupService, type BackupItem, type VerifyBackupResult, type RestoreBackupResult } from '../../../services/api/backup.api';

export function DatabaseBackupPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search filter
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  // Create Backup Form
  const [createFormat, setCreateFormat] = useState<'json' | 'sql'>('json');
  const [createNote, setCreateNote] = useState('');
  const [creating, setCreating] = useState(false);

  // Restore Form
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccessReport, setRestoreSuccessReport] = useState<RestoreBackupResult['details'] | null>(null);

  // Verification State
  const [verifyingFileName, setVerifyingFileName] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerifyBackupResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Deleting state
  const [deletingFileName, setDeletingFileName] = useState<string | null>(null);

  // Fetch Backups List
  useEffect(() => {
    let active = true;
    setLoading(true);

    backupService
      .list()
      .then((items) => {
        if (!active) return;
        setBackups(items);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err?.response?.data?.message || err?.message || 'تعذر جلب قائمة النسخ الاحتياطية';
        toast.error(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Handle Create Backup
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const toastId = toast.loading('جاري تجهيز وتوليد النسخة الاحتياطية وحساب البصمة...');

    try {
      const backup = await backupService.create({
        format: createFormat,
        note: createNote.trim() || undefined,
      });

      toast.success(`تم إنشاء النسخة الاحتياطية بنجاح (${backup.formattedSize})`, { id: toastId });
      setIsCreateOpen(false);
      setCreateNote('');
      setCreateFormat('json');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل إنشاء النسخة الاحتياطية';
      toast.error(msg, { id: toastId });
    } finally {
      setCreating(false);
    }
  };

  // Handle Verify Backup
  const handleVerifyBackup = async (fileName: string) => {
    setVerifyingFileName(fileName);
    setVerifying(true);
    const toastId = toast.loading('جاري فحص سلامة الملف ومطابقة البصمة...');

    try {
      const res = await backupService.verify(fileName);
      setVerificationResult(res);
      setIsVerifyOpen(true);
      if (res.valid) {
        toast.success('النسخة سليمة ومتكاملة 100%', { id: toastId });
      } else {
        toast.error(res.message, { id: toastId });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'تعذر فحص النسخة';
      toast.error(msg, { id: toastId });
    } finally {
      setVerifying(false);
      setVerifyingFileName(null);
    }
  };

  // Handle Download
  const handleDownload = async (fileName: string) => {
    const toastId = toast.loading(`جاري تحميل ${fileName}...`);
    try {
      await backupService.download(fileName);
      toast.success('تم بدء التحميل بنجاح', { id: toastId });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل تحميل الملف';
      toast.error(msg, { id: toastId });
    }
  };

  // Open Restore Modal
  const openRestoreModal = (fileName?: string) => {
    setSelectedBackupForRestore(fileName || null);
    setRestoreFile(null);
    setConfirmPassword('');
    setRestoreSuccessReport(null);
    setIsRestoreOpen(true);
  };

  // Handle Execute Restore
  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBackupForRestore && !restoreFile) {
      toast.error('يرجى تحديد ملف للنسخة الاحتياطية');
      return;
    }

    setRestoring(true);
    const toastId = toast.loading('جاري أخذ نسخة وقائية تلقائية والبدء في استرجاع قاعدة البيانات...');

    try {
      const res = await backupService.restore({
        fileName: selectedBackupForRestore || undefined,
        file: restoreFile || undefined,
        confirmPassword: confirmPassword.trim() || undefined,
      });

      toast.success(res.message, { id: toastId, duration: 6000 });
      setRestoreSuccessReport(res.details);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشلت عملية الاسترجاع';
      toast.error(msg, { id: toastId, duration: 8000 });
    } finally {
      setRestoring(false);
    }
  };

  // Handle Delete
  const handleDelete = async (fileName: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف النسخة الاحتياطية (${fileName}) نهائياً من السيرفر؟`)) {
      return;
    }

    setDeletingFileName(fileName);
    const toastId = toast.loading('جاري الحذف...');

    try {
      await backupService.delete(fileName);
      toast.success('تم حذف النسخة الاحتياطية بنجاح', { id: toastId });
      setBackups((prev) => prev.filter((b) => b.fileName !== fileName));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل حذف النسخة الاحتياطية';
      toast.error(msg, { id: toastId });
    } finally {
      setDeletingFileName(null);
    }
  };

  // Filtered backups by search
  const filteredBackups = backups.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.fileName.toLowerCase().includes(q) ||
      (b.note && b.note.toLowerCase().includes(q)) ||
      (b.format && b.format.toLowerCase().includes(q))
    );
  });

  const latestBackup = backups.length > 0 ? backups[0] : null;

  return (
    <div dir="rtl" className="space-y-6 pb-12 font-sans">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
            <Database className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              النسخ الاحتياطي لقاعدة البيانات
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              إنشاء نسخ احتياطية كاملة وتصديرها، واسترجاع البيانات بأمان تام مع دعم الحماية الوقائية التلقائية.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="تحديث القائمة"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            type="button"
            onClick={() => openRestoreModal()}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-2.5 text-sm font-bold text-amber-800 shadow-sm transition hover:bg-amber-100"
          >
            <Upload className="h-4 w-4" />
            <span>استرجاع من ملف</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-lg"
          >
            <Plus className="h-5 w-5" />
            <span>نسخ احتياطي الآن</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Backups */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي النسخ المحفوظة</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{backups.length} <span className="text-sm font-normal text-slate-400">نسخة</span></p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <HardDrive className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Last Backup */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">آخر نسخة احتياطية</p>
            <p className="mt-2 text-base font-bold text-slate-800">
              {latestBackup ? new Date(latestBackup.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'لا توجد نسخ بعد'}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Safety Net */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">الشبكة الوقائية التلقائية</p>
            <p className="mt-2 text-sm font-black text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              نسخ وقائي قبل أي استرجاع
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث باسم الملف أو الملاحظة..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-10 pl-4 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      {/* Backups Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            سجل النسخ الاحتياطية المتوفرة
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
            {filteredBackups.length} ملف
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
            <p className="mt-3 text-sm font-bold text-slate-600">جاري قراءة ملفات النسخ الاحتياطية...</p>
          </div>
        ) : filteredBackups.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
              <Database className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-700">لا توجد نسخ احتياطية مطابقة</h3>
            <p className="mt-1 text-sm text-slate-400">
              {search ? 'لم نجد أي ملف يطابق كلمة البحث.' : 'اضغط على زر "نسخ احتياطي الآن" لإنشاء أول نسخة من قاعدة البيانات.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5">اسم النسخة / الوصف</th>
                  <th className="px-6 py-3.5">التاريخ والوقت</th>
                  <th className="px-6 py-3.5">الحجم والصيغة</th>
                  <th className="px-6 py-3.5">إحصائية السجلات</th>
                  <th className="px-6 py-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBackups.map((item) => {
                  const isPreRestore = item.fileName.startsWith('pre-restore');
                  return (
                    <tr key={item.fileName} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Note */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isPreRestore ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isPreRestore ? <RotateCcw className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-mono text-xs font-bold text-slate-900 ltr text-right" dir="ltr">
                              {item.fileName}
                            </p>
                            {item.note ? (
                              <p className="mt-0.5 text-xs text-slate-500 font-medium">{item.note}</p>
                            ) : isPreRestore ? (
                              <p className="mt-0.5 text-xs text-amber-600 font-semibold">نسخة أمان تلقائية وقائية</p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Size & Format */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">{item.formattedSize}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${item.format === 'sql' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {item.format || 'json'}
                          </span>
                        </div>
                      </td>

                      {/* Records & Tables count */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.totalRecords > 0 ? (
                          <div className="text-xs">
                            <span className="font-bold text-slate-800">{item.totalRecords.toLocaleString()}</span>
                            <span className="text-slate-400 mr-1">سجل في</span>
                            <span className="font-bold text-slate-800 mr-1">{item.tablesCount}</span>
                            <span className="text-slate-400 mr-1">جدول</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Verify Button */}
                          <button
                            type="button"
                            onClick={() => handleVerifyBackup(item.fileName)}
                            disabled={verifying && verifyingFileName === item.fileName}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
                            title="فحص والتأكد من سلامة النسخة"
                          >
                            <FileCheck className={`h-3.5 w-3.5 text-blue-600 ${verifying && verifyingFileName === item.fileName ? 'animate-spin' : ''}`} />
                            <span>فحص</span>
                          </button>

                          {/* Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownload(item.fileName)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
                            title="تحميل الملف إلى جهازك"
                          >
                            <Download className="h-3.5 w-3.5 text-emerald-600" />
                            <span>تحميل</span>
                          </button>

                          {/* Restore Button */}
                          <button
                            type="button"
                            onClick={() => openRestoreModal(item.fileName)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 shadow-sm transition hover:bg-amber-100"
                            title="استرجاع قاعدة البيانات من هذه النسخة"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                            <span>استرجاع</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.fileName)}
                            disabled={deletingFileName === item.fileName}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="حذف من السيرفر"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. Modal: Create Backup                                  */}
      {/* ======================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-600" />
                إنشاء نسخة احتياطية جديدة
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBackup} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">صيغة الملف</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateFormat('json')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                      createFormat === 'json'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>JSON (الموصى به عالمياً)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateFormat('sql')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                      createFormat === 'sql'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Database className="h-4 w-4" />
                    <span>SQL (أوامر SQL مباشرة)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظة أو وصف توضيحي (اختياري)</label>
                <input
                  type="text"
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                  placeholder="مثال: نسخة قبل ترقية النظام وتحديث المقررات"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 font-medium">
                💡 سيقوم السيرفر بنسخ جميع الجداول، وحساب بصمة SHA-256 وحفظ الملف بأمان في مجلد النسخ الاحتياطية.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>{creating ? 'جاري الإنشاء...' : 'بدء النسخ الاحتياطي'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. Modal: Restore Backup                                 */}
      {/* ======================================================== */}
      {isRestoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 text-amber-600">
                <RotateCcw className="h-5 w-5" />
                استرجاع قاعدة البيانات
              </h3>
              <button
                type="button"
                onClick={() => setIsRestoreOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {restoreSuccessReport ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                  <h4 className="mt-2 text-base font-black text-emerald-900">تم استرجاع قاعدة البيانات بنجاح!</h4>
                  <p className="mt-1 text-xs text-emerald-700">
                    تم استرجاع {restoreSuccessReport.totalRecordsRestored.toLocaleString()} سجل عبر {restoreSuccessReport.tablesRestored} جدول وتمت إعادة ضبط العدادات بالكامل.
                  </p>
                </div>

                {restoreSuccessReport.preRestoreSnapshot && (
                  <div className="rounded-xl bg-blue-50 p-3 border border-blue-200 text-xs text-blue-800">
                    🛡️ <strong>النسخة الوقائية المحفوظة:</strong> تم أخذ لقطة فورية من البيانات السابقة قبل الاسترجاع باسم:
                    <div className="font-mono text-[11px] mt-1 text-blue-900 ltr text-left bg-blue-100/60 p-1.5 rounded">
                      {restoreSuccessReport.preRestoreSnapshot}
                    </div>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRestoreOpen(false);
                      setRestoreSuccessReport(null);
                    }}
                    className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white hover:bg-emerald-700"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteRestore} className="mt-5 space-y-4">
                {/* Warning Alert */}
                <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-black">تنبيه هام ومصيري:</p>
                    <p className="leading-relaxed">
                      هذه العملية ستقوم باستبدال كافة الجداول الحالية في قاعدة البيانات ببيانات النسخة المحددة.
                      <strong className="block text-emerald-800 mt-1">
                        🔒 كإجراء أمان تلقائي، سيقوم السيرفر بأخذ نسخة وقائية فورية من البيانات الحالية قبل الاسترجاع.
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Source Selection */}
                {selectedBackupForRestore ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الملف المحدد للاسترجاع</label>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono text-slate-800">
                      <span>{selectedBackupForRestore}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedBackupForRestore(null)}
                        className="text-xs text-blue-600 font-bold hover:underline"
                      >
                        تغيير
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رفع ملف نسخة من جهازك (.json أو .sql)</label>
                    <input
                      type="file"
                      accept=".json,.sql"
                      onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                )}

                {/* Password Confirmation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                    تأكيد كلمة مرور حساب المالك (Owner Password)
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور لتأكيد العملية بأمان"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">تأكيد كلمة المرور يمنع أي استرجاع غير مصرح به أو بالخطأ.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRestoreOpen(false)}
                    disabled={restoring}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={restoring}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:bg-amber-700 disabled:opacity-50"
                  >
                    {restoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    <span>{restoring ? 'جاري الاسترجاع الآمن...' : 'تأكيد واسترجاع الآن'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. Modal: Verification Details                           */}
      {/* ======================================================== */}
      {isVerifyOpen && verificationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 text-blue-600">
                <FileCheck className="h-5 w-5" />
                تقرير فحص سلامة النسخة الاحتياطية
              </h3>
              <button
                type="button"
                onClick={() => setIsVerifyOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className={`p-4 rounded-2xl border flex items-center gap-3 ${verificationResult.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                {verificationResult.valid ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />}
                <div>
                  <h4 className="text-sm font-black">{verificationResult.message}</h4>
                  <p className="text-xs opacity-80 mt-0.5">
                    {verificationResult.checksumMatched ? 'بصمة التشفير الرقمية (SHA-256) مطابقة وسليمة 100%' : 'تنبيه: لا يوجد تطابق للبصمة أو تم تعديل الملف يدوياً.'}
                  </p>
                </div>
              </div>

              {/* Checksum display */}
              {verificationResult.checksum && (
                <div>
                  <span className="text-[11px] font-bold text-slate-500">بصمة التشفير (SHA-256 Checksum):</span>
                  <div className="mt-1 p-2 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-700 break-all select-all">
                    {verificationResult.checksum}
                  </div>
                </div>
              )}

              {/* Table breakdown */}
              {verificationResult.tableRecords && Object.keys(verificationResult.tableRecords).length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-slate-400" /> إحصائية الجداول المحفوظة:</span>
                    <span className="text-emerald-700 font-mono">{verificationResult.totalRecords.toLocaleString()} سجل إجمالي</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 text-xs divide-y divide-slate-100">
                    {Object.entries(verificationResult.tableRecords).map(([table, cnt]) => (
                      <div key={table} className="flex items-center justify-between py-1.5 px-2">
                        <span className="font-bold text-slate-800">{table}</span>
                        <span className="font-mono text-slate-600 font-semibold">{cnt.toLocaleString()} سجل</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setIsVerifyOpen(false)}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  إغلاق التقرير
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
