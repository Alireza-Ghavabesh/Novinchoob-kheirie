import React, { useState } from 'react';
import {
  LogIn,
  Lock,
  User,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { StaffUser, AppConfig } from '../types';
import { getTodayShamsi } from '../utils/persian';

interface LoginViewProps {
  config: AppConfig | null;
  onLoginSuccess: (user: StaffUser) => void;
  onBackToPublic: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  config,
  onLoginSuccess,
  onBackToPublic,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Reset Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotNote, setForgotNote] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'نام کاربری یا کلمه عبور نادرست است.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
    setLoading(true);
    try {
      const res = await api.login(u, p);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'ورود ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) return;
    setForgotLoading(true);
    try {
      const today = getTodayShamsi();
      await api.requestPasswordReset(forgotUsername.trim(), forgotNote.trim() || undefined);
      setForgotSubmitted(true);
    } catch {
      setError('خطا در ثبت درخواست بازیابی رمز عبور.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Back Link */}
        <button
          onClick={onBackToPublic}
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به فرم عمومی نیازسنجی</span>
        </button>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              ورود به پنل کادر خیریه
            </h2>
            <p className="text-xs text-slate-500">
              {config?.instName || 'مؤسسه خیریه حضرت ام‌البنین (س)'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border-r-4 border-rose-500 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                نام کاربری
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm outline-none transition font-mono dir-ltr text-right"
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
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotSubmitted(false);
                  }}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  فراموشی رمز عبور؟
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm outline-none transition font-mono dir-ltr text-right"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
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

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block mb-2 text-center">
              ورود سریع با نقش‌های کاربری پیش‌فرض:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', '123')}
                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium text-center border border-emerald-200 transition"
              >
                مدیر عامل (دسترسی کامل)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('madadkar', '123')}
                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium text-center border border-blue-200 transition"
              >
                مسئول مددکاری
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('mali', '123')}
                className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium text-center border border-amber-200 transition"
              >
                مدیر مالی و اعتبارات
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('omrani', '123')}
                className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-medium text-center border border-purple-200 transition"
              >
                مدیر طرح‌ها و عمران
              </button>
            </div>
          </div>
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
                    درخواست شما در دیتابیس ثبت گردید.
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
                    نام کاربری خود را وارد کنید تا پیام بازیابی به مدیریت عالی ارسال شود:
                  </p>
                  <input
                    type="text"
                    required
                    placeholder="نام کاربری (مثلاً madadkar)"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                  <textarea
                    rows={2}
                    placeholder="توضیح یا شماره تماس جهت دریافت رمز..."
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
