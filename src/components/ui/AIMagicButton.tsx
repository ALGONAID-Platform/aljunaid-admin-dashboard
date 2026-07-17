import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIMagicButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  tooltip?: string;
  className?: string;
}

export function AIMagicButton({ onClick, loading, label = 'ذكاء اصطناعي', tooltip = 'توليد تلقائي', className = '' }: AIMagicButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={tooltip}
      className={`relative group overflow-hidden px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      style={{
        background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #D946EF)',
        color: 'white'
      }}
    >
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
      
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      <span className="tracking-wide">{label}</span>
    </button>
  );
}
