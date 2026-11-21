import React, { useState, useEffect } from 'react';
import {
  LogIn,
  Lock,
  User,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Eye,
  EyeOff,
  MessageSquareCode,
  RefreshCw,
  Edit3,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { StaffUser, AppConfig } from '../types';
import { getLoginTheme } from '../utils/loginThemes';
import { useWebOtp } from '../utils/useWebOtp';

interface LoginViewProps {
  config: AppConfig | null;
  onLoginSuccess: (user: StaffUser, token?: string) => void;
  onBackToPublic: () => void;
}

type AuthMethod = 'password' | 'mobile';

export const LoginView: React.FC<LoginViewProps> = ({
  config,
  onLoginSuccess,
  onBackToPublic,
}) => {
  const allowPassword = config?.loginAllowPassword !== false;
  const allowOtp = config?.loginAllowOtp !== false;
  const showMethodSwitcher = allowPassword && allowOtp;
  const showBackLink = config?.loginShowBackLink !== false;
  const showLogo = config?.loginShowLogo !== false;

  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    allowPassword ? 'password' : 'mobile'
  );

  // Sync active method if admin disables one method in settings
  useEffect(() => {
    if (authMethod === 'password' && !allowPassword && allowOtp) {
      setAuthMethod('mobile');
    } else if (authMethod === 'mobile' && !allowOtp && allowPassword) {
      setAuthMethod('password');
    }
  }, [allowPassword, allowOtp, authMethod]);

  const theme = getLoginTheme(config?.loginTheme);
  const loginTitle = config?.loginTitle?.trim() || 'ورود به پنل کادر خیریه';
  const loginSubtitle =
    config?.loginSubtitle?.trim() ||
    config?.instName ||
    'مؤسسه خیریه حضرت ام‌البنین (س)';
  const loginWelcomeNote = config?.loginWelcomeNote?.trim() || '';
  const loginFooterText =
    config?.loginFooterText?.trim() || 'دسترسی اختصاصی کادر و مدیران مجاز مؤسسه';
  const hasBgImage = Boolean(config?.loginBgDataUrl);

  // Password login state (no hardcoded demo credentials)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mobile OTP login state
  const [mobilePhone, setMobilePhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Password Reset Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotNote, setForgotNote] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const switchMethod = (method: AuthMethod) => {
    setAuthMethod(method);
    setError('');
    setInfoMsg('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (!username.trim() || !password) {
      setError('لطفاً نام کاربری و رمز عبور خود را وارد نمایید.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'نام کاربری یا رمز عبور نادرست است.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMsg('');

    if (!mobilePhone.trim()) {
      setError('لطفاً شماره موبایل ثبت‌شده خود را وارد نمایید.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendLoginOtp(mobilePhone.trim());
      setOtpSent(true);
      setMaskedPhone(res.maskedPhone);
      setOtpCode('');
      setCountdown(res.expiresIn || 120);
      setInfoMsg(`کد تایید ۶ رقمی به شماره ${res.maskedPhone} پیامک شد.`);
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال کد تایید.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpCode = async (rawCode: string) => {
    setError('');
    const code = rawCode.trim();
    if (!code) {
      setError('لطفاً کد تایید پیامک‌شده را وارد نمایید.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyLoginOtp(mobilePhone.trim(), code);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'کد تایید واردشده صحیح نیست.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtpCode(otpCode);
  };

  const webOtpSupported = useWebOtp({
    active: authMethod === 'mobile' && otpSent && !loading,
    onCodeReceived: (autoCode) => {
      setOtpCode(autoCode);
      setInfoMsg('کد تایید به صورت خودکار از پیامک خوانده شد. در حال ورود...');
      void verifyOtpCode(autoCode);
    },
  });

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) return;
    setForgotLoading(true);
    try {
      await api.requestPasswordReset(forgotUsername.trim(), forgotNote.trim() || undefined);
      setForgotSubmitted(true);
    } catch {
      setError('خطا در ثبت درخواست بازیابی رمز عبور.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className={`relative min-h-[80vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 ${
        hasBgImage ? 'bg-slate-900' : ''
      }`}
    >
      {/* Optional Customized Background Image */}
      {hasBgImage && config?.loginBgDataUrl && (
        <>
          <img
            src={config.loginBgDataUrl}
            alt="پس‌زمینه صفحه ورود"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
        </>
      )}

      <div className="relative z-10 max-w-md w-full space-y-5">
        {/* Back Link */}
        {showBackLink && (
          <button
            onClick={onBackToPublic}
            className={`inline-flex items-center gap-2 text-xs font-semibold transition ${
              hasBgImage
                ? 'text-white/90 hover:text-white bg-black/30 hover:bg-black/45 px-3 py-1.5 rounded-xl backdrop-blur-sm'
                : theme.backLink
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به فرم عمومی نیازسنجی</span>
          </button>
        )}

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-slate-200/80 p-7 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            {showLogo && config?.logoDataUrl ? (
              <div className="w-16 h-16 rounded-2xl mx-auto overflow-hidden border border-slate-200 shadow-lg bg-white p-0.5">
                <img
                  src={config.logoDataUrl}
                  alt={config.instName}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>
            ) : (
              <div
                className={`w-16 h-16 bg-gradient-to-tr ${theme.iconBox} rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg`}
              >
                <ShieldCheck className="w-9 h-9" />
              </div>
            )}
            <h2 className="text-xl font-black text-slate-900">{loginTitle}</h2>
            <p className="text-xs text-slate-500">{loginSubtitle}</p>
          </div>

          {/* Optional Welcome / Announcement Note */}
          {loginWelcomeNote && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 leading-relaxed ${theme.welcomeBox}`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
              <span>{loginWelcomeNote}</span>
            </div>
          )}

          {/* Auth Method Switcher (only if both methods are enabled) */}
          {showMethodSwitcher && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => switchMethod('password')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold transition ${
                  authMethod === 'password'
                    ? `bg-white ${theme.tabActive} shadow-sm border border-slate-200/60`
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>نام کاربری و رمز</span>
              </button>
              <button
                type="button"
                onClick={() => switchMethod('mobile')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold transition ${
                  authMethod === 'mobile'
                    ? `bg-white ${theme.tabActive} shadow-sm border border-slate-200/60`
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>ورود با موبایل (کد تایید)</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border-r-4 border-rose-500 rounded-xl text-rose-700 text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 bg-emerald-50 border-r-4 border-emerald-500 rounded-xl text-emerald-800 text-xs flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* 1. Username + Password Form */}
          {authMethod === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  نام کاربری یا شماره موبایل
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="نام کاربری یا شماره موبایل"
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 ${theme.focusRing} text-sm outline-none transition dir-ltr text-right`}
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    رمز عبور
                  </label>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotSubmitted(false);
                    }}
                    className={`text-[11px] font-medium ${theme.linkText}`}
                  >
                    فراموشی رمز عبور؟
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور خود را وارد کنید"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 ${theme.focusRing} text-sm outline-none transition dir-ltr text-right`}
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 bg-gradient-to-r ${theme.button} text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm`}
              >
                {loading ? (
                  <span>در حال تأیید هویت...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>ورود به سامانه</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. Mobile Number + OTP Form */}
          {authMethod === 'mobile' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      شماره موبایل ثبت‌شده پرسنلی
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        inputMode="tel"
                        required
                        autoComplete="tel"
                        value={mobilePhone}
                        onChange={(e) => setMobilePhone(e.target.value)}
                        placeholder="09123456789"
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 ${theme.focusRing} text-sm outline-none transition font-mono dir-ltr text-right`}
                      />
                      <Smartphone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      کد تایید یک‌بارمصرف تنها به شماره موبایلی که توسط مدیر سیستم در پروفایل کاربری شما ثبت شده باشد ارسال می‌شود.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 bg-gradient-to-r ${theme.button} text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm`}
                  >
                    {loading ? (
                      <span>در حال ارسال کد تایید...</span>
                    ) : (
                      <>
                        <MessageSquareCode className="w-4 h-4" />
                        <span>دریافت کد تایید پیامکی</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">شماره موبایل:</span>
                      <span className="font-mono font-bold text-slate-800 dir-ltr inline-block">
                        {maskedPhone || mobilePhone}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setError('');
                        setInfoMsg('');
                      }}
                      className={`inline-flex items-center gap-1 font-semibold text-xs ${theme.linkText}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تغییر شماره</span>
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        کد تایید ۶ رقمی
                      </label>
                      {countdown > 0 ? (
                        <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          اعتبار: {formatTimer(countdown)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          disabled={loading}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${theme.linkText}`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>ارسال مجدد کد</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="------"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 ${theme.focusRing} text-lg font-mono font-bold tracking-[0.4em] text-center outline-none transition dir-ltr`}
                    />
                    {webOtpSupported && Boolean(config?.appDomain) && (
                      <p className="text-[11px] text-emerald-700 mt-1.5 text-center">
                        پس از دریافت پیامک روی گوشی، با تایید اعلان مرورگر کد به صورت خودکار وارد می‌شود.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 bg-gradient-to-r ${theme.button} text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm`}
                  >
                    {loading ? (
                      <span>در حال بررسی کد...</span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>تایید و ورود به سامانه</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {loginFooterText && (
            <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
              {loginFooterText}
            </div>
          )}
        </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-slate-800">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">درخواست بازیابی کلمه عبور</h3>
              </div>

              {forgotSubmitted ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold text-emerald-900">
                    درخواست شما در سامانه ثبت گردید.
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    مدیر سیستم در بخش مدیریت کاربران این درخواست را بررسی و رمز عبور جدید را برای شما صادر خواهد کرد.
                  </p>
                  <button
                    onClick={() => setShowForgotModal(false)}
                    className="mt-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                  >
                    بستن
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-xs text-slate-500">
                    نام کاربری یا شماره موبایل خود را وارد کنید تا درخواست بازیابی به مدیر سیستم ارسال شود:
                  </p>
                  <input
                    type="text"
                    required
                    placeholder="نام کاربری یا شماره موبایل"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none dir-ltr text-right"
                  />
                  <textarea
                    rows={2}
                    placeholder="توضیح یا شماره تماس جهت هماهنگی..."
                    value={forgotNote}
                    onChange={(e) => setForgotNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow"
                    >
                      {forgotLoading ? 'در حال ارسال...' : 'ارسال درخواست'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
