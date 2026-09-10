import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { mediaApi } from '../../../services/api/media.api';

interface Props {
  imageUrl?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
}

function resolveImageSrc(url: string): string {
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  const configuredBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://api.exchangesmangement.online/api/v1';
  const baseUrl = configuredBaseUrl.replace(/\/api\/v1\/?$/, '');
  return `${baseUrl}/${url.replace(/^\/+/, '')}`;
}

export function QuestionImageUpload({ imageUrl, onImageUploaded, onImageRemoved }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);
    setLastFile(file);

    try {
      const response = await mediaApi.uploadImage(file, (evt) => {
        setProgress(evt.percent);
      });
      
      const rawUrl = response.data?.url;
      if (rawUrl) {
        onImageUploaded(rawUrl);
      } else {
        throw new Error('لم يتم إرجاع رابط الصورة من الخادم');
      }
    } catch (err: any) {
      console.error("Upload error caught:", err);
      setError(err.message || "حدث خطأ غير معروف أثناء رفع الصورة");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="mt-3">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png, image/webp" onChange={onFileChange} />

      {error && (
        <div className="flex items-center gap-2 p-2 mb-2 bg-red-50 text-red-600 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4" /> <span>{error}</span>
          {lastFile && (
            <button type="button" onClick={() => void validateAndUpload(lastFile)} className="mr-auto flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-red-100 hover:bg-red-100 transition-colors">
              <RefreshCw className="w-3 h-3" /> إعادة
            </button>
          )}
        </div>
      )}

      {imageUrl && !isUploading ? (
        <div className="relative group border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2" style={{ maxHeight: 200 }}>
          <img src={resolveImageSrc(imageUrl)} alt="Question visual" className="max-h-40 object-contain rounded-lg" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white text-slate-700 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="استبدال الصورة">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onImageRemoved} className="p-2 bg-white text-slate-700 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors" title="إزالة الصورة">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : isUploading ? (
        <div className="border-2 border-dashed border-emerald-200 bg-emerald-50 rounded-xl p-6 flex flex-col items-center justify-center text-emerald-600">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-sm font-medium mb-2">جاري الرفع... {progress}%</span>
          <div className="w-full max-w-xs h-1.5 bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-500'
            }`}
        >
          <UploadCloud className="w-6 h-6 mb-2" />
          <span className="text-xs font-medium text-center">انقر أو اسحب لإرفاق صورة (اختياري)</span>
          <span className="text-[10px] opacity-70 mt-1 text-center">JPG, PNG, WEBP (الحد الأقصى 5MB)</span>
        </div>
      )}
    </div>
  );
}
