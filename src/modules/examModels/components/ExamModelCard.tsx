import { useState } from 'react';
import { 
  FileText, Edit3, Trash2, Eye, 
  Calendar, MoreVertical, ExternalLink
} from 'lucide-react';
import type { ExamModel } from '../../../types/examModel.types';

interface ExamModelCardProps {
  examModel: ExamModel;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onEdit: (examModel: ExamModel) => void;
  onDelete: (id: string) => void;
  onPreview: (examModel: ExamModel) => void;
}

export function ExamModelCard({
  examModel,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onPreview,
}: ExamModelCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`bg-white rounded-3xl border transition-all duration-300 group flex flex-col relative overflow-hidden ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
          : 'border-slate-100 hover:border-slate-200 hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {examModel.grade && (
              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-purple-50 text-purple-700 border-purple-200">
                {examModel.grade}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-red-50 text-red-600">
              <FileText className="w-3.5 h-3.5" />
              ملف PDF
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(examModel.id as string)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
              >
                ✓
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors md:hidden"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-slate-100 shadow-xl rounded-2xl py-2 z-10 md:hidden">
                  <button
                    onClick={() => { setShowMenu(false); onPreview(examModel); }}
                    className="w-full text-right px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4 text-slate-400" /> معاينة
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onEdit(examModel); }}
                    className="w-full text-right px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4 text-emerald-500" /> تعديل
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onDelete(examModel.id as string); }}
                    className="w-full text-right px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> حذف
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 leading-tight mb-2 group-hover:text-emerald-600 transition-colors">
          {examModel.title}
        </h3>
        
        <p className="text-sm text-slate-500 leading-relaxed mb-5 line-clamp-2 min-h-[40px]">
          {examModel.description || 'لا يوجد وصف للنموذج'}
        </p>

        <div className="space-y-2 mt-auto pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>تاريخ الإضافة: {new Date(examModel.createdAt).toLocaleDateString('ar-EG')}</span>
          </div>
          {examModel.courseName && (
             <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
               <span className="w-4 h-4 flex items-center justify-center bg-slate-100 rounded-sm text-[10px] text-slate-400">📚</span>
               <span>المقرر: {examModel.courseName}</span>
             </div>
          )}
        </div>

        <div className="pt-4 flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onPreview(examModel)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4" /> معاينة
          </button>
          <button
            type="button"
            onClick={() => onEdit(examModel)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-colors"
          >
            <Edit3 className="w-4 h-4" /> تعديل
          </button>
          <button
            type="button"
            onClick={() => onDelete(examModel.id as string)}
            className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors shrink-0"
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
