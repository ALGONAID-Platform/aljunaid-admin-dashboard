import React from 'react';
import { Clock, Edit3, CheckCircle, CalendarDays, User } from 'lucide-react';

interface ActivityLogProps {
  createdAt?: string | Date;
  updatedAt?: string | Date;
  publishedAt?: string | Date | null;
  isPublished?: boolean;
}

export function ActivityLog({ createdAt, updatedAt, publishedAt, isPublished }: ActivityLogProps) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">سجل النشاط</h4>
      
      <div className="relative border-r-2 border-slate-100 pr-4 space-y-4">
        {/* Created */}
        <div className="relative">
          <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white shadow-sm"></div>
          <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 mb-0.5">
            <User className="w-3.5 h-3.5 text-slate-400" /> تم الإنشاء بواسطة النظام
          </p>
          <p className="text-[10px] text-slate-400 font-mono" dir="ltr">
            {createdAt ? new Date(createdAt).toLocaleString('en-GB') : 'غير متوفر'}
          </p>
        </div>

        {/* Updated */}
        {updatedAt && updatedAt !== createdAt && (
          <div className="relative">
            <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white shadow-sm"></div>
            <p className="text-[11px] font-bold text-blue-700 flex items-center gap-1.5 mb-0.5">
              <Edit3 className="w-3.5 h-3.5 text-blue-500" /> آخر تعديل
            </p>
            <p className="text-[10px] text-slate-400 font-mono" dir="ltr">
              {new Date(updatedAt).toLocaleString('en-GB')}
            </p>
          </div>
        )}

        {/* Status / Scheduled */}
        <div className="relative">
          <div className={`absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${isPublished ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
          <p className={`text-[11px] font-bold flex items-center gap-1.5 mb-0.5 ${isPublished ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isPublished ? (
              <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> تم النشر</>
            ) : (
              <><Clock className="w-3.5 h-3.5 text-amber-500" /> مسودة (مُجدولة لاحقاً)</>
            )}
          </p>
          <p className="text-[10px] text-slate-400 font-mono" dir="ltr">
            {publishedAt ? new Date(publishedAt).toLocaleString('en-GB') : (isPublished ? 'نشط' : 'قيد الانتظار')}
          </p>
        </div>
      </div>
    </div>
  );
}
