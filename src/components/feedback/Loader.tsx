import { Loader2 } from 'lucide-react';

interface LoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function Loader({ text = 'جارٍ التحميل...', size = 'md', fullPage = false }: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className={`${sizeMap[size]} animate-spin text-emerald-500`} />
      {text && <p style={{ fontSize: 14 }}>{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-64">
        {content}
      </div>
    );
  }

  return content;
}
