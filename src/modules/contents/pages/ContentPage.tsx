import { useState, useRef, useEffect } from 'react';
import { 
  Plus, FileText, X, Loader2, CheckCircle, Video, Image, Link, 
  FileType2, Upload, Trash2, Edit3, Wifi, FileWarning, AlertCircle, 
  RefreshCw, Settings2, FolderOpen
} from 'lucide-react';
import { useLessonsStore, useContentStore } from '../../../store';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Loader } from '../../../components/feedback/Loader';
import { classifyUploadError, type UploadProgress, type UploadError } from '../../../services/api/upload.api';

type LocalContentType = 'video' | 'markdown';

const TYPE_CONFIG: Record<LocalContentType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  video: { label: 'مقطع فيديو', icon: Video, color: '#3B82F6', bg: '#EFF6FF' },
  markdown: { label: 'محتوى نصي (Markdown)', icon: FileText, color: '#6366F1', bg: '#EEF2FF' },
};

interface FormState {
  lessonId: string;
  title: string;
  description: string;
  type: LocalContentType;
  videoUrl: string;
  pdfUrl: string;
  content: string;
}

export function ContentPage() {
  const { lessons, fetchLessons } = useLessonsStore();
  const { content, addContent, deleteContent, fetchContent, error, isLoading } = useContentStore();
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchLessons();
    void fetchContent();
  }, [fetchLessons, fetchContent]);

  const [filterType, setFilterType] = useState<LocalContentType | 'all'>('all');
  const [form, setForm] = useState<FormState>({ lessonId: '', title: '', description: '', type: 'video', videoUrl: '', pdfUrl: '', content: '' });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const resetModal = () => { 
    setForm({ lessonId: '', title: '', description: '', type: 'video', videoUrl: '', pdfUrl: '', content: '' }); 
    setErrors({}); 
    setUploadStatus('idle'); 
    setUploadError(null);
    setUploadProgress(null);
    setEditingId(null);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.lessonId) e.lessonId = 'يرجى تحديد الدرس المرتبط';
    if (!form.title.trim()) e.title = 'عنوان المحتوى مطلوب للتعريف به';
    
    if (form.type === 'video') {
      if (!form.videoUrl.trim()) e.videoUrl = 'رابط يوتيوب مطلوب';
      else if (!form.videoUrl.startsWith('http')) e.videoUrl = 'الرابط غير صالح. تأكد من البداية بـ http:// أو https://';
    } else if (form.type === 'markdown') {
      if (!form.content.trim()) e.content = 'المحتوى النصي مطلوب';
    }

    if (form.pdfUrl.trim() && !form.pdfUrl.startsWith('http')) {
      e.pdfUrl = 'الرابط غير صالح. تأكد من البداية بـ http:// أو https://';
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const lesson = lessons.find(l => l.id === form.lessonId)!;
    setUploadStatus('uploading');
    setUploadError(null);
    setUploadProgress(null);
    
    try {
      const onProgress = (evt: any) => {
        if (evt.total) {
          setUploadProgress({
            loaded: evt.loaded,
            total: evt.total,
            percent: Math.round((evt.loaded * 100) / evt.total)
          });
        }
      };

      const finalPdfUrl = form.pdfUrl.trim() ? form.pdfUrl.trim() : null;

      const payload = {
        lessonId: form.lessonId,
        lessonTitle: lesson.title,
        title: form.title.trim(),
        type: form.type as any,
        videoUrl: form.type === 'video' ? form.videoUrl.trim() : undefined,
        content: form.type === 'markdown' ? form.content.trim() : undefined,
        pdfUrl: finalPdfUrl,
      };

      if (editingId) {
        await useContentStore.getState().updateContent(editingId, payload, onProgress);
      } else {
        await addContent(payload as any, onProgress);
      }
      
      setUploadStatus('success');
      setTimeout(() => { setShowModal(false); resetModal(); }, 1200);
    } catch (err) {
      setUploadStatus('error');
      setUploadError(classifyUploadError(err));
    }
  };

  const filtered = filterType === 'all' ? content : content.filter(c => c.type === filterType);

  if (isLoading && content.length === 0) return <Loader fullPage />;

  return (
    <div className="font-sans antialiased text-slate-800 space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1 flex items-center gap-2">
            مكتبة المحتوى الرقمي
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            إدارة المرفقات، مقاطع الفيديو، ومصادر التعلم المرتبطة بالدروس.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { resetModal(); setShowModal(true); }} 
            className="flex items-center justify-center gap-2 px-6 py-3 text-white rounded-2xl transition-all shadow-md hover:shadow-lg font-bold" 
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            <Plus className="w-5 h-5" strokeWidth={3} /> رفع وإضافة محتوى
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-2 mb-6">
        {(['all', ...Object.keys(TYPE_CONFIG)] as (LocalContentType | 'all')[]).map(type => {
          const isAll = type === 'all';
          const count = isAll ? content.length : content.filter(c => c.type === type).length;
          const active = filterType === type;
          const cfg = !isAll ? TYPE_CONFIG[type as LocalContentType] : null;
          
          return (
            <button 
              key={type} 
              onClick={() => setFilterType(type)} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-bold text-sm shadow-sm ${active ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'}`}
            >
              {cfg && <cfg.icon className="w-4 h-4" style={{ color: active ? '#059669' : cfg.color }} />}
              {!cfg && <FolderOpen className="w-4 h-4 text-emerald-600" />}
              <span>{isAll ? 'الكل' : cfg!.label}</span>
              <span className={`px-2 py-0.5 rounded-md text-xs border ${active ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {error && content.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-red-100 p-12 text-center shadow-xl shadow-red-500/5 flex flex-col items-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-inner">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">تعذر استرداد بيانات المحتوى</h3>
          <p className="text-slate-500 mb-8 max-w-md">{error}</p>
          <button onClick={() => void fetchContent()} className="px-8 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold shadow-md shadow-red-500/20">
            تحديث البيانات
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
          <EmptyState 
            icon={Upload} 
            title="لا يوجد محتوى مدرج" 
            description="قم بإثراء الدروس برفع المذكرات (PDF) أو ربط مقاطع فيديو خارجية." 
            action={
              <button onClick={() => { resetModal(); setShowModal(true); }} className="px-6 py-3 mt-2 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-bold" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                أضف المحتوى الأول
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(item => {
            const cfg = TYPE_CONFIG[item.type as LocalContentType] || TYPE_CONFIG['video'];
            return (
              <div key={item.id} className="bg-white rounded-[20px] border border-slate-100 p-5 flex flex-col h-full hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border" style={{ background: cfg.bg, borderColor: `${cfg.color}30` }}>
                    <cfg.icon className="w-7 h-7" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0 mt-1">
                    <h3 className="text-slate-800 font-bold text-base truncate group-hover:text-emerald-600 transition-colors" title={item.title}>{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 truncate max-w-xs">
                        {item.lessonTitle}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100 flex-1 flex flex-col justify-center gap-1.5">
                  {(item as any).videoUrl && <div className="text-xs font-semibold text-blue-600 truncate flex items-center gap-1.5" dir="ltr"><Link className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {(item as any).videoUrl}</div>}
                  {(item as any).pdfUrl && <div className="text-xs font-semibold text-red-600 truncate flex items-center gap-1.5" dir="ltr"><FileType2 className="w-3.5 h-3.5 text-red-400 shrink-0" /> {(item as any).pdfUrl}</div>}
                  {item.url && !((item as any).videoUrl) && <div className="text-xs font-semibold text-blue-600 truncate flex items-center gap-1.5" dir="ltr"><Link className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {item.url}</div>}
                  {!item.url && !((item as any).videoUrl) && !((item as any).pdfUrl) && <div className="text-xs text-slate-400">لا توجد تفاصيل إضافية</div>}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    {new Date(item.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {
                      setEditingId(item.id);
                      setForm({ 
                        lessonId: item.lessonId, 
                        title: item.title, 
                        description: '', 
                        type: (item.type as LocalContentType) || 'video', 
                        videoUrl: (item as any).videoUrl || item.url || '', 
                        pdfUrl: (item as any).pdfUrl || '', 
                        content: (item as any).content || '' 
                      });
                      setErrors({});
                      setUploadStatus('idle');
                      setUploadError(null);
                      setUploadProgress(null);
                      setShowModal(true);
                    }} className="p-2 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 rounded-lg transition-all shadow-sm" title="تعديل المحتوى">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if(confirm('هل أنت متأكد تماماً من حذف هذا المحتوى بشكل نهائي؟')) deleteContent(item.id); }} className="p-2 text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm" title="حذف المحتوى">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-white rounded-t-[2rem]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm">
                  <Upload className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingId ? 'تحديث وتعديل المحتوى' : 'إرفاق محتوى جديد'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">اربط المحتوى بدرس محدد لتنظيم المادة العلمية.</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); resetModal(); }} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 rounded-xl transition-all border border-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50/50">
              
              {uploadError && <UploadErrorBanner error={uploadError} onRetry={handleSave} />}
              
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                
                <Field label="الدرس المرتبط بالمحتوى" required error={errors.lessonId}>
                  <div className="relative">
                    <select value={form.lessonId} disabled={!!editingId} onChange={e => { setForm(p => ({ ...p, lessonId: e.target.value })); setErrors(p => { const x = { ...p }; delete x.lessonId; return x; }); }} className={`${inputCls(!!errors.lessonId)} ${editingId ? 'bg-slate-100 cursor-not-allowed opacity-70' : ''}`}>
                      <option value="" disabled>الرجاء اختيار الدرس المستهدف...</option>
                      {lessons.map(l => <option key={l.id} value={l.id}>{l.title} — {l.courseName}</option>)}
                    </select>
                  </div>
                </Field>
                
                <Field label="عنوان ووصف المحتوى" required error={errors.title}>
                  <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => { const x = { ...p }; delete x.title; return x; }); }} placeholder="مثال: مذكرة شرح مبادئ التفاضل" className={inputCls(!!errors.title, 'font-bold')} />
                </Field>

                <Field label="نبذة وصفية (اختياري)">
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="أضف أية تعليمات إضافية بخصوص هذا الملف..." rows={2} className={`${inputCls(false)} resize-none text-sm leading-relaxed`} />
                </Field>

              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-1">نوع المادة العلمية <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.entries(TYPE_CONFIG) as [LocalContentType, typeof TYPE_CONFIG[LocalContentType]][]).map(([type, cfg]) => {
                      const isActive = form.type === type;
                      return (
                        <button 
                          key={type} 
                          type="button" 
                          onClick={() => setForm(p => ({ ...p, type, videoUrl: '', pdfUrl: '', content: '' }))} 
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${isActive ? 'shadow-sm' : 'hover:bg-slate-50'}`} 
                          style={isActive ? { background: cfg.bg, borderColor: cfg.color } : { background: '#FAFAFA', borderColor: '#E2E8F0' }}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-white shadow-sm' : ''}`}>
                            <cfg.icon className="w-5 h-5" style={{ color: isActive ? cfg.color : '#94A3B8' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 600, color: isActive ? cfg.color : '#64748B' }}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.type === 'video' && (
                  <Field label="رابط يوتيوب (YouTube URL)" required error={errors.videoUrl}>
                    <input 
                      value={form.videoUrl} 
                      onChange={e => { setForm(p => ({ ...p, videoUrl: e.target.value })); setErrors(p => { const x = { ...p }; delete x.videoUrl; return x; }); }} 
                      placeholder="https://youtube.com/watch?v=..." 
                      className={inputCls(!!errors.videoUrl, 'font-mono text-left')} 
                      dir="ltr" 
                    />
                  </Field>
                )}

                {form.type === 'markdown' && (
                  <Field label="المحتوى النصي (Markdown)" required error={errors.content}>
                    <textarea 
                      value={form.content} 
                      onChange={e => { setForm(p => ({ ...p, content: e.target.value })); setErrors(p => { const x = { ...p }; delete x.content; return x; }); }} 
                      placeholder="اكتب المحتوى هنا..." 
                      rows={6}
                      className={`${inputCls(!!errors.content)} resize-y text-sm leading-relaxed`} 
                    />
                  </Field>
                )}

                <Field label="رابط مستند PDF (Google Drive) - اختياري" error={errors.pdfUrl}>
                  <input 
                    value={form.pdfUrl} 
                    onChange={e => { setForm(p => ({ ...p, pdfUrl: e.target.value })); setErrors(p => { const x = { ...p }; delete x.pdfUrl; return x; }); }} 
                    placeholder="https://drive.google.com/..." 
                    className={inputCls(!!errors.pdfUrl, 'font-mono text-left')} 
                    dir="ltr" 
                  />
                </Field>

              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white rounded-b-[2rem] flex flex-col sm:flex-row gap-3 shrink-0 items-center justify-end">
              <button onClick={() => { setShowModal(false); resetModal(); }} className="px-6 py-3 w-full sm:w-auto text-slate-600 font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-all focus:ring-2 focus:ring-slate-200">
                إلغاء الأمر
              </button>
              <button 
                onClick={handleSave} 
                disabled={uploadStatus === 'uploading' || uploadStatus === 'success'} 
                className="px-8 py-3 w-full sm:w-auto text-white rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg active:scale-95" 
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                {uploadStatus === 'uploading' && <Loader2 className="w-5 h-5 animate-spin" />}
                {uploadStatus === 'success' && <CheckCircle className="w-5 h-5 animate-bounce" />}
                {uploadStatus === 'uploading' ? 'جارٍ المعالجة والرفع...' : uploadStatus === 'success' ? 'تم الحفظ بنجاح!' : editingId ? 'تحديث وتوثيق المحتوى' : 'توثيق واعتماد المحتوى'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component Helpers ────────────────────────────────────────────────────────

function UploadErrorBanner({ error, onRetry }: { error: UploadError; onRetry?: () => void }) {
  const icons: Record<UploadError['type'], React.ElementType> = {
    size: FileWarning,
    format: FileWarning,
    network: Wifi,
    server: AlertCircle,
    unknown: AlertCircle,
  };
  const Icon = icons[error.type];
  return (
    <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-200 rounded-2xl text-red-800 shadow-sm animate-in fade-in">
      <div className="bg-red-100 p-2 rounded-xl shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-red-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold mb-1 leading-tight">{error.message}</p>
        {error.type === 'size' && (
          <p className="text-xs font-medium text-red-600 bg-red-100/50 px-2 py-1 rounded w-max">
            تجاوز الحد الأقصى ({ (error as { maxMB: number }).maxMB } MB)
          </p>
        )}
        {error.type === 'format' && (
          <p className="text-xs font-medium text-red-600 bg-red-100/50 px-2 py-1 rounded w-max">
            الصيغ المسموحة حصراً: { (error as { allowed: string[] }).allowed.join(', ') }
          </p>
        )}
      </div>
      {onRetry && (error.type === 'network' || error.type === 'server') && (
        <button onClick={onRetry} type="button" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-700 rounded-xl hover:bg-red-100 transition-colors shrink-0 shadow-sm font-bold text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> حاول مرة أخرى
        </button>
      )}
    </div>
  );
}

function ProgressBar({ progress }: { progress: UploadProgress }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-blue-700 text-sm font-bold flex items-center gap-1.5">
          <Upload className="w-4 h-4 animate-bounce" /> جاري نقل البيانات...
        </span>
        <span className="text-blue-700 font-black text-lg">{progress.percent}%</span>
      </div>
      <div className="h-3 bg-blue-100 rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
          style={{ width: `${progress.percent}%`, background: 'linear-gradient(90deg, #3B82F6, #2563EB)' }}
        >
          <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_1s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
        </div>
      </div>
      <p className="text-xs font-bold text-blue-500/80 font-mono text-left" dir="ltr">
        {(progress.loaded / 1024 / 1024).toFixed(1)} MB / {(progress.total / 1024 / 1024).toFixed(1)} MB
      </p>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
          {label} {required && <span className="text-red-500 text-lg leading-none mt-1">*</span>}
        </label>
        {error && <span className="text-[11px] font-bold text-red-500 animate-pulse bg-red-50 px-2 py-0.5 rounded-md">{error}</span>}
      </div>
      {children}
    </div>
  );
}

function inputCls(hasError: boolean, extra = '') {
  return `w-full px-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 ${
    hasError 
      ? 'border-red-300 bg-red-50/50 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:bg-white' 
      : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
  } ${extra}`;
}
