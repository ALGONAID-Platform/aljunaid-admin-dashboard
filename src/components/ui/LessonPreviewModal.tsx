import React, { useEffect, useState } from 'react';
import { X, PlayCircle, FileText, FileType2 } from 'lucide-react';
import type { Lesson } from '../../types';
import { lessonService } from '../../services/api/lessons.api';

function youtubeEmbedUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.endsWith('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
  } catch { /* Render malformed or non-YouTube URLs as direct video links. */ }
  return null;
}

export function LessonPreviewModal({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const [pdfFiles, setPdfFiles] = useState(lesson.pdfFiles ?? []);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfUploadProgress, setPdfUploadProgress] = useState<{ percent: number; loaded: number; total: number } | null>(null);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    let active = true;
    setPdfFiles(lesson.pdfFiles ?? []);
    setPdfBusy(true);
    void lessonService.getPdfs(String(lesson.id)).then(items => { if (active) setPdfFiles(items); }).catch((err: any) => { if (active) setPdfError(err?.message || 'تعذر تحميل المرفقات'); }).finally(() => { if (active) setPdfBusy(false); });
    return () => { active = false; };
  }, [lesson.id, lesson.pdfFiles]);

  const refreshPdfs = async () => {
    setPdfFiles(await lessonService.getPdfs(String(lesson.id)));
  };

  const attachUrl = async () => {
    let parsed: URL;
    try { parsed = new URL(pdfUrl.trim()); } catch { setPdfError('أدخل رابط PDF صحيحاً.'); return; }
    if (!['http:', 'https:'].includes(parsed.protocol)) { setPdfError('يجب أن يبدأ الرابط بـ http أو https.'); return; }
    setPdfBusy(true);
    try {
      await lessonService.addPdf(String(lesson.id), { title: pdfTitle.trim() || pdfUrl.trim().split('/').pop() || `PDF ${pdfFiles.length + 1}`, url: pdfUrl.trim(), order: pdfFiles.length });
      setPdfTitle(''); setPdfUrl(''); setPdfError(''); await refreshPdfs();
    } catch (err: any) { setPdfError(err?.message || 'تعذر إضافة الملف'); }
    finally { setPdfBusy(false); }
  };

  const attachFiles = async (files: File[]) => {
    setPdfBusy(true);
    try {
      let nextOrder = pdfFiles.length;
      let validationError = '';
      for (const file of files) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { validationError = `الملف ${file.name} ليس بصيغة PDF`; continue; }
        setPdfUploadProgress({ percent: 0, loaded: 0, total: file.size });
        await lessonService.addPdf(String(lesson.id), { file, title: file.name.replace(/\.pdf$/i, ''), order: nextOrder++ }, setPdfUploadProgress);
      }
      setPdfError(validationError); await refreshPdfs();
    } catch (err: any) { setPdfError(err?.message || 'تعذر رفع الملف'); }
    finally { setPdfBusy(false); }
  };

  const deletePdf = async (pdfId: string) => {
    setPdfBusy(true);
    try { await lessonService.deletePdf(String(lesson.id), pdfId); setPdfError(''); await refreshPdfs(); }
    catch (err: any) { setPdfError(err?.message || 'تعذر حذف الملف'); }
    finally { setPdfBusy(false); }
  };

  const orderedPdfs = pdfFiles.length ? [...pdfFiles].sort((a, b) => a.order - b.order) : lesson.pdfUrl ? [{ title: 'مستند مرفق (PDF)', url: lesson.pdfUrl, order: 0 }] : [];
  const hasContent = !!(lesson.content || lesson.videoUrl || orderedPdfs.length);
  const videoEmbedUrl = youtubeEmbedUrl(lesson.videoUrl);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-6 transition-all animate-in fade-in duration-200">
      <div className="bg-white w-full h-full sm:max-h-[90vh] sm:max-w-4xl rounded-none sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">وضع معاينة الطالب</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">{lesson.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800 shadow-sm touch-target shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 mb-4 px-2">المادة العلمية المرفقة</h3>
          
          <div className="space-y-4">
            {!hasContent ? (
              <div className="text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400 font-medium text-sm">
                لا يوجد محتوى مدرج في هذا الدرس حالياً.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                
                {lesson.videoUrl && (
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner bg-blue-50 text-blue-600">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">مقطع مرئي</h4>
                    </div>
                    <a href={lesson.videoUrl} target="_blank" rel="noreferrer" dir="ltr" className="mb-3 block break-all text-sm font-semibold text-blue-700 hover:underline">
                      {lesson.videoUrl}
                    </a>
                    {videoEmbedUrl
                      ? <iframe title={`فيديو ${lesson.title}`} src={videoEmbedUrl} className="aspect-video w-full rounded-2xl border-4 border-slate-100 bg-slate-900" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                      : <video controls preload="metadata" src={lesson.videoUrl} className="aspect-video w-full rounded-2xl border-4 border-slate-100 bg-slate-900">تعذر تشغيل الفيديو. <a href={lesson.videoUrl} target="_blank" rel="noreferrer">افتح الفيديو</a></video>}
                  </div>
                )}
                {orderedPdfs.map((pdf, index) => (
                  <div key={pdf.id ?? `${pdf.url}-${index}`} className="mt-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-red-700">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <FileType2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">{pdf.title || `مستند PDF ${index + 1}`} · الترتيب {pdf.order + 1}</div>
                      <div className="text-xs text-red-500/80 truncate font-mono mt-1" dir="ltr">{pdf.url}</div>
                    </div>
                    <a href={pdf.url} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-white rounded-xl text-sm font-bold border border-red-200 shadow-sm hover:bg-red-50 transition-colors shrink-0 text-center sm:mr-auto">عرض المستند</a>
                    {pdf.id && <button type="button" disabled={pdfBusy} onClick={() => void deletePdf(String(pdf.id))} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50">حذف</button>}
                  </div>
                ))}
                <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-bold text-slate-700">إدارة ملفات PDF</h4>
                  {pdfBusy && <p role="status" className="text-xs text-slate-500">جارٍ تحميل أو تحديث المرفقات…</p>}
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <input value={pdfTitle} onChange={e => setPdfTitle(e.target.value)} placeholder="عنوان الملف (اختياري)" className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm sm:min-w-40" />
                    <input value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="رابط PDF موجود" dir="ltr" className="w-full min-w-0 flex-[2] rounded-lg border border-slate-200 bg-white p-2 text-sm sm:min-w-48" />
                    <button type="button" disabled={!pdfUrl.trim() || pdfBusy} onClick={() => void attachUrl()} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">إضافة رابط</button>
                    <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700">{pdfBusy ? 'جارٍ العمل…' : 'رفع PDF'}<input type="file" accept="application/pdf,.pdf" multiple disabled={pdfBusy} className="hidden" onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (files.length) void attachFiles(files); }} /></label>
                  </div>
                  {pdfUploadProgress && <div role="status" aria-live="polite" className="space-y-1">
                    <div role="progressbar" aria-label="تقدم رفع ملف PDF" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pdfUploadProgress.percent} className="h-2 overflow-hidden rounded bg-slate-200">
                      <div className="h-full rounded bg-emerald-600 transition-[width] duration-200" style={{ width: `${pdfUploadProgress.percent}%` }} />
                    </div>
                    <p className="text-xs text-slate-600">{pdfBusy ? 'جارٍ رفع ملف PDF' : 'اكتمل رفع ملف PDF'} · {pdfUploadProgress.percent}% · {(pdfUploadProgress.loaded / 1024 / 1024).toFixed(1)} / {(pdfUploadProgress.total / 1024 / 1024).toFixed(1)} MB</p>
                  </div>}
                  {pdfError && <p role="alert" className="text-xs font-semibold text-red-600">{pdfError}</p>}
                </div>
              </div>
            )}
          </div>
          {lesson.content && <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><FileText className="h-5 w-5" /></div><h4 className="text-sm font-bold text-slate-800">محتوى نصي</h4></div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-medium leading-relaxed text-slate-700">{lesson.content}</div>
          </div>}
          <div className="mt-6 bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-50">نبذة عن الدرس</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{lesson.description || 'لا يوجد وصف متاح.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
