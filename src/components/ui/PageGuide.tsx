import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Lightbulb, CheckCircle2, BookOpen } from 'lucide-react';

interface GuideStep {
  title: string;
  description: string;
  icon?: React.ElementType;
}

interface PageGuideProps {
  title?: string;
  description?: string;
  steps: GuideStep[];
  tips?: string[];
}

export const PageGuide: React.FC<PageGuideProps> = ({ 
  title = "دليل الاستخدام السريع", 
  description = "إليك شرح مبسط لكيفية استخدام هذه الصفحة والاستفادة من كافة ميزاتها بكفاءة.", 
  steps, 
  tips 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all shadow-sm group font-bold text-sm"
        >
          <HelpCircle className="w-4 h-4 text-emerald-500 group-hover:rotate-12 transition-transform" />
          <span>{title}</span>
          <ChevronDown className="w-4 h-4 text-slate-400 mr-2" />
        </button>
      ) : (
        <div className="bg-white border-2 border-emerald-100 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300">
          {/* Decorative background element */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{description}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 text-slate-500 rounded-xl transition-all shadow-sm text-sm font-bold shrink-0"
            >
              إغلاق الدليل
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                خطوات العمل الأساسية
              </h4>
              <div className="space-y-4 border-r-2 border-slate-100 pr-4">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="relative">
                      <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-white" />
                      <div className="flex items-start gap-3">
                        {Icon && (
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                            <Icon className="w-4 h-4 text-emerald-600" />
                          </div>
                        )}
                        <div>
                          <h5 className="font-bold text-slate-800 text-sm">{step.title}</h5>
                          <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {tips && tips.length > 0 && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 h-fit">
                <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-4">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  نصائح وتلميحات هامة
                </h4>
                <ul className="space-y-3">
                  {tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs font-medium text-slate-600 leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
