import React from 'react';
import { X, PlayCircle, FileText, FileType2 } from 'lucide-react';
import type { Lesson } from '../../types';

export function LessonPreviewModal({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const hasContent = !!(lesson.content || lesson.videoUrl || lesson.pdfUrl);

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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-50">نبذة عن الدرس</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{lesson.description || 'لا يوجد وصف متاح.'}</p>
          </div>

          <h3 className="text-sm font-bold text-slate-800 mb-4 px-2">المادة العلمية المرفقة</h3>
          
          <div className="space-y-4">
            {!hasContent ? (
              <div className="text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400 font-medium text-sm">
                لا يوجد محتوى مدرج في هذا الدرس حالياً.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                
                {lesson.videoUrl && (
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner bg-blue-50 text-blue-600">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">مقطع مرئي</h4>
                    </div>
                    <div className="aspect-video bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-sm relative overflow-hidden group border-4 border-slate-100">
                       <PlayCircle className="w-16 h-16 text-white opacity-40 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-300" />
                       <div className="absolute bottom-4 right-4 left-4 text-center text-white/50 font-mono text-xs truncate" dir="ltr">{lesson.videoUrl}</div>
                    </div>
                  </div>
                )}

                {lesson.content && (
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner bg-indigo-50 text-indigo-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">محتوى نصي</h4>
                    </div>
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                      {lesson.content}
                    </div>
                  </div>
                )}
                
                {lesson.pdfUrl && (
                  <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-700">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <FileType2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">مستند مرفق (PDF)</div>
                      <div className="text-xs text-red-500/80 truncate font-mono mt-1" dir="ltr">{lesson.pdfUrl}</div>
                    </div>
                    <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-white rounded-xl text-sm font-bold border border-red-200 shadow-sm hover:bg-red-50 transition-colors shrink-0">عرض المستند</a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
