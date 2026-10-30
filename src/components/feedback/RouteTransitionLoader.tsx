import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';

/**
 * RouteTransitionLoader
 * Displays a sleek top progress bar and a floating loading pill
 * whenever the user navigates between pages/routes across the dashboard.
 */
export function RouteTransitionLoader() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(75), 80);
    const t2 = setTimeout(() => setProgress(100), 220);
    const t3 = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 420);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname, location.search]);

  if (!loading) return null;

  return (
    <div className="pointer-events-none transition-opacity duration-200">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-slate-100/40">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.8)] transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Floating loading pill badge */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
        <div className="flex items-center gap-2.5 bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-slate-750/90">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
          <span className="text-xs font-bold tracking-wide">جارٍ تحميل الصفحة...</span>
        </div>
      </div>
    </div>
  );
}
