import { useState, useRef, useEffect } from 'react';
import { 
  Plus, FileText, X, Loader2, CheckCircle, Video, Image, Link, 
  FileType2, Upload, Trash2, Edit3, Wifi, FileWarning, AlertCircle, 
  RefreshCw, Settings2, FolderOpen
} from 'lucide-react';
import { useLessonsStore, useContentStore } from '../../../store';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Loader } from '../../../components/feedback/Loader';
import { classifyUploadError, validatePdfFile, type UploadProgress, type UploadError } from '../../../services/api/upload.api';
import type { ContentType } from '../../../types';

const TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ElementType; color: string; bg: string; accept: string; maxMB: number; mode: 'url' | 'file' | 'both' }> = {
  video: { label: 'مقطع فيديو', icon: Video, color: '#3B82F6', bg: '#EFF6FF', accept: '', maxMB: 0, mode: 'url' },
  pdf: { label: 'مستند PDF', icon: FileType2, color: '#EF4444', bg: '#FEF2F2', accept: '.pdf', maxMB: 50, mode: 'file' },
  word: { label: 'محتوى نصي', icon: FileText, color: '#6366F1', bg: '#EEF2FF', accept: '', maxMB: 0, mode: 'url' },
  image: { label: 'صورة', icon: Image, color: '#10B981', bg: '#ECFDF5', accept: '', maxMB: 0, mode: 'url' },
  link: { label: 'رابط خارجي', icon: Link, color: '#8B5CF6', bg: '#F5F3FF', accept: '', maxMB: 0, mode: 'url' },
};

interface FormState {
  lessonId: string;
  title: string;
  description: string;
  type: ContentType;
  file: File | null;
  url: string;
  uploadMethod: 'file' | 'url';
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

  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [form, setForm] = useState<FormState>({ lessonId: '', title: '', description: '', type: 'video', file: null, url: '', uploadMethod: 'url' });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetModal = () => { 
    setForm({ lessonId: '', title: '', description: '', type: 'video', file: null, url: '', uploadMethod: 'url' }); 
    setErrors({}); 
    setUploadStatus('idle'); 
    setUploadError(null);
    setUploadProgress(null);
    setEditingId(null);
    setDragOver(false); 
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = (file: File) => {
    const cfg = TYPE_CONFIG[form.type];

    if (cfg.accept === '.pdf') {
      const validationError = validatePdfFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }
    }
    
    setForm(p => ({ ...p, file, url: '' }));
    setUploadError(null);
    setErrors(p => { const x = { ...p }; delete x.file; return x; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.lessonId) e.lessonId = 'يرجى تحديد الدرس المرتبط';
    if (!form.title.trim()) e.title = 'عنوان المحتوى مطلوب للتعريف به';
    const cfg = TYPE_CONFIG[form.type];
    
    const isUrlMode = cfg.mode === 'url' || (cfg.mode === 'both' && form.uploadMethod === 'url');
    
    if (isUrlMode) {
      if (!form.url.trim()) e.url = 'الرابط مطلوب';
      else if (!form.url.startsWith('http')) e.url = 'الرابط غير صالح. تأكد من البداية بـ http:// أو https://';
      else if (form.url.startsWith('blob:')) e.url = 'عذراً، روابط Blob غير مدعومة. يرجى توفير رابط حقيقي.';
    } else {
      if (!form.file && !editingId) e.file = 'يجب إرفاق ملف لرفعه'; 
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
      const cfg = TYPE_CONFIG[form.type];
      const isUrlMode = cfg.mode === 'url' || (cfg.mode === 'both' && form.uploadMethod === 'url');
      
      const onProgress = (evt: any) => {
        if (evt.total) {
          setUploadProgress({
            loaded: evt.loaded,
            total: evt.total,
            percent: Math.round((evt.loaded * 100) / evt.total)
          });
        }
      };

      const payload = {
        lessonId: form.lessonId,
        lessonTitle: lesson.title,
        title: form.title.trim(),
        type: form.type,
        file: !isUrlMode ? (form.file ?? undefined) : undefined,
        url: isUrlMode ? form.url.trim() : undefined,
      };

      if (editingId) {
        await useContentStore.getState().updateContent(editingId, payload, onProgress);
      } else {
        await addContent(payload, onProgress);
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
        {(['all', ...Object.keys(TYPE_CONFIG)] as (ContentType | 'all')[]).map(type => {
          const isAll = type === 'all';
          const count = isAll ? content.length : content.filter(c => c.type === type).length;
          const active = filterType === type;
          const cfg = !isAll ? TYPE_CONFIG[type as ContentType] : null;
          
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
            const cfg = TYPE_CONFIG[item.type];
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
                  {item.fileName && <div className="text-xs font-semibold text-slate-600 truncate flex items-center gap-1.5"><FileType2 className="w-3.5 h-3.5 text-slate-400" /> {item.fileName}</div>}
                  {item.fileSize && <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-slate-400" /> حجم الملف: {item.fileSize}</div>}
                  {item.url && <div className="text-xs font-semibold text-blue-600 truncate flex items-center gap-1.5" dir="ltr"><Link className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {item.url}</div>}
                  {!item.fileName && !item.url && <div className="text-xs text-slate-400">لا توجد تفاصيل إضافية</div>}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    {new Date(item.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {
                      setEditingId(item.id);
                      setForm({ lessonId: item.lessonId, title: item.title, description: '', type: item.type, file: null, url: item.url || '', uploadMethod: item.url ? 'url' : 'file' });
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {(Object.entries(TYPE_CONFIG) as [ContentType, typeof TYPE_CONFIG[ContentType]][]).map(([type, cfg]) => {
                      const isActive = form.type === type;
                      return (
                        <button 
                          key={type} 
                          type="button" 
                          onClick={() => setForm(p => ({ ...p, type, file: null, url: '', uploadMethod: cfg.mode === 'file' ? 'file' : 'url' }))} 
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

                {TYPE_CONFIG[form.type].mode === 'both' && (
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                    <button 
                      type="button"
                      onClick={() => setForm(p => ({ ...p, uploadMethod: 'url' }))}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${form.uploadMethod === 'url' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      رابط خارجي (يوتيوب / درايف)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setForm(p => ({ ...p, uploadMethod: 'file' }))}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${form.uploadMethod === 'file' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      رفع ملف من الجهاز
                    </button>
                  </div>
                )}

                {(TYPE_CONFIG[form.type].mode === 'url' || (TYPE_CONFIG[form.type].mode === 'both' && form.uploadMethod === 'url')) ? (
                  <Field label="الرابط المباشر (URL)" required error={errors.url}>
                    <input value={form.url} onChange={e => { setForm(p => ({ ...p, url: e.target.value })); setErrors(p => { const x = { ...p }; delete x.url; return x; }); }} placeholder="https://example.com/..." className={inputCls(!!errors.url, 'font-mono text-left')} dir="ltr" />
                  </Field>
                ) : (
                  <Field label={editingId && !form.file ? "تحديث وتغيير الملف (اختياري)" : "إرفاق الملف"} required={!editingId} error={errors.file}>
                    <input ref={fileRef} type="file" accept={TYPE_CONFIG[form.type].accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    
                    {uploadProgress && uploadStatus === 'uploading' && (
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-4">
                        <ProgressBar progress={uploadProgress} />
                      </div>
                    )}
                    
                    {form.file ? (
                      <div className="flex items-center gap-4 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl shadow-sm">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                          {(() => { const cfg = TYPE_CONFIG[form.type]; return <cfg.icon className="w-6 h-6" style={{ color: cfg.color }} />; })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-800 font-bold text-sm truncate mb-0.5">{form.file.name}</div>
                          <div className="text-slate-500 text-xs font-mono bg-white px-2 py-0.5 rounded w-max border border-slate-100">{(form.file.size / (1024 * 1024)).toFixed(2)} MB</div>
                        </div>
                        <button type="button" onClick={() => { setForm(p => ({ ...p, file: null })); if (fileRef.current) fileRef.current.value = ''; }} className="w-10 h-10 rounded-xl bg-white border border-red-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center shadow-sm">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }} 
                        onDragLeave={() => setDragOver(false)} 
                        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }} 
                        onClick={() => fileRef.current?.click()} 
                        className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-emerald-500 bg-emerald-50/50' : (errors.file ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-emerald-400')}`} 
                      >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${dragOver ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm border border-slate-200 text-slate-400'}`}>
                          <Upload className="w-8 h-8" />
                        </div>
                        <p className="text-slate-700 font-bold text-base mb-1">
                          قم بإسقاط الملف هنا أو <span className="text-emerald-600 underline underline-offset-4">تصفح جهازك</span>
                        </p>
                        <p className="text-slate-500 font-medium text-xs">
                          الامتدادات المقبولة: {TYPE_CONFIG[form.type].accept} (بحجم لا يتجاوز {TYPE_CONFIG[form.type].maxMB} ميجابايت)
                        </p>
                      </div>
                    )}
                  </Field>
                )}
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
