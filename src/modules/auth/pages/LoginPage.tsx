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
  const { login, forgotPassword, resetPassword, isLoading, error, clearError } = useAuthStore();
  const [showPass, setShowPass] = useState(false);

  // Forgot / Reset Password state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);

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

  const handleRequestForgotToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    setForgotErr(null);
    setIsSubmittingForgot(true);
    try {
      const message = await forgotPassword(forgotEmail);
      setForgotMsg(message || 'تم إرسال رمز التعيين إلى بريدك الإلكتروني.');
      setResetStep('reset');
    } catch (err: any) {
      setForgotErr(err?.message || 'فشلت عملية إرسال الرمز.');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    setForgotErr(null);
    setIsSubmittingForgot(true);
    try {
      const message = await resetPassword({ token: resetToken, newPassword });
      setForgotMsg(message || 'تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
      setTimeout(() => {
        setIsForgotOpen(false);
        setResetStep('request');
        setForgotMsg(null);
      }, 2000);
    } catch (err: any) {
      setForgotErr(err?.message || 'فشلت عملية إعادة تعيين كلمة المرور.');
    } finally {
      setIsSubmittingForgot(false);
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
      <div className="w-full lg:w-[480px] flex flex-col items-center justify-center p-4 sm:p-8 bg-white min-h-screen lg:min-h-0">
        <div className="lg:hidden text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-sm mb-3 overflow-hidden bg-white border border-slate-100">
            <img src={logo} alt="شعار منصة الجنيد" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-slate-900 font-extrabold text-lg sm:text-xl">منصة الجنيد التعليمية</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6 sm:mb-8 text-center sm:text-right">
            <h2 className="text-slate-800 font-extrabold text-xl sm:text-2xl">مرحباً بك</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">سجّل دخولك للوصول إلى لوحة التحكم</p>
          </div>

          {/* Error banner */}
          {err && (
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border mb-5 text-xs sm:text-sm ${err.cls}`}>
              <err.icon className="w-5 h-5 flex-shrink-0" />
              <span>{err.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 sm:space-y-5" autoComplete="on">
            {/* Email */}
            <div>
              <label className="block text-slate-700 text-xs sm:text-sm font-bold mb-1.5">
                البريد الإلكتروني <span className="text-red-500">*</span>
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="example@domain.com"
                disabled={isLoading}
                className={`w-full min-h-[44px] px-4 py-3 rounded-xl border outline-none transition-all text-sm disabled:opacity-60 ${
                  errors.email
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'
                }`}
                style={{ direction: 'ltr', textAlign: 'right' }}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-700 text-xs sm:text-sm font-bold mb-1.5">
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
                  className={`w-full min-h-[44px] px-4 py-3 pr-12 rounded-xl border outline-none transition-all text-sm disabled:opacity-60 ${
                    errors.password
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1.5 touch-target flex items-center justify-center"
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

          {/* Support notice & Forgot password modal trigger */}
          <div className="mt-6 p-4 rounded-xl border border-slate-100 bg-slate-50 text-center">
            <button
              type="button"
              onClick={() => setIsForgotOpen(true)}
              className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
              style={{ fontSize: 13 }}
            >
              هل نسيت كلمة المرور؟ انقر هنا لاستعادتها
            </button>
          </div>
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">استعادة كلمة المرور</h3>
              <button
                onClick={() => {
                  setIsForgotOpen(false);
                  setResetStep('request');
                  setForgotMsg(null);
                  setForgotErr(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {forgotMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
                {forgotMsg}
              </div>
            )}
            {forgotErr && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
                {forgotErr}
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestForgotToken} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  أدخل بريدك الإلكتروني المسجل لإرسال رمز إعادة تعيين كلمة المرور عبر البريد.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-emerald-500"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingForgot}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmittingForgot ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال رمز التعيين'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleExecuteResetPassword} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  أدخل رمز التعيين المرسل لبريدك الإلكتروني وكلمة المرور الجديدة.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رمز التعيين (Token)</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="رمز التعيين"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetStep('request')}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold"
                  >
                    رجوع
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingForgot}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmittingForgot ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد تغيير كلمة المرور'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

