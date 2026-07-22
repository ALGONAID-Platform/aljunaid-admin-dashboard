import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Trash2, X, Loader2, CheckCircle2, AlertCircle, 
  Layers, BookMarked, FileText, ClipboardList, HelpCircle, FileVideo, FileType2, RefreshCw
} from 'lucide-react';
import { calculateDeletionImpact, type EntityType, type DeletionImpact } from '../../services/deletion/deletionTree.service';
import { executeCascadeDelete, type CascadeDeleteResult } from '../../services/deletion/cascadeDelete.service';

interface CascadeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (impact: DeletionImpact) => void;
  targetType: EntityType;
  targetId: string;
  customTitle?: string;
}

const TYPE_NAMES: Record<EntityType, string> = {
  course: 'مقرر دراسي',
  module: 'وحدة تعليمية',
  lesson: 'درس تعليمي',
  quiz: 'اختبار تقييمي',
  question: 'سؤال تقييمي',
  content: 'محتوى رقمي',
};

export const CascadeDeleteModal: React.FC<CascadeDeleteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetType,
  targetId,
  customTitle,
}) => {
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (isOpen && targetId) {
      const computedImpact = calculateDeletionImpact(targetType, targetId);
      setImpact(computedImpact);
      setError(null);
      setIsDeleting(false);
      setConfirmInput('');
      setStage('');
    }
  }, [isOpen, targetType, targetId]);

  if (!isOpen || !impact) return null;

  const totalDescendants = 
    impact.modulesCount + 
    impact.lessonsCount + 
    impact.contentsCount + 
    impact.quizzesCount + 
    impact.questionsCount;

  const requiresStrictConfirm = totalDescendants > 3;

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setError(null);

    const result: CascadeDeleteResult = await executeCascadeDelete(
      targetType,
      targetId,
      (currentStage) => setStage(currentStage)
    );

    setIsDeleting(false);

    if (result.success) {
      if (onSuccess) onSuccess(result.impact);
      onClose();
    } else {
      setError(result.error || 'حدث خطأ أثناء تنفيذ الحذف النهائي.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all animate-in fade-in duration-200" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="bg-white rounded-t-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden border border-red-100 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-red-50 bg-red-50/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100/80 rounded-2xl flex items-center justify-center text-red-600 shadow-inner shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                  حذف تراكمي
                </span>
                {impact.isDraft && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    مسودة
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-xl font-black text-slate-800 mt-1 truncate">
                تأكيد حذف {customTitle || impact.targetTitle}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isDeleting}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 disabled:opacity-50 touch-target shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 shadow-sm animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-bold leading-relaxed">{error}</div>
            </div>
          )}

          {/* Danger Warning Alert */}
          <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-4 text-amber-900">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm leading-relaxed">
              <p className="font-bold mb-1">تنبيه حرج للسلامة التراكمية (Cascading Safety Notice)</p>
              <p className="opacity-90">
                حذف <strong>"{impact.targetTitle}"</strong> ({TYPE_NAMES[targetType]}) سيقوم تلقائياً بحذف جميع العناصر والملفات والتقييمات التابعة له بشكل نهائي دون إبقاء أي سجلات معلقة.
              </p>
            </div>
          </div>

          {/* Dynamic Impact Grid Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>تأثير الحذف على الكيانات المرتبطة (Impact Summary)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {targetType === 'course' && (
                <ImpactPill label="الوحدات التعليمية" value={impact.modulesCount} icon={Layers} color="#8B5CF6" bg="#F5F3FF" />
              )}
              
              {(targetType === 'course' || targetType === 'module') && (
                <ImpactPill label="الدروس" value={impact.lessonsCount} icon={BookMarked} color="#3B82F6" bg="#EFF6FF" />
              )}

              <ImpactPill label="المحتوى الرقمي" value={impact.contentsCount} icon={FileText} color="#6366F1" bg="#EEF2FF" />
              <ImpactPill label="الاختبارات" value={impact.quizzesCount} icon={ClipboardList} color="#10B981" bg="#ECFDF5" />
              <ImpactPill label="الأسئلة والإجابات" value={impact.questionsCount} icon={HelpCircle} color="#06B6D4" bg="#ECFEFF" />
              <ImpactPill label="الملفات والوسائط" value={impact.mediaFilesCount} icon={FileVideo} color="#EC4899" bg="#FDF2F8" />
              {impact.draftsCount > 0 && (
                <ImpactPill label="المسودات التابعة" value={impact.draftsCount} icon={AlertCircle} color="#F59E0B" bg="#FFFBEB" />
              )}
            </div>
          </div>

          {/* Execution Progress Bar */}
          {isDeleting && (
            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-sm font-bold text-blue-800">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  {stage || 'جاري تنفيذ عملية الحذف التراكمي...'}
                </span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-pulse w-full" />
              </div>
            </div>
          )}

          {/* Safety Confirm Input for Large Deletions */}
          {requiresStrictConfirm && !isDeleting && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-600">
                للتأكيد الفائق، يرجى كتابة <span className="text-red-600 font-black font-mono">حذف</span> في الحقل أدناه:
              </label>
              <input 
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="اكتب حذف لتأكيد الحذف"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 outline-none text-sm font-bold transition-colors"
              />
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all disabled:opacity-50 text-sm"
          >
            إلغاء الأمر
          </button>

          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting || (requiresStrictConfirm && confirmInput.trim() !== 'حذف')}
            className="px-8 py-3 rounded-xl text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-md hover:shadow-lg active:scale-95 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري تنفيذ الحذف...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                حذف نهائي وشامل ({totalDescendants + 1} عناصر)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

function ImpactPill({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: any; color: string; bg: string }) {
  return (
    <div className={`p-3 rounded-xl border border-slate-100 flex items-center gap-3 bg-white shadow-sm`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bg, color: color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[10px] font-bold text-slate-400">{label}</div>
        <div className="text-sm font-black text-slate-800">{value}</div>
      </div>
    </div>
  );
}
