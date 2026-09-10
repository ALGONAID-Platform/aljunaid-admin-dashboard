import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Link as LinkIcon, Code, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMediaStore } from '../../../store/media.store';

export default function MediaPage() {
  const { isUploading, uploadImage } = useMediaStore();
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (uploadResult?.url) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [uploadResult]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    setUploadResult(null);

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('حجم الملف يتجاوز 50MB');
      return;
    }

    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      setErrorMsg('يسمح برفع الصور فقط (JPG, PNG, GIF, WEBP)');
      return;
    }

    try {
      console.log("🚀 جاري رفع الملف:", file.name);
      setUploadProgress(0);
      
      const onProgress = (evt: any) => {
        if (evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(percent);
        }
      };

      const result = await uploadImage(file, onProgress);
      console.log("✅ اكتمل الرفع! النتيجة القادمة من الباك إند هي:", result);
      
      const finalResult = (result as any).data ? (result as any).data : result;
      
      if (finalResult && finalResult.url) {
        setUploadResult(finalResult);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error('الخادم لم يرجع رابط الصورة');
      }
    } catch (err: any) {
      console.error("❌ فشل الرفع:", err);
      setErrorMsg(err.message || 'فشل رفع الصورة');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">استضافة الصور (Image Hosting)</h1>
        <p className="text-slate-500 mt-2">قم برفع الصور واستخدام الروابط المباشرة في أي مكان.</p>
      </div>

      <div className="space-y-6">

        {/* Upload Section */}
        <div
          className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[2rem] transition-all duration-200 ease-in-out
            ${dragActive ? 'border-emerald-500 bg-emerald-50/50 scale-[1.02]' : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50'}
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg, image/png, image/webp, image/gif"
            className="hidden"
            onChange={handleChange}
          />

          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 animate-spin opacity-20" />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-700">
                  {uploadProgress}%
                </span>
              </>
            ) : (
              <UploadCloud className="w-10 h-10" />
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {isUploading ? 'جاري رفع الملف...' : 'قم بسحب وإفلات الصورة هنا'}
          </h3>
          <p className="text-slate-500 mb-8 text-center font-medium">يدعم JPG, PNG, WEBP, GIF حتى 50 ميغابايت</p>
          
          {isUploading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full max-w-sm mb-6 animate-in fade-in">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-3.5 bg-white border-2 border-emerald-500 text-emerald-600 font-bold text-lg rounded-xl hover:bg-emerald-50 transition-colors shadow-sm"
          >
            اختيار صورة من الجهاز
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-center font-bold">
            {errorMsg}
          </div>
        )}

        {/* تعديل شرط النجاح ليعتمد على وجود الرابط url */}
        {uploadResult && uploadResult.url && (
          <div ref={resultRef} className="p-6 bg-white border border-emerald-200 shadow-sm rounded-3xl animate-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">

              {/* Image Preview Thumbnail */}
              <div className="w-full sm:w-1/3 aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img src={uploadResult.url} alt="Uploaded" className="w-full h-full object-cover" />
              </div>

              <div className="w-full sm:w-2/3 space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-lg mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                  <span>تم رفع الصورة بنجاح!</span>
                </div>

                <CopyAction
                  label="الرابط المباشر (Direct URL)"
                  text={uploadResult.url}
                  id="url"
                  icon={<LinkIcon className="w-4 h-4" />}
                  copySuccess={copySuccess}
                  onCopy={copyToClipboard}
                />
                <CopyAction
                  label="كود Markdown"
                  text={`![صورة](${uploadResult.url})`}
                  id="md"
                  icon={<Code className="w-4 h-4" />}
                  copySuccess={copySuccess}
                  onCopy={copyToClipboard}
                />
                <CopyAction
                  label="Markdown مع رابط"
                  text={`[![صورة](${uploadResult.url})](${uploadResult.url})`}
                  id="md_link"
                  icon={<Code className="w-4 h-4" />}
                  copySuccess={copySuccess}
                  onCopy={copyToClipboard}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponent for copy actions
function CopyAction({ label, text, id, icon, copySuccess, onCopy }: { label: string, text: string, id: string, icon: React.ReactNode, copySuccess: string | null, onCopy: (text: string, id: string) => void }) {
  const isCopied = copySuccess === id;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
        {icon}
        {label}
      </div>
      <div className="flex">
        <div className="flex-1 bg-white border border-slate-200 border-l-0 rounded-r-xl px-3 py-2 text-xs font-mono text-slate-500 overflow-x-hidden whitespace-nowrap text-left dir-ltr">
          {text}
        </div>
        <button
          onClick={() => onCopy(text, id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-l-xl text-xs font-bold border transition-colors ${isCopied
            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
        >
          {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'تم النسخ' : 'نسخ'}
        </button>
      </div>
    </div>
  );
}