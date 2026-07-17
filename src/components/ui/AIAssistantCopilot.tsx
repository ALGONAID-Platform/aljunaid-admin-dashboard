import React, { useState, useEffect } from 'react';
import { Bot, X, Sparkles, BrainCircuit, TrendingUp, Tags, FileText, AlertTriangle, ShieldAlert, ChevronDown, CheckCircle2 } from 'lucide-react';

export function AIAssistantCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'audit' | 'recommendations'>('insights');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnalyzing(true);
      const t = setTimeout(() => setIsAnalyzing(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isOpen, activeTab]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100 animate-bounce-slow'}`}
        style={{ background: 'linear-gradient(135deg, #6366F1, #D946EF)' }}
      >
        <Bot className="w-7 h-7" />
        <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
      </button>

      {/* Copilot Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[110] w-[380px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(99,102,241,0.2)] border border-indigo-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 slide-in-from-right-8 duration-300">
          
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">المساعد الذكي (AI Copilot) <Sparkles className="w-3.5 h-3.5 text-yellow-300" /></h3>
                <p className="text-[10px] text-indigo-100 font-medium tracking-wide">تحليلات، توصيات، وتدقيق آلي للمحتوى</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            {[
              { id: 'insights', label: 'رؤى الأداء', icon: TrendingUp },
              { id: 'recommendations', label: 'توصيات', icon: Tags },
              { id: 'audit', label: 'تدقيق الجودة', icon: ShieldAlert },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1.5 transition-colors relative ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="p-5 h-[420px] overflow-y-auto custom-scrollbar bg-slate-50/30">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-indigo-400">
                <BrainCircuit className="w-12 h-12 animate-pulse text-indigo-300" />
                <p className="text-sm font-bold animate-pulse text-indigo-500">جاري تحليل البيانات عبر الذكاء الاصطناعي...</p>
                <div className="flex gap-1">
                   <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                
                {activeTab === 'insights' && (
                  <>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> تنبؤ تفاعل الطلاب (Student Engagement)</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        بناءً على طول مقاطع الفيديو (متوسط 14 دقيقة) وتوزيع النصوص، يتوقع النظام <strong className="text-emerald-600">تفاعلاً بنسبة 85%</strong>. يُنصح بإضافة ملفات PDF لدرس "مقدمة البرمجة" لرفع التفاعل.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2"><Bot className="w-4 h-4 text-blue-500" /> رؤى المعلمين (Teacher Insights)</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        معظم الدروس تُنشر في أيام الأحد. يوصى بنشر ملخصات في منتصف الأسبوع (الأربعاء) للحفاظ على استمرارية التعلم.
                      </p>
                    </div>
                  </>
                )}

                {activeTab === 'recommendations' && (
                  <>
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full -z-10"></div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-indigo-500" /> اقتراح محتوى مكمل (Smart Content)</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">
                        درس "أساسيات قواعد البيانات" يفتقر لاختبار قصير. يمكنني إنشاء مسودة أسئلة لك تلقائياً.
                      </p>
                      <button className="w-full py-2 text-[11px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors">
                        توليد اختبار تلقائي (Beta)
                      </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm relative overflow-hidden">
                       <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-3"><Tags className="w-4 h-4 text-purple-500" /> التصنيف التلقائي (Auto Tagging)</h4>
                       <div className="flex flex-wrap gap-1.5 mb-3">
                         {['#برمجة', '#مبتدئين', '#أساسيات_الويب', '#NextJS', '#قواعد_بيانات'].map(tag => (
                           <span key={tag} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-medium border border-purple-100">{tag}</span>
                         ))}
                       </div>
                       <p className="text-[11px] text-slate-400">تم اقتراح هذه الوسوم بناءً على محتوى فيديوهاتك الأخيرة.</p>
                    </div>
                  </>
                )}

                {activeTab === 'audit' && (
                  <>
                    <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-red-500" /> رصد التكرار (Duplicate Detection)</h4>
                      <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-red-800 mb-1">يوجد تشابه بنسبة 92% بين:</p>
                          <ul className="text-[10px] text-red-700 space-y-1 list-disc list-inside">
                            <li>مقرر "مبادئ الرياضيات" (الوحدة 2)</li>
                            <li>مقرر "الرياضيات التأسيسية" (الوحدة 1)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> جودة المحتوى (Content Scoring)</h4>
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-xs text-slate-500 font-bold">معدل الجودة العام</span>
                         <span className="text-xs font-black text-emerald-600">88/100</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">الأوصاف طويلة واضحة، والفيديوهات عالية الدقة. استمر!</p>
                    </div>
                  </>
                )}
                
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
