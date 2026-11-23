import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Smartphone,
  MessageSquareCode,
  LogIn,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Info,
} from 'lucide-react';
import { AppConfig, BeneficiaryAccount } from '../types';
import { api } from '../services/api';
import { toEnglishDigits, toPersianDigits } from '../utils/persian';
import { useWebOtp } from '../utils/useWebOtp';

interface BeneficiaryLoginViewProps {
  config: AppConfig | null;
  onLoginSuccess: (beneficiary: BeneficiaryAccount, token: string) => void;
  onBackToPublic: () => void;
  isolated?: boolean;
}

export const BeneficiaryLoginView: React.FC<BeneficiaryLoginViewProps> = ({
  config,
  onLoginSuccess,
  onBackToPublic,
  isolated = false,
}) => {
  const [phone, setPhone] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [simulatedCode, setSimulatedCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMsg('');
    setSimulatedCode('');

    const ph = toEnglishDigits(phone.trim());

    if (!ph || ph.length < 10) {
      setError('لطفاً شماره همراه معتبر (مانند 09123456789) وارد نمایید.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendBeneficiaryOtp({
        phone: ph,
      });
      setOtpSent(true);
      setMaskedPhone(res.maskedPhone || ph);
      setOtpCode('');
      setCountdown(res.expiresIn || 180);
      if (res.simulated && res.previewCode) {
        setSimulatedCode(res.previewCode);
        setInfoMsg(
          `کد تایید به شماره ${res.maskedPhone} ارسال شد (حالت آزمایشی بدون کلید پیامک فعال).`
        );
      } else {
        setInfoMsg(`کد تایید ۶ رقمی به شماره ${res.maskedPhone} پیامک شد.`);
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال کد تایید پیامکی');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpCode = async (rawCode: string) => {
    setError('');
    const code = toEnglishDigits(rawCode.trim());
    if (!code || code.length < 4) {
      setError('لطفاً کد تایید پیامک‌شده را وارد نمایید.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyBeneficiaryOtp({
        phone: toEnglishDigits(phone.trim()),
        code,
      });
      onLoginSuccess(res.beneficiary, res.token);
    } catch (err: any) {
      setError(err.message || 'کد تایید نادرست است یا منقضی شده است.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtpCode(otpCode);
  };

  const webOtpSupported = useWebOtp({
    active: otpSent && !loading,
    onCodeReceived: (autoCode) => {
      const clean = toEnglishDigits(autoCode);
      setOtpCode(clean);
      setInfoMsg('کد تایید به صورت خودکار از پیامک خوانده شد. در حال ورود...');
      void verifyOtpCode(clean);
    },
  });

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-50/40 to-slate-50">
      <div className="max-w-md w-full space-y-5">
        {!isolated && (
          <button
            type="button"
            onClick={onBackToPublic}
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به صفحه اصلی</span>
          </button>
        )}

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-7 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-teal-600 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg">
              <UserCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              ورود به پروفایل اختصاصی مددجو
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {config?.instName || 'مؤسسه خیریه حضرت ام‌البنین (س)'} — تکمیل و ویرایش فرم‌ها، بارگذاری مدارک و مشاهده پیغام کارشناسان
            </p>
          </div>

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

          {simulatedCode && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">پیش‌نمایش کد تایید (سرویس پیامک پیکربندی نشده):</span>
                <span className="font-mono font-black text-sm tracking-widest mt-1 inline-block">
                  {simulatedCode}
                </span>
              </div>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  شماره همراه <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm outline-none transition font-mono text-left"
                  />
                  <Smartphone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  پس از وارد کردن شماره همراه، یک کد تایید یک‌بارمصرف به گوشی شما پیامک می‌شود.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <span>در حال ارسال کد تایید...</span>
                ) : (
                  <>
                    <MessageSquareCode className="w-4 h-4" />
                    <span>ارسال کد تایید به شماره همراه</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">شماره همراه:</span>
                  <span className="font-mono font-bold text-slate-800 dir-ltr inline-block mt-0.5">
                    {maskedPhone}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setError('');
                    setInfoMsg('');
                    setSimulatedCode('');
                  }}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تغییر شماره</span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    کد تایید {toPersianDigits(6)} رقمی
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
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-lg font-mono font-bold tracking-[0.4em] text-center outline-none transition dir-ltr"
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
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <span>در حال تایید کد...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تایید و ورود به پروفایل مددجو</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
