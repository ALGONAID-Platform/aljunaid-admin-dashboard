import { useState, useRef, useEffect } from 'react';
import { Plus, FileText, X, Loader2, CheckCircle, Video, Image, Link, FileType2, Upload, Trash2, Edit3 } from 'lucide-react';
import { useLessonsStore, useContentStore } from '../../../store';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { resolveErrorMessage } from '../../../lib/errors';
import type { ContentType } from '../../../types';

// Backend only supports: PDF file uploads (via lesson multipart) and video URLs (as strings)
// Content types:
//   pdf   → uploaded as file via PATCH /lessons/:id (multipart 'pdf' field)
//   video → must be an external URL (YouTube, Vimeo, CDN, etc.)
//   link  → external URL
//   word/image → NOT supported by current backend (will be stored as content text)
const TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ElementType; color: string; bg: string; accept: string; maxMB: number; isUrl: boolean }> = {
  video: { label: 'فيديو (رابط URL)', icon: Video, color: '#3B82F6', bg: '#EFF6FF', accept: '', maxMB: 0, isUrl: true },
  pdf: { label: 'PDF', icon: FileType2, color: '#EF4444', bg: '#FEF2F2', accept: '.pdf', maxMB: 50, isUrl: false },
  word: { label: 'محتوى نصي', icon: FileText, color: '#3B82F6', bg: '#EFF6FF', accept: '', maxMB: 0, isUrl: true },
  image: { label: 'صورة (رابط URL)', icon: Image, color: '#10B981', bg: '#ECFDF5', accept: '', maxMB: 0, isUrl: true },
  link: { label: 'رابط خارجي', icon: Link, color: '#8B5CF6', bg: '#F5F3FF', accept: '', maxMB: 0, isUrl: true },
};

interface FormState {
  lessonId: string;
  title: string;
  description: string;
  type: ContentType;
  file: File | null;
  url: string;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error_net';

export function ContentPage() {
  const { lessons, fetchLessons } = useLessonsStore();
  const { content, addContent, deleteContent, fetchContent, error } = useContentStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    void fetchLessons();
    void fetchContent();
  }, [fetchLessons, fetchContent]);

  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [form, setForm] = useState<FormState>({ lessonId: '', title: '', description: '', type: 'video', file: null, url: '' });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetModal = () => { setForm({ lessonId: '', title: '', description: '', type: 'video', file: null, url: '' }); setErrors({}); setUploadStatus('idle'); setDragOver(false); };

  const handleFile = (file: File) => {
    const cfg = TYPE_CONFIG[form.type];
    if (file.size > cfg.maxMB * 1024 * 1024) { setErrors(p => ({ ...p, file: `حجم الملف يتجاوز الحد الأقصى (${cfg.maxMB}MB)` })); return; }
    setForm(p => ({ ...p, file }));
    setErrors(p => { const x = { ...p }; delete x.file; return x; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.lessonId) e.lessonId = 'يرجى اختيار الدرس';
    if (!form.title.trim()) e.title = 'عنوان المحتوى مطلوب';
    const cfg = TYPE_CONFIG[form.type];
    if (cfg.isUrl) {
      // URL-based types: require a valid http URL
      if (!form.url.trim()) e.url = 'الرابط مطلوب';
      else if (!form.url.startsWith('http')) e.url = 'الرابط غير صالح. يجب أن يبدأ بـ http://';
      else if (form.url.startsWith('blob:')) e.url = 'لا يمكن استخدام روابط blob. أدخل رابطاً خارجياً.';
    } else {
      // File-based types (PDF only)
      if (!form.file) e.file = 'يرجى اختيار ملف PDF';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const lesson = lessons.find(l => l.id === form.lessonId)!;
    setUploadStatus('uploading');
    setUploadError(null);
    try {
      const cfg = TYPE_CONFIG[form.type];
      await addContent({
        lessonId: form.lessonId,
        lessonTitle: lesson.title,
        title: form.title.trim(),
        type: form.type,
        // For file-based types (PDF), pass the File object — backend handles multipart
        file: !cfg.isUrl ? (form.file ?? undefined) : undefined,
        // For URL-based types, pass the URL string
        url: cfg.isUrl ? form.url.trim() : undefined,
      });
      setUploadStatus('success');
      setTimeout(() => { setShowModal(false); resetModal(); }, 1200);
    } catch (err) {
      setUploadStatus('error');
      setUploadError(resolveErrorMessage(err));
    }
  };

  const filtered = filterType === 'all' ? content : content.filter(c => c.type === filterType);

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-slate-800" style={{ fontSize: 20, fontWeight: 700 }}>إدارة المحتوى</h2>
          <p className="text-slate-400" style={{ fontSize: 13 }}>{content.length} عنصر محتوى</p>
        </div>
        <button onClick={() => { resetModal(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', fontSize: 14, fontWeight: 600 }}>
          <Plus className="w-4 h-4" />إضافة محتوى
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all', ...Object.keys(TYPE_CONFIG)] as (ContentType | 'all')[]).map(type => {
          const isAll = type === 'all';
          const count = isAll ? content.length : content.filter(c => c.type === type).length;
          const active = filterType === type;
          const cfg = !isAll ? TYPE_CONFIG[type as ContentType] : null;
          return (
            <button key={type} onClick={() => setFilterType(type)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all" style={active ? { background: '#ECFDF5', borderColor: '#10B981', color: '#059669' } : { background: 'white', borderColor: '#E2E8F0', color: '#64748B' }}>
              {cfg && <cfg.icon className="w-3.5 h-3.5" style={{ color: active ? '#059669' : cfg.color }} />}
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{isAll ? 'الكل' : cfg!.label}</span>
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 11, background: active ? '#D1FAE5' : '#F1F5F9', color: active ? '#059669' : '#94A3B8' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {error && content.length === 0 ? (
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center shadow-sm flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-slate-800 mb-2" style={{ fontSize: 18, fontWeight: 700 }}>فشل تحميل المحتوى</h3>
          <p className="text-slate-500 mb-6" style={{ fontSize: 14 }}>{error}</p>
          <button onClick={() => void fetchContent()} className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Upload} title="لا يوجد محتوى" description="أضف محتوى جديداً للدروس" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const cfg = TYPE_CONFIG[item.type];
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                  <cfg.icon className="w-5 h-5" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-700" style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                  <div className="text-slate-400 flex items-center gap-2" style={{ fontSize: 12 }}>
                    <span>{item.lessonTitle}</span>
                    {item.fileName && <span>· {item.fileName}</span>}
                    {item.fileSize && <span>· {item.fileSize}</span>}
                    {item.url && <span className="truncate max-w-48">· {item.url}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#ECFDF5', color: '#059669' }}>جاهز</span>
                  <span className="text-slate-400" style={{ fontSize: 12 }}>{new Date(item.createdAt).toLocaleDateString('ar-SA')}</span>
                  <button onClick={() => {
                    setForm({ lessonId: item.lessonId, title: item.title, description: '', type: item.type, file: null, url: item.url || '' });
                    setErrors({});
                    setUploadStatus('idle');
                    setShowModal(true);
                  }} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if(confirm('هل أنت متأكد من حذف هذا المحتوى؟')) deleteContent(item.id); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors mr-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-slate-800" style={{ fontSize: 17, fontWeight: 700 }}>{form.url || form.file ? 'تعديل محتوى الدرس' : 'إضافة محتوى للدرس'}</h3>
              <button onClick={() => { setShowModal(false); resetModal(); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {uploadStatus === 'error' && uploadError && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span style={{ fontSize: 13 }}>{uploadError}</span>
                </div>
              )}
              <Field label="الدرس" required error={errors.lessonId}>
                <select value={form.lessonId} onChange={e => { setForm(p => ({ ...p, lessonId: e.target.value })); setErrors(p => { const x = { ...p }; delete x.lessonId; return x; }); }} className={inputCls(!!errors.lessonId)}>
                  <option value="">اختر الدرس...</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.title} ({l.courseName})</option>)}
                </select>
              </Field>
              <Field label="عنوان المحتوى" required error={errors.title}>
                <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => { const x = { ...p }; delete x.title; return x; }); }} placeholder="مثال: فيديو شرح الدرس" className={inputCls(!!errors.title)} />
              </Field>
              <div>
                <label className="block text-slate-700 mb-2" style={{ fontSize: 14, fontWeight: 500 }}>نوع المحتوى <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {(Object.entries(TYPE_CONFIG) as [ContentType, typeof TYPE_CONFIG[ContentType]][]).map(([type, cfg]) => (
                    <button key={type} type="button" onClick={() => setForm(p => ({ ...p, type, file: null, url: '' }))} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all" style={form.type === type ? { background: cfg.bg, borderColor: cfg.color } : { background: '#FAFAFA', borderColor: '#E2E8F0' }}>
                      <cfg.icon className="w-5 h-5" style={{ color: form.type === type ? cfg.color : '#94A3B8' }} />
                      <span style={{ fontSize: 12, fontWeight: form.type === type ? 600 : 400, color: form.type === type ? cfg.color : '#64748B' }}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {TYPE_CONFIG[form.type].isUrl ? (
                <Field label="الرابط الخارجي" required error={errors.url}>
                  <input value={form.url} onChange={e => { setForm(p => ({ ...p, url: e.target.value })); setErrors(p => { const x = { ...p }; delete x.url; return x; }); }} placeholder="https://..." className={inputCls(!!errors.url)} style={{ direction: 'ltr', textAlign: 'right' }} />
                </Field>
              ) : (
                <Field label="رفع الملف" required error={errors.file}>
                  <input ref={fileRef} type="file" accept={TYPE_CONFIG[form.type].accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  {uploadStatus === 'uploading' ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        <span className="text-blue-700" style={{ fontSize: 13 }}>جارٍ الرفع...</span>
                      </div>
                    </div>
                  ) : form.file ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      {(() => { const cfg = TYPE_CONFIG[form.type]; return <cfg.icon className="w-5 h-5 flex-shrink-0" style={{ color: cfg.color }} />; })()}
                      <div className="flex-1 min-w-0"><div className="text-slate-700 truncate" style={{ fontSize: 13, fontWeight: 500 }}>{form.file.name}</div><div className="text-slate-400" style={{ fontSize: 12 }}>{(form.file.size / (1024 * 1024)).toFixed(2)} MB</div></div>
                      <button onClick={() => setForm(p => ({ ...p, file: null }))} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }} onClick={() => fileRef.current?.click()} className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all" style={{ borderColor: dragOver ? '#10B981' : (errors.file ? '#EF4444' : '#E2E8F0'), background: dragOver ? '#F0FDF4' : '#FAFAFA' }}>
                      <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-emerald-400' : 'text-slate-300'}`} />
                      <p className="text-slate-500" style={{ fontSize: 13 }}>اسحب الملف هنا أو <span style={{ color: '#10B981', fontWeight: 600 }}>انقر للرفع</span></p>
                      <p className="text-slate-400" style={{ fontSize: 12 }}>الحد الأقصى: {TYPE_CONFIG[form.type].maxMB} MB</p>
                    </div>
                  )}
                </Field>
              )}
              <Field label="وصف المحتوى">
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="وصف اختياري للمحتوى..." rows={2} className={`${inputCls(false)} resize-none`} />
              </Field>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button onClick={handleSave} disabled={uploadStatus === 'uploading' || uploadStatus === 'success'} className="flex-1 py-3 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', fontSize: 14, fontWeight: 600 }}>
                {uploadStatus === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploadStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                {uploadStatus === 'uploading' ? 'جارٍ الرفع...' : uploadStatus === 'success' ? 'تم الرفع!' : 'حفظ المحتوى'}
              </button>
              <button onClick={() => { setShowModal(false); resetModal(); }} className="px-4 py-3 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" style={{ fontSize: 14 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-slate-700 mb-1.5" style={{ fontSize: 14, fontWeight: 500 }}>{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
      {error && <p className="text-red-500 mt-1" style={{ fontSize: 12 }}>{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-3.5 py-2.5 rounded-xl border outline-none transition-all ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'}`;
}
