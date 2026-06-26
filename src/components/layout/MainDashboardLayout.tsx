import { type ReactNode, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, BookMarked, FileText,
  ClipboardList, Send, LogOut, Menu, Activity,
} from 'lucide-react';
import { useUIStore, useAuthStore } from '../../store';
import { useNavigate, useLocation } from 'react-router';
import { ROUTES } from '../../routes/routes.config';
import logo from '../../assets/logo.png';

const NAV_ITEMS = [
  { path: ROUTES.dashboard, icon: LayoutDashboard, label: 'الرئيسية' },
  { path: ROUTES.courses, icon: BookOpen, label: 'المقررات' },
  { path: ROUTES.lessons, icon: BookMarked, label: 'الدروس' },
  { path: ROUTES.content, icon: FileText, label: 'المحتوى' },
  { path: ROUTES.quiz, icon: ClipboardList, label: 'الاختبارات' },
  { path: ROUTES.publish, icon: Send, label: 'نشر الدروس' },
  { path: ROUTES.progress, icon: Activity, label: 'التقدم الأكاديمي' },
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
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ width: isSidebarCollapsed ? 80 : 260, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0 }}
        className={`bg-white border-l border-slate-200 flex flex-col absolute z-30 h-full md:relative right-0 ${isSidebarCollapsed ? 'translate-x-full md:translate-x-0 md:w-[80px]' : 'translate-x-0'} shadow-2xl md:shadow-none`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 gap-3 overflow-hidden">
          <div
            className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white border border-slate-100"
          >
            <img src={logo} alt="شعار منصة الجنيد" className="w-full h-full object-cover" />
          </div>
          {!isSidebarCollapsed && (
            <div>
              <div className="text-slate-800 whitespace-nowrap" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                منصة الجنيد
              </div>
              <div className="text-slate-400 whitespace-nowrap" style={{ fontSize: 11 }}>
                التعليمية
              </div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-hidden">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  active
                    ? 'text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
                style={active ? { background: '#ECFDF5', border: '1px solid #D1FAE5' } : {}}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-emerald-600' : ''}`} />
                {!isSidebarCollapsed && (
                  <span className="flex-1 text-right whitespace-nowrap" style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>
                    {item.label}
                  </span>
                )}
                {active && !isSidebarCollapsed && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-slate-100">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #34D399, #0D9488)' }}
              >
                <span className="text-white" style={{ fontSize: 14, fontWeight: 700 }}>
                  {user?.name?.charAt(0) ?? 'م'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-700 truncate" style={{ fontSize: 13, fontWeight: 600 }}>
                  {user?.name ?? 'مشرف النظام'}
                </div>
                <div className="text-slate-400 truncate" style={{ fontSize: 11 }}>
                  {user?.email ?? ''}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 text-slate-400 hover:text-red-500 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-slate-800" style={{ fontSize: 17, fontWeight: 700 }}>{pageLabel}</h1>
            <p className="text-slate-400" style={{ fontSize: 12 }}>منصة الجنيد التعليمية</p>
          </div>
          <div className="mr-auto flex items-center gap-2">
            <div
              className="px-3 py-1.5 rounded-lg text-emerald-700"
              style={{ background: '#ECFDF5', border: '1px solid #D1FAE5', fontSize: 12 }}
            >
              {user?.role === 'admin' ? 'مشرف النظام' : user?.role ?? 'مستخدم'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
