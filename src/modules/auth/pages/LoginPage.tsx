import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2, AlertCircle, WifiOff, Ban, UserX, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../../store';
import { ROUTES } from '../../../routes/routes.config';
import { loginSchema, type LoginFormValues } from '../../../utils';
import logo from '../../../assets/logo.png';

// ─── Error Map ─────────────────────────────────────────────────────────────────
// Maps classified error codes (from auth store) to user-facing UI messages.
// Does NOT expose mock credentials, email hints, or test accounts.

const ERROR_MAP: Record<string, { icon: React.ElementType; text: string; cls: string }> = {
  empty:     { icon: AlertCircle, text: 'يرجى تعبئة جميع الحقول المطلوبة',              cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  invalid:   { icon: Lock,        text: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', cls: 'bg-red-50 border-red-200 text-red-700' },
  not_found: { icon: UserX,       text: 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني', cls: 'bg-red-50 border-red-200 text-red-700' },
  banned:    { icon: Ban,         text: 'هذا الحساب موقوف. يرجى التواصل مع الدعم الفني', cls: 'bg-red-50 border-red-200 text-red-700' },
  server:    { icon: WifiOff,     text: 'تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت', cls: 'bg-gray-50 border-gray-200 text-gray-600' },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    clearError();
    await login(values);
    // Navigate on success — store sets isAuthenticated which ProtectedRoute checks
    if (useAuthStore.getState().isAuthenticated) {
      navigate(ROUTES.dashboard, { replace: true });
    }
  };

  const err = error ? ERROR_MAP[error] ?? ERROR_MAP['invalid'] : null;

  return (
    <div dir="rtl" className="min-h-screen flex" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Decorative left panel */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #059669 0%, #10B981 50%, #0D9488 100%)' }}
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full opacity-10 bg-white" />
        <div className="absolute top-1/2 right-8 w-48 h-48 rounded-full opacity-5 bg-white" />

        <div className="relative z-10 text-white text-center">
          <div
            className="inline-flex items-center justify-center w-28 h-28 rounded-3xl mb-8 shadow-2xl overflow-hidden bg-white"
            style={{ border: '2px solid rgba(255,255,255,0.5)' }}
          >
            <img src={logo} alt="شعار منصة الجنيد" className="w-full h-full object-cover" />
          </div>

          <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.2 }}>منصة الجنيد</h1>
          <p className="text-emerald-100 mt-1 mb-8" style={{ fontSize: 22, fontWeight: 500 }}>التعليمية</p>
          <p className="text-emerald-100 max-w-xs mx-auto leading-relaxed" style={{ fontSize: 15 }}>
            نظام إدارة تعليمي متكامل للمشرفين والمعلمين لإدارة المقررات والدروس والاختبارات
          </p>
        </div>
      </div>

      {/* Login form panel */}
      <div className="w-full lg:w-[480px] flex flex-col items-center justify-center p-8 bg-white">
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-md mb-3 overflow-hidden bg-white border border-slate-100">
            <img src={logo} alt="شعار منصة الجنيد" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-slate-800" style={{ fontSize: 20, fontWeight: 700 }}>منصة الجنيد التعليمية</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-slate-800" style={{ fontSize: 26, fontWeight: 700 }}>مرحباً بك</h2>
            <p className="text-slate-500 mt-1" style={{ fontSize: 14 }}>سجّل دخولك للوصول إلى لوحة التحكم</p>
          </div>

          {/* Error banner — shows real API error message, no mock hints */}
          {err && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border mb-5 ${err.cls}`}>
              <err.icon className="w-5 h-5 flex-shrink-0" />
              <span style={{ fontSize: 14 }}>{err.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5" autoComplete="on">
            {/* Email */}
            <div>
              <label className="block text-slate-700 mb-2" style={{ fontSize: 14, fontWeight: 500 }}>
                البريد الإلكتروني <span className="text-red-500">*</span>
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="example@domain.com"
                disabled={isLoading}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all disabled:opacity-60 ${
                  errors.email
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'
                }`}
                style={{ fontSize: 14, direction: 'ltr', textAlign: 'right' }}
              />
              {errors.email && (
                <p className="text-red-500 mt-1" style={{ fontSize: 12 }}>{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-700 mb-2" style={{ fontSize: 14, fontWeight: 500 }}>
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="أدخل كلمة المرور"
                  disabled={isLoading}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border outline-none transition-all disabled:opacity-60 ${
                    errors.password
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'
                  }`}
                  style={{ fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 mt-1" style={{ fontSize: 12 }}>{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #10B981, #0D9488)',
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جارٍ التحقق...
                </span>
              ) : 'تسجيل الدخول'}
            </button>
          </form>

          {/* Support notice — no credentials, no test account hints */}
          <div className="mt-6 p-4 rounded-xl border border-slate-100 bg-slate-50 text-center">
            <p className="text-slate-500" style={{ fontSize: 13 }}>
              هل نسيت كلمة المرور؟ تواصل مع مسؤول النظام
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
