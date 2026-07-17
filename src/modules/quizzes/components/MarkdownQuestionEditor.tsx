import React, { useState, useRef } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, List, ListOrdered, 
  Quote, Code, Table, Link, Image as ImageIcon, Sigma, 
  Eye, Edit, Loader2, AlertCircle, UploadCloud
} from 'lucide-react';
import { quizService } from '../../../services';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
}

export function MarkdownQuestionEditor({ value, onChange, placeholder = 'اكتب نص السؤال باستخدام Markdown...', error }: Props) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertText = (before: string, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    const replacement = before + (selected || '') + after;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    onChange(newValue);
    
    // Reset focus & cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + (selected ? selected.length : 0) + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت.');
      return;
    }

    setIsUploading(true);
    try {
      const url = await quizService.uploadImage(file);
      const imageName = file.name.replace(/\.[^/.]+$/, "");
      insertText(`\n![${imageName}](${url})\n`);
    } catch (err: any) {
      console.error('Image Upload Error:', err);
      alert(`فشل رفع الصورة: ${err.message || 'حدث خطأ أثناء رفع الصورة'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void handleImageFile(e.target.files[0]);
    }
  };

  // Drag and Drop
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const toolbarItems = [
    { icon: Bold, label: 'عريض', action: () => insertText('**', '**') },
    { icon: Italic, label: 'مائل', action: () => insertText('*', '*') },
    { icon: Heading1, label: 'عنوان رئيسي', action: () => insertText('# ', '\n') },
    { icon: Heading2, label: 'عنوان فرعي', action: () => insertText('## ', '\n') },
    { icon: List, label: 'قائمة نقطية', action: () => insertText('\n- ', '\n') },
    { icon: ListOrdered, label: 'قائمة مرقمة', action: () => insertText('\n1. ', '\n') },
    { icon: Quote, label: 'اقتباس', action: () => insertText('\n> ', '\n') },
    { icon: Code, label: 'كود برمجى', action: () => insertText('\n```cpp\n', '\n```\n') },
    { icon: Sigma, label: 'معادلة LaTeX رياضية', action: () => insertText('\n$$\n', '\n$$\n') },
    { icon: Table, label: 'جدول', action: () => insertText('\n| العمود 1 | العمود 2 |\n|---|---|\n| قيمة 1 | قيمة 2 |\n') },
    { icon: Link, label: 'رابط ويب', action: () => insertText('[عنوان الرابط](', ')') },
    { icon: ImageIcon, label: 'إدراج صورة', action: () => fileInputRef.current?.click() },
  ];

  return (
    <div className="w-full flex flex-col rounded-2xl border-2 border-slate-200 bg-white overflow-hidden focus-within:border-emerald-400 transition-colors shadow-sm">
      {/* Editor Tabs & Toolbar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 bg-slate-50/70 p-2 gap-2">
        {/* Toggle tabs */}
        <div className="flex bg-slate-200/60 p-0.5 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'write' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Edit className="w-3.5 h-3.5" />
            تحرير السؤال
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'preview' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            معاينة حية
          </button>
        </div>

        {/* Toolbar (Only visible in edit mode) */}
        {activeTab === 'write' && (
          <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-1">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/jpeg, image/png, image/webp" 
              onChange={handleFileChange} 
            />
            {toolbarItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={item.action}
                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 shadow-sm hover:shadow"
                title={item.label}
              >
                <item.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor Body */}
      <div className="relative min-h-[140px] flex flex-col bg-white">
        {activeTab === 'write' ? (
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className="flex-1 flex flex-col relative"
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="w-full flex-1 px-4 py-3 text-sm leading-relaxed border-none outline-none resize-none placeholder:text-slate-400 select-text"
              style={{ minHeight: '120px' }}
            />
            
            {/* Drag and drop helper overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[1px] border-2 border-dashed border-emerald-500 rounded-b-2xl flex flex-col items-center justify-center text-emerald-700 pointer-events-none transition-all">
                <UploadCloud className="w-10 h-10 animate-bounce mb-2" />
                <span className="text-sm font-bold">اسحب صورتك إلى هنا لرفعها فوراً</span>
              </div>
            )}

            {/* Upload indicator */}
            {isUploading && (
              <div className="absolute bottom-2 left-2 bg-emerald-500/90 text-white rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-md">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري رفع الصورة للخادم...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 flex-1 overflow-y-auto max-h-[350px] bg-slate-50/30">
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <div className="text-slate-400 text-sm italic text-center py-6">اكتب شيئاً في المحرر لتتمكن من معاينته هنا.</div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Error message */}
      {error && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 text-red-600 border-t border-red-150 text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
