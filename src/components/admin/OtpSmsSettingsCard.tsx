import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Key,
  Globe,
  Send,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  Info,
  MessageSquareCode,
  Sparkles,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { AppConfig, SmsConfig, StaffUser } from '../../types';
import { api } from '../../services/api';
import {
  buildOtpSmsMessage,
  isWebOtpValidDomain,
  normalizeAppDomain,
} from '../../utils/smsFormat';

interface OtpSmsSettingsCardProps {
  currentUser?: StaffUser | null;
  config: AppConfig | null;
  onConfigUpdated?: (config: AppConfig) => void;
  onCurrentUserUpdated?: (user: StaffUser) => void;
  onSmsConfigSaved?: (smsConfig: SmsConfig) => void;
  onOpenSmsTab?: () => void;
  /** Optional externally loaded smsConfig (e.g. from SmsTab) */
  externalSmsConfig?: SmsConfig | null;
}

export const OtpSmsSettingsCard: React.FC<OtpSmsSettingsCardProps> = ({
  currentUser,
  config,
  onConfigUpdated,
  onCurrentUserUpdated,
  onSmsConfigSaved,
  onOpenSmsTab,
  externalSmsConfig,
}) => {
  const [loading, setLoading] = useState(!externalSmsConfig);
  const [apiKey, setApiKey] = useState(externalSmsConfig?.apiKey || '');
  const [senderLine, setSenderLine] = useState(externalSmsConfig?.senderLine || '');
  const [loginOtpTemplate, setLoginOtpTemplate] = useState(externalSmsConfig?.loginOtpTemplate || '');
  const [loginOtpMessage, setLoginOtpMessage] = useState(externalSmsConfig?.loginOtpMessage || '');
  const [isEnabled, setIsEnabled] = useState(externalSmsConfig ? externalSmsConfig.isEnabled : true);
  const [showApiKey, setShowApiKey] = useState(false);

  const [loginAllowOtp, setLoginAllowOtp] = useState(config?.loginAllowOtp !== false);
  const [appDomain, setAppDomain] = useState(config?.appDomain || '');

  // Quick admin phone setup so real staff OTP login works immediately
  const [adminPhone, setAdminPhone] = useState(currentUser?.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Real OTP test state
  const [testPhone, setTestPhone] = useState(currentUser?.phone || '');
  const [testingOtp, setTestingOtp] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error';
    text: string;
    preview?: string;
  } | null>(null);

  const [copiedPattern, setCopiedPattern] = useState(false);

  // Sync external app config updates
  useEffect(() => {
    if (config) {
      setLoginAllowOtp(config.loginAllowOtp !== false);
      setAppDomain(config.appDomain || '');
    }
  }, [config?.loginAllowOtp, config?.appDomain]);

  // Sync external smsConfig if passed from SmsTab
  useEffect(() => {
    if (externalSmsConfig) {
      setApiKey(externalSmsConfig.apiKey || '');
      setSenderLine(externalSmsConfig.senderLine || '');
      setLoginOtpTemplate(externalSmsConfig.loginOtpTemplate || '');
      setLoginOtpMessage(externalSmsConfig.loginOtpMessage || '');
      setIsEnabled(externalSmsConfig.isEnabled !== false);
      setLoading(false);
    }
  }, [externalSmsConfig]);

  // Fetch SMS config on mount if not provided externally
  useEffect(() => {
    if (externalSmsConfig) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const smsCfg = await api.getSmsConfig();
        if (!mounted) return;
        setApiKey(smsCfg.apiKey || '');
        setSenderLine(smsCfg.senderLine || '');
        setLoginOtpTemplate(smsCfg.loginOtpTemplate || '');
        setLoginOtpMessage(smsCfg.loginOtpMessage || '');
        setIsEnabled(smsCfg.isEnabled !== false);
      } catch (err) {
        console.error('Failed to load SMS config:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [externalSmsConfig]);

  useEffect(() => {
    if (currentUser?.phone) {
      setAdminPhone(currentUser.phone);
      setTestPhone((prev) => prev || currentUser.phone || '');
    }
  }, [currentUser?.phone]);

  const normalizedDomain = normalizeAppDomain(appDomain);
  const domainIsValid = isWebOtpValidDomain(normalizedDomain);
  const hasRealToken = Boolean(apiKey.trim() && apiKey.trim() !== 'DEMO_KEY');
  const usingPattern = Boolean(loginOtpTemplate.trim());

  const instName = config?.instName || 'مؤسسه خیریه حضرت ام‌البنین (س)';
  const liveSmsPreview = buildOtpSmsMessage({
    code: '482910',
    instName,
    customTemplate: loginOtpMessage,
    audience: 'STAFF',
    appDomain: normalizedDomain,
  });

  const recommendedGhasedakPattern = [
    `کد ورود شما به سامانه ${instName}: %param1%`,
    'لغو 11',
    ...(domainIsValid ? [`@${normalizedDomain} #%param1%`] : []),
  ].join('\n');

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg(null);

    if (!loginAllowOtp && config?.loginAllowPassword === false) {
      setSaveMsg({
        type: 'error',
        text: 'نمی‌توان هر دو روش ورود (رمز عبور و پیامک OTP) را هم‌زمان غیرفعال کرد.',
      });
      return;
    }

    setSaving(true);
    try {
      const [updatedSms, updatedAppCfg] = await Promise.all([
        api.updateSmsConfig({
          apiKey: apiKey.trim(),
          senderLine: senderLine.trim(),
          loginOtpTemplate: loginOtpTemplate.trim(),
          loginOtpMessage: loginOtpMessage.trim(),
          isEnabled,
          provider: 'GHASEDAK',
        }),
        api.updateConfig({
          appDomain: normalizedDomain,
          loginAllowOtp,
        }),
      ]);

      setApiKey(updatedSms.apiKey || '');
      setSenderLine(updatedSms.senderLine || '');
      setLoginOtpTemplate(updatedSms.loginOtpTemplate || '');
      setLoginOtpMessage(updatedSms.loginOtpMessage || '');
      setIsEnabled(updatedSms.isEnabled !== false);
      setAppDomain(updatedAppCfg.appDomain || '');
      setLoginAllowOtp(updatedAppCfg.loginAllowOtp !== false);

      onSmsConfigSaved?.(updatedSms);
      onConfigUpdated?.(updatedAppCfg);

      setSaveMsg({
        type: 'success',
        text: 'تنظیمات پیامک احراز هویت OTP، توکن قاصدک و دامین WebOTP با موفقیت ذخیره و فعال شد.',
      });
    } catch (err: any) {
      setSaveMsg({
        type: 'error',
        text: err.message || 'خطا در ذخیره تنظیمات پیامک OTP و دامین',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdminPhone = async () => {
    if (!currentUser) return;
    setPhoneMsg(null);
    setSavingPhone(true);
    try {
      const updatedUser = await api.updateUser(currentUser.id, {
        phone: adminPhone.trim() || null,
      });
      onCurrentUserUpdated?.(updatedUser);
      if (updatedUser.phone) {
        setTestPhone(updatedUser.phone);
      }
      setPhoneMsg({
        type: 'success',
        text: updatedUser.phone
          ? `شماره موبایل ${updatedUser.phone} برای حساب شما ثبت شد و اکنون می‌توانید با OTP وارد شوید.`
          : 'شماره موبایل حساب کاربری حذف شد.',
      });
    } catch (err: any) {
      setPhoneMsg({
        type: 'error',
        text: err.message || 'خطا در ثبت شماره موبایل مدیر',
      });
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSendTestOtp = async () => {
    setTestResult(null);
    if (!testPhone.trim()) {
      setTestResult({
        type: 'error',
        text: 'لطفاً شماره موبایل گیرنده تست را وارد نمایید (مثال: 09123456789).',
      });
      return;
    }
    if (!hasRealToken) {
      setTestResult({
        type: 'error',
        text: 'ابتدا توکن واقعی قاصدک را در کادر بالا وارد کنید.',
      });
      return;
    }

    setTestingOtp(true);
    try {
      const res = await api.testOtpSms({
        phone: testPhone.trim(),
        apiKey: apiKey.trim(),
        senderLine: senderLine.trim(),
        loginOtpTemplate: loginOtpTemplate.trim(),
        loginOtpMessage: loginOtpMessage.trim(),
        appDomain: normalizedDomain,
      });
      setTestResult({
        type: 'success',
        text: `پیامک واقعی کد تایید با موفقیت به ${res.maskedPhone || testPhone} ارسال شد (شناسه: ${res.messageId || 'OK'}).`,
        preview: res.previewMessage,
      });
    } catch (err: any) {
      setTestResult({
        type: 'error',
        text: err.message || 'ارسال پیامک تست OTP ناموفق بود.',
      });
    } finally {
      setTestingOtp(false);
    }
  };

  const handleUseCurrentHost = () => {
    if (typeof window === 'undefined') return;
    const host = normalizeAppDomain(window.location.hostname);
    if (host) {
      setAppDomain(host);
    }
  };

  const handleCopyPattern = () => {
    navigator.clipboard.writeText(recommendedGhasedakPattern);
    setCopiedPattern(true);
    setTimeout(() => setCopiedPattern(false), 2200);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <MessageSquareCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">
              تنظیمات پیامک احراز هویت (OTP) و تکمیل خودکار دامین (WebOTP)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              اتصال واقعی به خط ارتباطی و توکن قاصدک جهت ورود کادر و مددجویان، به همراه تنظیم دامین برنامه برای خواندن خودکار کد روی گوشی
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border ${
              hasRealToken && isEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                hasRealToken && isEnabled ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {hasRealToken && isEnabled ? 'ارسال واقعی OTP فعال' : 'در انتظار توکن واقعی'}
          </span>

          {onOpenSmsTab && (
            <button
              type="button"
              onClick={onOpenSmsTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>گزارش ارسال‌ها</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500">
          در حال بارگذاری تنظیمات پیامک OTP...
        </div>
      ) : (
        <form onSubmit={handleSaveAll} className="space-y-6 text-xs">
          {saveMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                saveMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {saveMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{saveMsg.text}</span>
            </div>
          )}

          {/* Section 1: Ghasedak Token, Line & OTP Template */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Key className="w-4 h-4 text-amber-600" />
                <span>۱. اتصال خط ارتباطی و توکن قاصدک (احراز هویت OTP)</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  توکن / کلید دسترسی وب‌سرویس قاصدک (API Key) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="توکن دریافتی از پنل قاصدک را اینجا وارد کنید..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title={showApiKey ? 'مخفی کردن توکن' : 'نمایش توکن'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  از پنل قاصدک بخش «تنظیمات وب‌سرویس / کلیدهای API» دریافت و وارد کنید.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  شماره خط ارتباطی / فرستنده پیامک (Line Number)
                </label>
                <input
                  type="text"
                  value={senderLine}
                  onChange={(e) => setSenderLine(e.target.value)}
                  placeholder="مثال: 3000500600 یا 10008566 یا 9000..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-left"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  در صورتی که خط ارتباطی دارید شماره خط را وارد کنید تا کد ورود از همین خط با فرمت استاندارد ارسال شود.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  نام الگوی اعتبارسنجی (OTP Pattern) قاصدک <span className="text-slate-400 font-normal">(اختیاری)</span>
                </label>
                <input
                  type="text"
                  value={loginOtpTemplate}
                  onChange={(e) => setLoginOtpTemplate(e.target.value)}
                  placeholder="مثال: charityLoginOtp (اگر با خط ارتباطی ارسال می‌کنید خالی بگذارید)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-left"
                />
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  اگر در قاصدک الگوی OTP ثبت کرده‌اید نام آن را بنویسید (ارسال سریع به خطوط بلک‌لیست با پارامتر اول = کد). اگر خالی باشد، سامانه مستقیماً از <strong>خط ارتباطی</strong> شما استفاده می‌کند.
                </p>
              </div>

              {!usingPattern && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    متن سفارشی پیامک کد تایید OTP <span className="text-slate-400 font-normal">(اختیاری)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={loginOtpMessage}
                    onChange={(e) => setLoginOtpMessage(e.target.value)}
                    placeholder={`پیش‌فرض: کد ورود شما به سامانه {instName}: {code}\nاعتبار کد: ۲ دقیقه`}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    متغیرهای مجاز: <code className="bg-slate-100 px-1 rounded font-mono">{'{code}'}</code> (کد ۶ رقمی) و{' '}
                    <code className="bg-slate-100 px-1 rounded font-mono">{'{instName}'}</code> (نام مؤسسه). عبارت <strong className="text-slate-700">لغو 11</strong> و خط دامین WebOTP خودکار اضافه می‌شوند.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800">ارسال واقعی پیامک فعال باشد</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loginAllowOtp}
                    onChange={(e) => setLoginAllowOtp(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800">ورود کادر با پیامک OTP فعال باشد</span>
                </label>
              </div>
            </div>

            {/* Section 2: App Domain & WebOTP Auto-Fill Live Preview */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>۲. دامین برنامه برای ورود خودکار کد روی گوشی (WebOTP)</span>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-800">
                      دامین رسمی سامانه (بدون https و اسلش)
                    </label>
                    <button
                      type="button"
                      onClick={handleUseCurrentHost}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      درج آدرس فعلی مرورگر
                    </button>
                  </div>
                  <input
                    type="text"
                    value={appDomain}
                    onChange={(e) => setAppDomain(e.target.value)}
                    placeholder="مثال: charity.ir یا app.mycharity.ir"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-left"
                  />
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    با ثبت دامین، خط استاندارد{' '}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-800 dir-ltr inline-block">
                      @{domainIsValid ? normalizedDomain : 'yourdomain.ir'} #123456
                    </code>{' '}
                    به آخرین خط پیامک اضافه می‌شود تا هنگام رسیدن پیامک روی گوشی، با یک لمس دکمه «تایید / Allow» کد به‌صورت خودکار وارد صفحه شده و لاگین انجام شود.
                  </p>
                </div>

                {appDomain.trim() && !domainIsValid && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-start gap-2 leading-relaxed">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      مقدار واردشده ({normalizedDomain || appDomain}) شبیه IP یا دامین ناقص است. قابلیت تکمیل خودکار پیامک (WebOTP) در مرورگر گوشی فقط روی <strong>دامین واقعی دارای HTTPS</strong> (مثل <span className="font-mono">charity.ir</span>) کار می‌کند. اگر فعلاً روی IP هستید، می‌توانید دامین نهایی خود را وارد کنید تا پس از اتصال دامین، فوراً کار کند.
                    </span>
                  </div>
                )}

                {domainIsValid && (
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      دامین <strong className="font-mono dir-ltr inline-block">{normalizedDomain}</strong> معتبر و آماده تکمیل خودکار کد پیامکی (WebOTP) است.
                    </span>
                  </div>
                )}
              </div>

              {/* Live SMS Preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    {usingPattern
                      ? 'متن پیشنهادی جهت ثبت در الگوی OTP پنل قاصدک:'
                      : 'پیش‌نمایش دقیق پیامک ارسالی به گوشی کاربر:'}
                  </span>
                  {usingPattern && (
                    <button
                      type="button"
                      onClick={handleCopyPattern}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                    >
                      {copiedPattern ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPattern ? 'کپی شد' : 'کپی الگو'}</span>
                    </button>
                  )}
                </div>

                <pre className="whitespace-pre-wrap font-sans text-xs leading-6 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-slate-100">
                  {usingPattern ? recommendedGhasedakPattern : liveSmsPreview}
                </pre>

                <div className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {usingPattern
                      ? 'برای کارکرد تکمیل خودکار در حالت الگوی قاصدک، حتماً خط آخر الگوی ثبت‌شده در پنل قاصدک را مطابق متن بالا قرار دهید.'
                      : 'خط «لغو 11» برای جلوگیری از مسدودی خط و خط آخر (@دامین #کد) برای تکمیل خودکار مرورگر موبایل به‌طور خودکار رعایت شده است.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات پیامک OTP و دامین'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Bottom Helper Grid: Admin Mobile + Live Real OTP Test */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
          {/* Quick Admin Mobile Number */}
          {currentUser && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>شماره موبایل حساب شما ({currentUser.name}) جهت ورود با OTP</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                برای ورود واقعی به پنل مدیریت از طریق پیامک OTP، شماره موبایل شما باید در پروفایل کاربری ثبت باشد.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  inputMode="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="09123456789"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-left"
                />
                <button
                  type="button"
                  onClick={handleSaveAdminPhone}
                  disabled={savingPhone}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {savingPhone ? 'ثبت...' : 'ثبت موبایل من'}
                </button>
              </div>
              {phoneMsg && (
                <p
                  className={`text-[11px] font-medium ${
                    phoneMsg.type === 'success' ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {phoneMsg.text}
                </p>
              )}
            </div>
          )}

          {/* Real OTP Send Test */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Send className="w-4 h-4 text-emerald-600" />
              <span>تست ارسال واقعی پیامک OTP قبل از خروج</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              یک پیامک واقعی با کد آزمایشی و همین توکن، خط ارتباطی و دامین به شماره دلخواه بفرستید تا از صحت اتصال مطمئن شوید.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                inputMode="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="09123456789"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-left"
              />
              <button
                type="button"
                onClick={handleSendTestOtp}
                disabled={testingOtp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingOtp ? 'در حال ارسال...' : 'ارسال تست واقعی'}</span>
              </button>
            </div>
            {testResult && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                  testResult.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                <p className="font-semibold">{testResult.text}</p>
                {testResult.preview && (
                  <pre className="whitespace-pre-wrap text-[10px] bg-white/70 rounded-lg p-2 border border-emerald-200/70 text-slate-700 font-sans">
                    {testResult.preview}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
