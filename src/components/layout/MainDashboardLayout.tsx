import { type ReactNode, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, BookMarked, FileText,
  ClipboardList, Send, LogOut, Menu, Activity, FileSpreadsheet, X, Image as ImageIcon
} from 'lucide-react';
import { useUIStore, useAuthStore } from '../../store';
import { useNavigate, useLocation } from 'react-router';
import { ROUTES } from '../../routes/routes.config';
import { AIAssistantCopilot } from '../ui/AIAssistantCopilot';
import { SaveStatusIndicator } from '../ui/SaveStatusIndicator';
import logo from '../../assets/logo.png';

const NAV_ITEMS = [
  { path: ROUTES.dashboard, icon: LayoutDashboard, label: 'الرئيسية' },
  { path: ROUTES.courses, icon: BookOpen, label: 'المقررات' },
  { path: ROUTES.lessons, icon: BookMarked, label: 'الدروس' },

  { path: ROUTES.quiz, icon: ClipboardList, label: 'الاختبارات' },
  { path: ROUTES.examModels, icon: FileSpreadsheet, label: 'نماذج الامتحانات' },
  { path: ROUTES.publish, icon: Send, label: 'نشر الدروس' },
  { path: ROUTES.media, icon: ImageIcon, label: 'الوسائط' },
  { path: ROUTES.progress, icon: Activity, label: 'التقدم الأكاديمي' },
];

const MOBILE_BOTTOM_NAV = [
  { path: ROUTES.dashboard, icon: LayoutDashboard, label: 'الرئيسية' },
  { path: ROUTES.courses, icon: BookOpen, label: 'المقررات' },
  { path: ROUTES.lessons, icon: BookMarked, label: 'الدروس' },
  { path: ROUTES.quiz, icon: ClipboardList, label: 'الاختبارات' },
  { path: ROUTES.examModels, icon: FileSpreadsheet, label: 'النماذج' },
];

interface MainDashboardLayoutProps {
  children: ReactNode;
}

export function MainDashboardLayout({ children }: MainDashboardLayoutProps) {
  const { isSidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useUIStore();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const currentNavItem = NAV_ITEMS.find((n) => n.path === location.pathname);
  const pageLabel = currentNavItem?.label ?? '';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.innerWidth < 768 && !isSidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarCollapsed, setSidebarCollapsed]);

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <div dir="rtl" className="flex h-screen bg-slate-50 overflow-hidden relative" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Mobile Backdrop */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300" 
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <aside
        style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        className={`bg-white border-l border-slate-200 flex flex-col fixed md:relative z-50 h-full right-0 shadow-2xl md:shadow-none ${
          isSidebarCollapsed 
            ? 'translate-x-full md:translate-x-0 w-[270px] sm:w-[280px] md:w-[80px]' 
            : 'translate-x-0 w-[270px] sm:w-[280px] md:w-[260px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 gap-3 overflow-hidden shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white border border-slate-100">
              <img src={logo} alt="شعار منصة الجنيد" className="w-full h-full object-cover" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-slate-800 font-extrabold text-sm truncate leading-tight">
                  منصة الجنيد
                </div>
                <div className="text-emerald-600 font-bold text-[11px] truncate">
                  التعليمية الذكية
                </div>
              </div>
            )}
          </div>
          {/* Close icon button for mobile drawer */}
          {!isSidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 md:hidden touch-target flex items-center justify-center"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 min-h-[46px] rounded-xl transition-all active:scale-[0.98] ${
                  active
                    ? 'text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                {!isSidebarCollapsed && (
                  <span className="flex-1 text-right truncate text-sm">
                    {item.label}
                  </span>
                )}
                {active && !isSidebarCollapsed && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 shadow-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer Section */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #10B981, #047857)' }}
              >
                {user?.name?.charAt(0) ?? 'م'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-800 font-bold text-xs truncate">
                  {user?.name ?? 'مشرف النظام'}
                </div>
                <div className="text-slate-400 font-medium text-[11px] truncate">
                  {user?.email ?? ''}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all touch-target flex items-center justify-center"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2.5 text-slate-400 hover:text-red-500 transition-colors touch-target items-center"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 flex-shrink-0 z-30 shadow-xs">
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 active:scale-95 transition-all touch-target flex items-center justify-center"
            aria-label="تبديل القائمة"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="min-w-0 flex-1">
            <h1 className="text-slate-900 font-extrabold text-base sm:text-lg truncate tracking-tight">{pageLabel}</h1>
            <p className="text-slate-400 text-xs hidden sm:block truncate">منصة الجنيد التعليمية</p>
          </div>

          <div className="mr-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <SaveStatusIndicator />
            <div
              className="px-2.5 py-1 rounded-lg text-emerald-700 font-extrabold text-xs whitespace-nowrap bg-emerald-50 border border-emerald-200 shadow-xs"
            >
              <span className="hidden sm:inline">{user?.role === 'admin' ? 'مشرف النظام' : user?.role === 'owner' ? 'مالك المنصة' : user?.role ?? 'مستخدم'}</span>
              <span className="sm:hidden">{user?.role === 'admin' ? 'مشرف' : user?.role === 'owner' ? 'مالك' : 'مستخدم'}</span>
            </div>
          </div>
        </header>

        {/* Page Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-20 md:pb-8 relative">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
          {/* AI Copilot integrated globally */}
          <AIAssistantCopilot />
        </main>

        {/* Mobile Bottom Thumb Navigation Bar (< 768px) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1 flex items-center justify-around shadow-lg pb-safe">
          {MOBILE_BOTTOM_NAV.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all touch-target ${
                  active ? 'text-emerald-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110 text-emerald-600' : ''}`} />
                <span className="text-[10px] mt-0.5 whitespace-nowrap leading-none">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

