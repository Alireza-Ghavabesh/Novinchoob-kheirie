import React, { useState } from 'react';
import { AppConfig, Category, StaffUser } from '../../types';
import {
  Settings,
  Image,
  Upload,
  Plus,
  Trash2,
  Database,
  Download,
  UploadCloud,
  CheckCircle,
  Building,
  Tag,
  AlertTriangle,
  RotateCcw,
  Link2,
  Copy,
  ExternalLink,
  Palette,
  ShieldCheck,
  Lock,
  Smartphone,
  Info,
  UserCheck,
  EyeOff,
  Wand2,
  ClipboardList,
  Save,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  DEFAULT_BENEFICIARY_LOGIN_CONFIG,
  LOGIN_THEMES,
  getLoginTheme,
  parseBeneficiaryLoginConfig,
} from '../../utils/loginThemes';
import { EntityDefinition } from '../../utils/publicFormConfig';
import { OtpSmsSettingsCard } from './OtpSmsSettingsCard';

interface SettingsTabProps {
  currentUser?: StaffUser | null;
  config: AppConfig | null;
  needCategories: Category[];
  programCategories: Category[];
  entities: EntityDefinition[];
  onConfigUpdated: (config: AppConfig) => void;
  onCurrentUserUpdated?: (user: StaffUser) => void;
  onRefreshCategories: () => void;
  onOpenFormBuilder?: () => void;
  onOpenSmsTab?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentUser,
  config,
  needCategories,
  programCategories,
  entities,
  onConfigUpdated,
  onCurrentUserUpdated,
  onRefreshCategories,
  onOpenFormBuilder,
  onOpenSmsTab,
}) => {
  // Identity Form State
  const [instName, setInstName] = useState(config?.instName || 'مؤسسه خیریه حضرت ام‌البنین (س)');
  const [automationTitle, setAutomationTitle] = useState(
    config?.automationTitle || 'سامانه اتوماسیون کادر خیریه حضرت ام‌البنین (س)'
  );
  const [phone, setPhone] = useState(config?.phone || '021-55667788');
  const [address, setAddress] = useState(
    config?.address || 'تهران، منطقه ۱۷، خیابان ابوذر، نبش خیابان شهید فتحی، پلاک ۲۴'
  );
  const [notice, setNotice] = useState(
    config?.notice ||
      'تمامی اطلاعات ثبت‌شده توسط مددکاران معتمد خیریه بازبینی و راستی‌آزمایی می‌گردد.'
  );
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(config?.logoDataUrl || null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Category Add State
  const [newNeedCat, setNewNeedCat] = useState('');
  const [newProgCat, setNewProgCat] = useState('');
  const [catLoading, setCatLoading] = useState(false);

  // Restore & Backup State
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [restoreErr, setRestoreErr] = useState('');
  const [catError, setCatError] = useState('');
  const [copiedLinkKey, setCopiedLinkKey] = useState<'form' | 'beneficiary' | 'admin' | null>(null);

  // Access Links & Visibility State
  const [beneficiaryLoginSlug, setBeneficiaryLoginSlug] = useState(
    config?.beneficiaryLoginSlug || 'beneficiary'
  );
  const [adminLoginSlug, setAdminLoginSlug] = useState(config?.adminLoginSlug || 'admin-portal');
  const [hideAdminLoginButton, setHideAdminLoginButton] = useState(
    config?.hideAdminLoginButton !== false
  );
  const [savingAccessLinks, setSavingAccessLinks] = useState(false);
  const [accessLinksSuccess, setAccessLinksSuccess] = useState(false);
  const [accessLinksError, setAccessLinksError] = useState('');

  React.useEffect(() => {
    if (!config) return;
    if (config.beneficiaryLoginSlug) setBeneficiaryLoginSlug(config.beneficiaryLoginSlug);
    if (config.adminLoginSlug) setAdminLoginSlug(config.adminLoginSlug);
    setHideAdminLoginButton(config.hideAdminLoginButton !== false);
  }, [config?.beneficiaryLoginSlug, config?.adminLoginSlug, config?.hideAdminLoginButton]);

  // Login Page Customization State
  const [loginTitle, setLoginTitle] = useState(
    config?.loginTitle || 'ورود به پنل کادر خیریه'
  );
  const [loginSubtitle, setLoginSubtitle] = useState(config?.loginSubtitle || '');
  const [loginWelcomeNote, setLoginWelcomeNote] = useState(config?.loginWelcomeNote || '');
  const [loginFooterText, setLoginFooterText] = useState(
    config?.loginFooterText ?? 'دسترسی اختصاصی کادر و مدیران مجاز مؤسسه'
  );
  const [loginTheme, setLoginTheme] = useState(config?.loginTheme || 'emerald');
  const [loginBgDataUrl, setLoginBgDataUrl] = useState<string | null>(
    config?.loginBgDataUrl || null
  );
  const [loginShowLogo, setLoginShowLogo] = useState(config?.loginShowLogo !== false);
  const [loginAllowPassword, setLoginAllowPassword] = useState(
    config?.loginAllowPassword !== false
  );
  const [loginAllowOtp, setLoginAllowOtp] = useState(config?.loginAllowOtp !== false);
  const [loginShowBackLink, setLoginShowBackLink] = useState(
    config?.loginShowBackLink !== false
  );
  const [savingLoginCfg, setSavingLoginCfg] = useState(false);
  const [loginCfgSuccess, setLoginCfgSuccess] = useState(false);
  const [loginCfgError, setLoginCfgError] = useState('');

  // Login Customization Active Sub-Tab ('beneficiary' | 'staff')
  const [loginEditorTab, setLoginEditorTab] = useState<'beneficiary' | 'staff'>('beneficiary');

  // Beneficiary Login Page Customization State
  const initialBenCfg = parseBeneficiaryLoginConfig(config?.beneficiaryLoginConfig);
  const [benLoginTitle, setBenLoginTitle] = useState(initialBenCfg.title);
  const [benLoginSubtitle, setBenLoginSubtitle] = useState(initialBenCfg.subtitle);
  const [benLoginWelcomeNote, setBenLoginWelcomeNote] = useState(initialBenCfg.welcomeNote);
  const [benLoginPhoneLabel, setBenLoginPhoneLabel] = useState(initialBenCfg.phoneLabel);
  const [benLoginPhoneHelperText, setBenLoginPhoneHelperText] = useState(
    initialBenCfg.phoneHelperText
  );
  const [benLoginSubmitBtn, setBenLoginSubmitBtn] = useState(initialBenCfg.submitButtonText);
  const [benLoginVerifyBtn, setBenLoginVerifyBtn] = useState(initialBenCfg.verifyButtonText);
  const [benLoginFooterText, setBenLoginFooterText] = useState(initialBenCfg.footerText);
  const [benLoginTheme, setBenLoginTheme] = useState(initialBenCfg.theme);
  const [benLoginBgDataUrl, setBenLoginBgDataUrl] = useState<string | null>(
    initialBenCfg.bgDataUrl
  );
  const [benLoginShowLogo, setBenLoginShowLogo] = useState(initialBenCfg.showLogo);
  const [benLoginShowSupportPhone, setBenLoginShowSupportPhone] = useState(
    initialBenCfg.showSupportPhone
  );
  const [savingBenLoginCfg, setSavingBenLoginCfg] = useState(false);
  const [benLoginCfgSuccess, setBenLoginCfgSuccess] = useState(false);
  const [benLoginCfgError, setBenLoginCfgError] = useState('');

  React.useEffect(() => {
    const parsed = parseBeneficiaryLoginConfig(config?.beneficiaryLoginConfig);
    setBenLoginTitle(parsed.title);
    setBenLoginSubtitle(parsed.subtitle);
    setBenLoginWelcomeNote(parsed.welcomeNote);
    setBenLoginPhoneLabel(parsed.phoneLabel);
    setBenLoginPhoneHelperText(parsed.phoneHelperText);
    setBenLoginSubmitBtn(parsed.submitButtonText);
    setBenLoginVerifyBtn(parsed.verifyButtonText);
    setBenLoginFooterText(parsed.footerText);
    setBenLoginTheme(parsed.theme);
    setBenLoginBgDataUrl(parsed.bgDataUrl);
    setBenLoginShowLogo(parsed.showLogo);
    setBenLoginShowSupportPhone(parsed.showSupportPhone);
  }, [config?.beneficiaryLoginConfig]);

  const cleanSlugPreview = (raw: string, fallback: string) =>
    raw
      .trim()
      .toLowerCase()
      .replace(/^\/+|\/+$/g, '')
      .replace(/[^a-z0-9-_]/g, '') || fallback;

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicFormUrl = `${baseOrigin}/form`;
  const effectiveBeneficiarySlug = cleanSlugPreview(beneficiaryLoginSlug, 'beneficiary');
  const effectiveAdminSlug = cleanSlugPreview(adminLoginSlug, 'admin-portal');
  const beneficiaryPortalUrl = `${baseOrigin}/${effectiveBeneficiarySlug}`;
  const adminPortalUrl = `${baseOrigin}/${effectiveAdminSlug}`;
  const customDomainOrigin = config?.appDomain ? `https://${config.appDomain}` : '';

  const handleCopyAccessUrl = (key: 'form' | 'beneficiary' | 'admin', url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkKey(key);
    setTimeout(() => setCopiedLinkKey(null), 2500);
  };

  const generateRandomAdminSlug = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    setAdminLoginSlug(`modir-${suffix}`);
  };

  const handleSaveAccessLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessLinksError('');
    setAccessLinksSuccess(false);
    setSavingAccessLinks(true);
    try {
      const updated = await api.updateConfig({
        beneficiaryLoginSlug: beneficiaryLoginSlug.trim(),
        adminLoginSlug: adminLoginSlug.trim(),
        hideAdminLoginButton,
      });
      setBeneficiaryLoginSlug(updated.beneficiaryLoginSlug || 'beneficiary');
      setAdminLoginSlug(updated.adminLoginSlug || 'admin-portal');
      setHideAdminLoginButton(updated.hideAdminLoginButton !== false);
      onConfigUpdated(updated);
      setAccessLinksSuccess(true);
      setTimeout(() => setAccessLinksSuccess(false), 4000);
    } catch (err: any) {
      setAccessLinksError(err?.message || 'خطا در ذخیره تنظیمات لینک‌های دسترسی');
    } finally {
      setSavingAccessLinks(false);
    }
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoginBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLoginBgDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess(false);
    try {
      const updated = await api.updateConfig({
        instName,
        automationTitle,
        phone,
        address,
        notice,
        logoDataUrl,
      });
      onConfigUpdated(updated);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch {
      setLoginCfgError('خطا در ذخیره تنظیمات هویتی');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveLoginCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginCfgError('');
    if (!loginAllowPassword && !loginAllowOtp) {
      setLoginCfgError('حداقل یکی از روش‌های ورود (رمز عبور یا موبایل) باید فعال باشد.');
      return;
    }
    setSavingLoginCfg(true);
    setLoginCfgSuccess(false);
    try {
      const updated = await api.updateConfig({
        loginTitle: loginTitle.trim() || 'ورود به پنل کادر خیریه',
        loginSubtitle: loginSubtitle.trim(),
        loginWelcomeNote: loginWelcomeNote.trim(),
        loginFooterText: loginFooterText.trim(),
        loginTheme,
        loginBgDataUrl,
        loginShowLogo,
        loginAllowPassword,
        loginAllowOtp,
        loginShowBackLink,
      });
      onConfigUpdated(updated);
      setLoginCfgSuccess(true);
      setTimeout(() => setLoginCfgSuccess(false), 3000);
    } catch {
      setLoginCfgError('خطا در ذخیره تنظیمات صفحه ورود');
    } finally {
      setSavingLoginCfg(false);
    }
  };

  const handleBenLoginBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setBenLoginBgDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBeneficiaryLoginCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    setBenLoginCfgError('');
    setSavingBenLoginCfg(true);
    setBenLoginCfgSuccess(false);
    try {
      const payload = {
        title: benLoginTitle.trim() || DEFAULT_BENEFICIARY_LOGIN_CONFIG.title,
        subtitle: benLoginSubtitle.trim(),
        welcomeNote: benLoginWelcomeNote.trim(),
        phoneLabel: benLoginPhoneLabel.trim() || DEFAULT_BENEFICIARY_LOGIN_CONFIG.phoneLabel,
        phoneHelperText: benLoginPhoneHelperText.trim(),
        submitButtonText:
          benLoginSubmitBtn.trim() || DEFAULT_BENEFICIARY_LOGIN_CONFIG.submitButtonText,
        verifyButtonText:
          benLoginVerifyBtn.trim() || DEFAULT_BENEFICIARY_LOGIN_CONFIG.verifyButtonText,
        footerText: benLoginFooterText.trim(),
        theme: benLoginTheme,
        bgDataUrl: benLoginBgDataUrl,
        showLogo: benLoginShowLogo,
        showSupportPhone: benLoginShowSupportPhone,
      };
      const updated = await api.updateConfig({
        beneficiaryLoginConfig: JSON.stringify(payload),
      });
      onConfigUpdated(updated);
      setBenLoginCfgSuccess(true);
      setTimeout(() => setBenLoginCfgSuccess(false), 3500);
    } catch (err: any) {
      setBenLoginCfgError(err?.message || 'خطا در ذخیره تنظیمات صفحه ورود مددجو');
    } finally {
      setSavingBenLoginCfg(false);
    }
  };

  const handleResetBeneficiaryLoginDefaults = () => {
    setBenLoginTitle(DEFAULT_BENEFICIARY_LOGIN_CONFIG.title);
    setBenLoginSubtitle(DEFAULT_BENEFICIARY_LOGIN_CONFIG.subtitle);
    setBenLoginWelcomeNote(DEFAULT_BENEFICIARY_LOGIN_CONFIG.welcomeNote);
    setBenLoginPhoneLabel(DEFAULT_BENEFICIARY_LOGIN_CONFIG.phoneLabel);
    setBenLoginPhoneHelperText(DEFAULT_BENEFICIARY_LOGIN_CONFIG.phoneHelperText);
    setBenLoginSubmitBtn(DEFAULT_BENEFICIARY_LOGIN_CONFIG.submitButtonText);
    setBenLoginVerifyBtn(DEFAULT_BENEFICIARY_LOGIN_CONFIG.verifyButtonText);
    setBenLoginFooterText(DEFAULT_BENEFICIARY_LOGIN_CONFIG.footerText);
    setBenLoginTheme(DEFAULT_BENEFICIARY_LOGIN_CONFIG.theme);
    setBenLoginBgDataUrl(DEFAULT_BENEFICIARY_LOGIN_CONFIG.bgDataUrl);
    setBenLoginShowLogo(DEFAULT_BENEFICIARY_LOGIN_CONFIG.showLogo);
    setBenLoginShowSupportPhone(DEFAULT_BENEFICIARY_LOGIN_CONFIG.showSupportPhone);
  };

  const handleResetLoginDefaults = () => {
    setLoginTitle('ورود به پنل کادر خیریه');
    setLoginSubtitle('');
    setLoginWelcomeNote('');
    setLoginFooterText('دسترسی اختصاصی کادر و مدیران مجاز مؤسسه');
    setLoginTheme('emerald');
    setLoginBgDataUrl(null);
    setLoginShowLogo(true);
    setLoginAllowPassword(true);
    setLoginAllowOtp(true);
    setLoginShowBackLink(true);
  };

  const handleAddNeedCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeedCat.trim()) return;
    setCatLoading(true);
    setCatError('');
    try {
      await api.addNeedCategory(newNeedCat.trim());
      setNewNeedCat('');
      onRefreshCategories();
    } catch (err: any) {
      setCatError(err.message || 'خطا در ثبت دسته نیاز');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteNeedCategory = async (id: number) => {
    if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) return;
    setCatError('');
    try {
      await api.deleteNeedCategory(id);
      onRefreshCategories();
    } catch (err: any) {
      setCatError(err.message || 'خطا در حذف دسته‌بندی');
    }
  };

  const handleAddProgCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgCat.trim()) return;
    setCatLoading(true);
    setCatError('');
    try {
      await api.addProgramCategory(newProgCat.trim());
      setNewProgCat('');
      onRefreshCategories();
    } catch (err: any) {
      setCatError(err.message || 'خطا در ثبت دسته طرح');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteProgCategory = async (id: number) => {
    if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) return;
    setCatError('');
    try {
      await api.deleteProgramCategory(id);
      onRefreshCategories();
    } catch (err: any) {
      setCatError(err.message || 'خطا در حذف دسته‌بندی');
    }
  };

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    setRestoreErr('');
    try {
      await api.downloadBackup();
    } catch (err: any) {
      setRestoreErr(err.message || 'خطا در دریافت نسخه پشتیبان');
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setRestoring(true);
        setRestoreErr('');
        const json = JSON.parse(reader.result as string);
        await api.restoreBackup(json);
        setRestoreMsg('بازیابی دیتابیس با موفقیت انجام شد. صفحه رفرش می‌شود...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setRestoreErr(err.message || 'فایل پشتیبان نامعتبر است');
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Dedicated Access Links Manager (Beneficiary Login, Hidden Admin Login, Public Form) */}
      <form
        onSubmit={handleSaveAccessLinks}
        className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                مدیریت لینک‌های دسترسی (ورود مددجو، ورود مخفی مدیریت و فرم عمومی)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                لینک اختصاصی مددجویان (بدون نمایش گزینه ورود مدیریت) و آدرس مخفی ورود کادر را از اینجا مشاهده، کپی و ویرایش کنید.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingAccessLinks}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{savingAccessLinks ? 'در حال ذخیره...' : 'ذخیره لینک‌های دسترسی'}</span>
          </button>
        </div>

        {accessLinksSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تنظیمات لینک‌های دسترسی با موفقیت ذخیره شد. لطفاً لینک اختصاصی مدیریت را یادداشت یا Bookmark کنید.</span>
          </div>
        )}

        {accessLinksError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 whitespace-pre-line">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{accessLinksError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
          {/* 1. Dedicated Beneficiary Login Link */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-teal-950">
                    ۱. لینک اختصاصی ورود مددجو (مناسب پیامک)
                  </h4>
                  <p className="text-[11px] text-teal-800/80">
                    ورود فقط با موبایل و کد تایید — بدون هیچ دکمه‌ای برای ورود مدیریت
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                مسیر آدرس ورود مددجو (Slug انگلیسی):
              </label>
              <div className="flex items-center gap-1.5 dir-ltr">
                <span className="px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[11px] shrink-0">
                  /
                </span>
                <input
                  type="text"
                  required
                  value={beneficiaryLoginSlug}
                  onChange={(e) => setBeneficiaryLoginSlug(e.target.value)}
                  placeholder="beneficiary"
                  className="flex-1 px-3 py-2 rounded-xl border border-teal-300 bg-white outline-none focus:ring-2 focus:ring-teal-500 font-mono text-left text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="bg-white border border-teal-200 rounded-xl p-2.5 space-y-2">
              <div className="font-mono text-[11px] text-teal-900 dir-ltr text-left break-all select-all">
                {beneficiaryPortalUrl}
              </div>
              {customDomainOrigin && (
                <div className="font-mono text-[10px] text-slate-500 dir-ltr text-left break-all border-t border-slate-100 pt-1.5">
                  دامنه اصلی: {`${customDomainOrigin}/${effectiveBeneficiarySlug}`}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyAccessUrl(
                      'beneficiary',
                      customDomainOrigin
                        ? `${customDomainOrigin}/${effectiveBeneficiarySlug}`
                        : beneficiaryPortalUrl
                    )
                  }
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  {copiedLinkKey === 'beneficiary' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLinkKey === 'beneficiary' ? 'کپی شد!' : 'کپی لینک برای ارسال به مددجو'}</span>
                </button>
                <a
                  href={`/${effectiveBeneficiarySlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>مشاهده</span>
                </a>
              </div>
            </div>
          </div>

          {/* 2. Secret / Private Admin Login Link */}
          <div className="rounded-2xl border border-slate-300 bg-slate-900 text-white p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    ۲. لینک مخفی و اختصاصی ورود مدیریت / کادر
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    این آدرس در هیچ صفحه‌ای نمایش داده نمی‌شود و فقط در اختیار مدیران است
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-200">
                  مسیر مخفی ورود مدیریت (Slug انگلیسی):
                </label>
                <button
                  type="button"
                  onClick={generateRandomAdminSlug}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>تولید آدرس تصادفی امن</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5 dir-ltr">
                <span className="px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[11px] shrink-0">
                  /
                </span>
                <input
                  type="text"
                  required
                  value={adminLoginSlug}
                  onChange={(e) => setAdminLoginSlug(e.target.value)}
                  placeholder="admin-portal"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 outline-none focus:ring-2 focus:ring-amber-400 font-mono text-left text-xs font-bold text-amber-200"
                />
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-700 rounded-xl p-2.5 space-y-2">
              <div className="font-mono text-[11px] text-amber-200 dir-ltr text-left break-all select-all">
                {adminPortalUrl}
              </div>
              {customDomainOrigin && (
                <div className="font-mono text-[10px] text-slate-400 dir-ltr text-left break-all border-t border-slate-800 pt-1.5">
                  دامنه اصلی: {`${customDomainOrigin}/${effectiveAdminSlug}`}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyAccessUrl(
                      'admin',
                      customDomainOrigin
                        ? `${customDomainOrigin}/${effectiveAdminSlug}`
                        : adminPortalUrl
                    )
                  }
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition cursor-pointer"
                >
                  {copiedLinkKey === 'admin' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLinkKey === 'admin' ? 'کپی شد!' : 'کپی لینک مخفی مدیریت'}</span>
                </button>
                <a
                  href={`/${effectiveAdminSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-600 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>مشاهده</span>
                </a>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hideAdminLoginButton}
                onChange={(e) => setHideAdminLoginButton(e.target.checked)}
                className="mt-0.5 rounded text-amber-400 focus:ring-amber-400"
              />
              <span className="text-[11px] text-slate-200 leading-relaxed">
                <strong className="text-amber-300 inline-flex items-center gap-1 ml-1">
                  <EyeOff className="w-3.5 h-3.5" />
                  مخفی‌سازی کامل دکمه ورود مدیریت
                </strong>
                از هدر صفحه اصلی، صفحه ورود مددجو و پروفایل مددجویان (ورود کادر فقط از طریق لینک مخفی بالا امکان‌پذیر باشد)
              </span>
            </label>
          </div>
        </div>

        {/* 3. Public Request Form Link Compact Row */}
        <div className="bg-emerald-950 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <span className="font-bold text-xs text-amber-300 block">
              ۳. لینک مستقل فرم درخواست عمومی مراجعین (بدون منو و دکمه ورود):
            </span>
            <span className="font-mono text-xs text-emerald-200 dir-ltr block truncate select-all">
              {publicFormUrl}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopyAccessUrl('form', publicFormUrl)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {copiedLinkKey === 'form' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLinkKey === 'form' ? 'کپی شد!' : 'کپی لینک فرم'}</span>
            </button>
            <a
              href="/form"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs border border-emerald-600/60 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>مشاهده</span>
            </a>
          </div>
        </div>
      </form>

      {/* Identity & Visual Branding */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Building className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-base text-slate-900">
              تنظیمات هویت سازمانی، نام مؤسسه و لوگو
            </h3>
            <p className="text-xs text-slate-500">
              این عناوین در سربرگ حواله‌ها، پیامک‌ها و فرم عمومی مراجعین نمایش داده می‌شوند.
            </p>
          </div>
        </div>

        {configSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تنظیمات هویتی مؤسسه با موفقیت در دیتابیس ذخیره شد.</span>
          </div>
        )}

        <form onSubmit={handleSaveIdentity} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">نام مؤسسه خیریه</label>
              <input
                type="text"
                required
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">عنوان زیرسربرگ اتوماسیون</label>
              <input
                type="text"
                required
                value={automationTitle}
                onChange={(e) => setAutomationTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">شماره تماس ثابت / همراه خیریه</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none font-mono dir-ltr text-right"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">آدرس رسمی دفتر مؤسسه</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              متن اطلاعیه عمومی در بالای فرم پذیرش
            </label>
            <textarea
              rows={2}
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none"
            />
          </div>

          {/* Logo Management */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl border border-slate-300 bg-white overflow-hidden flex items-center justify-center">
                {logoDataUrl ? (
                  <img src={logoDataUrl} alt="لوگو" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <span className="font-bold text-slate-800 block">نشان و لوگوی خیریه</span>
                <span className="text-[11px] text-slate-500">
                  فرمت‌های PNG، JPG و SVG تا حداکثر ۲ مگابایت
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl cursor-pointer font-semibold shadow-sm transition">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>بارگذاری تصویر لوگو</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>

              {logoDataUrl && (
                <button
                  type="button"
                  onClick={() => setLogoDataUrl(null)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                  title="حذف لوگو و استفاده از پیش‌فرض"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition"
            >
              {savingConfig ? 'در حال ذخیره...' : 'ذخیره تنظیمات هویتی'}
            </button>
          </div>
        </form>
      </div>

      {/* Real SMS OTP Authentication & WebOTP App Domain Settings */}
      <OtpSmsSettingsCard
        currentUser={currentUser}
        config={config}
        onConfigUpdated={(updated) => {
          setLoginAllowOtp(updated.loginAllowOtp !== false);
          onConfigUpdated(updated);
        }}
        onCurrentUserUpdated={onCurrentUserUpdated}
        onOpenSmsTab={onOpenSmsTab}
      />

      {/* Login Pages Customization Section (Beneficiary Login & Staff Login) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">
                شخصی‌سازی ظاهر و متن‌های صفحات ورود (مددجو و کادر)
              </h3>
              <p className="text-xs text-slate-500">
                متن‌ها، رنگ‌بندی، تصویر پس‌زمینه، لوگو و امکانات صفحه ورود مددجویان (صفحه اصلی) و صفحه ورود کادر را جداگانه ویرایش کنید.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              loginEditorTab === 'beneficiary'
                ? handleResetBeneficiaryLoginDefaults
                : handleResetLoginDefaults
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition self-start sm:self-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازگردانی به پیش‌فرض</span>
          </button>
        </div>

        {/* Sub-Tabs: Beneficiary Login vs Staff Login */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setLoginEditorTab('beneficiary')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              loginEditorTab === 'beneficiary'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-teal-600" />
            <span>صفحه ورود مددجو (صفحه اصلی)</span>
          </button>
          <button
            type="button"
            onClick={() => setLoginEditorTab('staff')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              loginEditorTab === 'staff'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>صفحه ورود کادر و مدیریت</span>
          </button>
        </div>

        {loginEditorTab === 'beneficiary' ? (
          <>
            {benLoginCfgSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تنظیمات صفحه ورود مددجو با موفقیت ذخیره شد و فوراً در صفحه اصلی اعمال گردید.</span>
              </div>
            )}

            {benLoginCfgError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{benLoginCfgError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
              {/* Beneficiary Login Customization Form (3 Cols) */}
              <form
                onSubmit={handleSaveBeneficiaryLoginCustomization}
                className="lg:col-span-3 space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      تیتر اصلی کارت ورود مددجو
                    </label>
                    <input
                      type="text"
                      value={benLoginTitle}
                      onChange={(e) => setBenLoginTitle(e.target.value)}
                      placeholder="ورود به پروفایل اختصاصی مددجو"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      عنوان فیلد شماره همراه
                    </label>
                    <input
                      type="text"
                      value={benLoginPhoneLabel}
                      onChange={(e) => setBenLoginPhoneLabel(e.target.value)}
                      placeholder="شماره همراه"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    زیرعنوان / توضیح زیر تیتر (اختیاری)
                  </label>
                  <textarea
                    rows={2}
                    value={benLoginSubtitle}
                    onChange={(e) => setBenLoginSubtitle(e.target.value)}
                    placeholder={`پیش‌فرض: ${instName} — تکمیل و ویرایش فرم‌ها، بارگذاری مدارک و مشاهده پیغام کارشناسان`}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    پیام خوشامدگویی یا اطلاعیه بالای فرم (اختیاری)
                  </label>
                  <textarea
                    rows={2}
                    value={benLoginWelcomeNote}
                    onChange={(e) => setBenLoginWelcomeNote(e.target.value)}
                    placeholder="مثال: مددجویان گرامی، جهت پیگیری پرونده یا تکمیل مدارک با شماره موبایل ثبت‌شده وارد شوید."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    متن راهنمای زیر کادر شماره موبایل
                  </label>
                  <input
                    type="text"
                    value={benLoginPhoneHelperText}
                    onChange={(e) => setBenLoginPhoneHelperText(e.target.value)}
                    placeholder="پس از وارد کردن شماره همراه، یک کد تایید یک‌بارمصرف به گوشی شما پیامک می‌شود."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      متن دکمه ارسال کد تایید
                    </label>
                    <input
                      type="text"
                      value={benLoginSubmitBtn}
                      onChange={(e) => setBenLoginSubmitBtn(e.target.value)}
                      placeholder="ارسال کد تایید به شماره همراه"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      متن دکمه تایید کد و ورود
                    </label>
                    <input
                      type="text"
                      value={benLoginVerifyBtn}
                      onChange={(e) => setBenLoginVerifyBtn(e.target.value)}
                      placeholder="تایید و ورود به پروفایل مددجو"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    متن پاورقی پایین کارت ورود (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={benLoginFooterText}
                    onChange={(e) => setBenLoginFooterText(e.target.value)}
                    placeholder="مثال: تمامی اطلاعات شما با حفظ کامل محرمانگی نزد واحد مددکاری محفوظ است."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Theme Selector */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-2">
                    تم رنگی صفحه ورود مددجو
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(LOGIN_THEMES).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBenLoginTheme(t.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          benLoginTheme === t.id
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full ${t.swatch} border border-white/50`}
                        />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Background Image */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 rounded-xl border border-slate-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                      {benLoginBgDataUrl ? (
                        <img
                          src={benLoginBgDataUrl}
                          alt="پس‌زمینه ورود مددجو"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">
                        تصویر پس‌زمینه صفحه ورود مددجو (اختیاری)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        در صورت بارگذاری، با لایه تیره ملایم در پس‌زمینه کارت ورود نمایش داده می‌شود
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl cursor-pointer font-semibold shadow-sm transition">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>انتخاب تصویر</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBenLoginBgUpload}
                        className="hidden"
                      />
                    </label>

                    {benLoginBgDataUrl && (
                      <button
                        type="button"
                        onClick={() => setBenLoginBgDataUrl(null)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
                        title="حذف تصویر پس‌زمینه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Options Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={benLoginShowLogo}
                      onChange={(e) => setBenLoginShowLogo(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-slate-700">
                      نمایش لوگوی مؤسسه در کارت ورود مددجو
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={benLoginShowSupportPhone}
                      onChange={(e) => setBenLoginShowSupportPhone(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-slate-700">
                      نمایش شماره تلفن پشتیبانی در پایین کارت
                    </span>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingBenLoginCfg}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
                  >
                    {savingBenLoginCfg ? 'در حال ذخیره...' : 'ذخیره تنظیمات صفحه ورود مددجو'}
                  </button>
                </div>
              </form>

              {/* Live Mini Preview for Beneficiary Login (2 Cols) */}
              <div className="lg:col-span-2 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  پیش‌نمایش زنده صفحه ورود مددجو:
                </span>
                {(() => {
                  const previewTheme = getLoginTheme(benLoginTheme);
                  return (
                    <div
                      className={`relative rounded-2xl border border-slate-200 p-5 overflow-hidden flex items-center justify-center min-h-[380px] ${
                        benLoginBgDataUrl ? 'bg-slate-900' : 'bg-slate-100'
                      }`}
                    >
                      {benLoginBgDataUrl && (
                        <>
                          <img
                            src={benLoginBgDataUrl}
                            alt="پیش‌نمایش پس‌زمینه مددجو"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/55" />
                        </>
                      )}

                      <div className="relative z-10 w-full max-w-[275px] bg-white/95 rounded-2xl shadow-lg border border-slate-200/80 p-5 space-y-3.5 text-center">
                        {benLoginShowLogo && logoDataUrl ? (
                          <div className="w-11 h-11 rounded-xl mx-auto overflow-hidden border border-slate-200 shadow bg-white p-0.5">
                            <img
                              src={logoDataUrl}
                              alt="لوگو"
                              className="w-full h-full object-cover rounded-[10px]"
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-11 h-11 bg-gradient-to-tr ${previewTheme.iconBox} rounded-xl mx-auto flex items-center justify-center text-white shadow`}
                          >
                            <UserCheck className="w-6 h-6" />
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-black text-slate-900 truncate">
                            {benLoginTitle || DEFAULT_BENEFICIARY_LOGIN_CONFIG.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {benLoginSubtitle.trim() ||
                              `${instName} — تکمیل و ویرایش فرم‌ها، بارگذاری مدارک و مشاهده پیغام کارشناسان`}
                          </p>
                        </div>

                        {benLoginWelcomeNote.trim() && (
                          <div
                            className={`p-2 rounded-lg border text-[10px] text-right flex items-start gap-1.5 ${previewTheme.welcomeBox}`}
                          >
                            <Info className="w-3 h-3 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{benLoginWelcomeNote}</span>
                          </div>
                        )}

                        <div className="space-y-1.5 text-right">
                          <span className="block text-[10px] font-semibold text-slate-700">
                            {benLoginPhoneLabel || 'شماره همراه'}
                          </span>
                          <div className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 flex items-center justify-between text-[10px] text-slate-400">
                            <Smartphone className="w-3 h-3" />
                            <span className="font-mono">09123456789</span>
                          </div>
                          {benLoginPhoneHelperText.trim() && (
                            <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed">
                              {benLoginPhoneHelperText}
                            </p>
                          )}
                          <div
                            className={`h-8 rounded-lg bg-gradient-to-r ${previewTheme.button} text-white text-[10px] font-bold flex items-center justify-center shadow-sm px-2 truncate`}
                          >
                            {benLoginSubmitBtn ||
                              DEFAULT_BENEFICIARY_LOGIN_CONFIG.submitButtonText}
                          </div>
                        </div>

                        {(benLoginFooterText.trim() || (benLoginShowSupportPhone && phone)) && (
                          <div className="pt-2 border-t border-slate-100 space-y-0.5">
                            {benLoginFooterText.trim() && (
                              <div className="text-[9px] text-slate-400 truncate">
                                {benLoginFooterText}
                              </div>
                            )}
                            {benLoginShowSupportPhone && phone && (
                              <div className="text-[10px] font-mono font-bold text-slate-600 dir-ltr">
                                {phone}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        ) : (
          <>
            {loginCfgSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تنظیمات صفحه ورود کادر با موفقیت ذخیره شد و فوراً اعمال گردید.</span>
              </div>
            )}

            {loginCfgError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginCfgError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Customization Form (3 Cols) */}
          <form onSubmit={handleSaveLoginCustomization} className="lg:col-span-3 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  تیتر اصلی کارت ورود
                </label>
                <input
                  type="text"
                  value={loginTitle}
                  onChange={(e) => setLoginTitle(e.target.value)}
                  placeholder="ورود به پنل کادر خیریه"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  زیرعنوان صفحه ورود (اختیاری)
                </label>
                <input
                  type="text"
                  value={loginSubtitle}
                  onChange={(e) => setLoginSubtitle(e.target.value)}
                  placeholder={`پیش‌فرض: ${instName}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                پیام خوشامدگویی یا اطلاعیه داخل صفحه ورود (اختیاری)
              </label>
              <textarea
                rows={2}
                value={loginWelcomeNote}
                onChange={(e) => setLoginWelcomeNote(e.target.value)}
                placeholder="مثال: همکاران گرامی، جهت ورود با موبایل از تب دوم استفاده نمایید."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                متن پاورقی کارت ورود
              </label>
              <input
                type="text"
                value={loginFooterText}
                onChange={(e) => setLoginFooterText(e.target.value)}
                placeholder="دسترسی اختصاصی کادر و مدیران مجاز مؤسسه"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Theme Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-2">
                تم رنگی صفحه ورود
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.values(LOGIN_THEMES).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLoginTheme(t.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      loginTheme === t.id
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${t.swatch} border border-white/50`} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Background Image */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-xl border border-slate-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                  {loginBgDataUrl ? (
                    <img src={loginBgDataUrl} alt="پس‌زمینه" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">تصویر پس‌زمینه صفحه ورود (اختیاری)</span>
                  <span className="text-[11px] text-slate-500">
                    در صورت بارگذاری، با لایه تیره ملایم در پس‌زمینه فرم ورود نمایش داده می‌شود
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl cursor-pointer font-semibold shadow-sm transition">
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>انتخاب تصویر</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLoginBgUpload}
                    className="hidden"
                  />
                </label>

                {loginBgDataUrl && (
                  <button
                    type="button"
                    onClick={() => setLoginBgDataUrl(null)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                    title="حذف تصویر پس‌زمینه"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Options Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loginShowLogo}
                  onChange={(e) => setLoginShowLogo(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-700">نمایش لوگوی مؤسسه در کارت ورود</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loginShowBackLink}
                  onChange={(e) => setLoginShowBackLink(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-700">نمایش دکمه بازگشت به فرم عمومی</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loginAllowPassword}
                  onChange={(e) => {
                    if (!e.target.checked && !loginAllowOtp) return;
                    setLoginAllowPassword(e.target.checked);
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-700">فعال بودن ورود با نام کاربری و رمز</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loginAllowOtp}
                  onChange={(e) => {
                    if (!e.target.checked && !loginAllowPassword) return;
                    setLoginAllowOtp(e.target.checked);
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-700">فعال بودن ورود با موبایل (OTP)</span>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingLoginCfg}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition cursor-pointer"
              >
                {savingLoginCfg ? 'در حال ذخیره...' : 'ذخیره تنظیمات صفحه ورود'}
              </button>
            </div>
          </form>

          {/* Live Mini Preview (2 Cols) */}
          <div className="lg:col-span-2 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              پیش‌نمایش زنده صفحه ورود:
            </span>
            {(() => {
              const previewTheme = getLoginTheme(loginTheme);
              return (
                <div
                  className={`relative rounded-2xl border border-slate-200 p-5 overflow-hidden flex items-center justify-center min-h-[340px] ${
                    loginBgDataUrl ? 'bg-slate-900' : 'bg-slate-100'
                  }`}
                >
                  {loginBgDataUrl && (
                    <>
                      <img
                        src={loginBgDataUrl}
                        alt="پیش‌نمایش پس‌زمینه"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/55" />
                    </>
                  )}

                  <div className="relative z-10 w-full max-w-[270px] bg-white/95 rounded-2xl shadow-lg border border-slate-200/80 p-5 space-y-3.5 text-center">
                    {loginShowLogo && logoDataUrl ? (
                      <div className="w-11 h-11 rounded-xl mx-auto overflow-hidden border border-slate-200 shadow bg-white p-0.5">
                        <img src={logoDataUrl} alt="لوگو" className="w-full h-full object-cover rounded-[10px]" />
                      </div>
                    ) : (
                      <div
                        className={`w-11 h-11 bg-gradient-to-tr ${previewTheme.iconBox} rounded-xl mx-auto flex items-center justify-center text-white shadow`}
                      >
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {loginTitle || 'ورود به پنل کادر خیریه'}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {loginSubtitle || instName}
                      </p>
                    </div>

                    {loginWelcomeNote.trim() && (
                      <div
                        className={`p-2 rounded-lg border text-[10px] text-right flex items-start gap-1.5 ${previewTheme.welcomeBox}`}
                      >
                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{loginWelcomeNote}</span>
                      </div>
                    )}

                    {loginAllowPassword && loginAllowOtp && (
                      <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-xl text-[9px] font-bold">
                        <div className={`py-1.5 rounded-lg bg-white shadow-2xs flex items-center justify-center gap-1 ${previewTheme.tabActive}`}>
                          <Lock className="w-2.5 h-2.5" />
                          <span>رمز عبور</span>
                        </div>
                        <div className="py-1.5 text-slate-500 flex items-center justify-center gap-1">
                          <Smartphone className="w-2.5 h-2.5" />
                          <span>موبایل</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-right">
                      <div className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 flex items-center text-[10px] text-slate-400">
                        {loginAllowPassword ? 'نام کاربری / موبایل' : '09123456789'}
                      </div>
                      {loginAllowPassword && (
                        <div className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 flex items-center text-[10px] text-slate-400">
                          ••••••
                        </div>
                      )}
                      <div
                        className={`h-8 rounded-lg bg-gradient-to-r ${previewTheme.button} text-white text-[11px] font-bold flex items-center justify-center shadow-sm`}
                      >
                        {loginAllowPassword ? 'ورود به سامانه' : 'دریافت کد تایید'}
                      </div>
                    </div>

                    {loginFooterText.trim() && (
                      <div className="pt-2 border-t border-slate-100 text-[9px] text-slate-400 truncate">
                        {loginFooterText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
          </>
        )}
      </div>

      {/* Shortcut Card: Public Form Customization moved to Form Builder */}
      {onOpenFormBuilder && (
        <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-950">
                شخصی‌سازی فرم درخواست عمومی مراجعین به بخش «فرم‌ساز» منتقل شده است
              </h4>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                فرم درخواست عمومی به عنوان فرم از پیش ثبت‌شده در بالای لیست فرم‌ساز قابل ویرایش و الگوبرداری است.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenFormBuilder}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer shrink-0"
          >
            <ClipboardList className="w-4 h-4" />
            <span>ورود به بخش فرم‌ساز</span>
          </button>
        </div>
      )}

      {/* Dynamic Categories Management */}
      {catError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{catError}</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Need Categories */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Tag className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-sm text-slate-900">
              مدیریت دسته‌بندی‌های فرم نیازسنجی مردمی
            </h4>
          </div>

          <form onSubmit={handleAddNeedCategory} className="flex gap-2 text-xs">
            <input
              type="text"
              required
              placeholder="نام دسته جدید (مثال: تعمیرات مسکن)"
              value={newNeedCat}
              onChange={(e) => setNewNeedCat(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={catLoading}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن</span>
            </button>
          </form>

          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {needCategories.map((c) => (
              <div
                key={c.id}
                className="py-2.5 flex items-center justify-between text-xs text-slate-800"
              >
                <span>{c.name}</span>
                <button
                  onClick={() => handleDeleteNeedCategory(c.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Program Categories */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Tag className="w-5 h-5 text-teal-600" />
            <h4 className="font-bold text-sm text-slate-900">
              مدیریت دسته‌بندی‌های طرح‌ها و پروژه‌های خیریه
            </h4>
          </div>

          <form onSubmit={handleAddProgCategory} className="flex gap-2 text-xs">
            <input
              type="text"
              required
              placeholder="نام دسته جدید (مثال: آبرسانی به روستاها)"
              value={newProgCat}
              onChange={(e) => setNewProgCat(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={catLoading}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن</span>
            </button>
          </form>

          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {programCategories.map((c) => (
              <div
                key={c.id}
                className="py-2.5 flex items-center justify-between text-xs text-slate-800"
              >
                <span>{c.name}</span>
                <button
                  onClick={() => handleDeleteProgCategory(c.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-5 h-5 text-amber-400" />
          <h4 className="font-bold text-sm text-white">
            پشتیبان‌گیری و بازیابی اطلاعات سامانه
          </h4>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          جهت حفظ امنیت و یکپارچگی اطلاعات، می‌توانید در هر زمان از تمامی پرونده‌های مراجعین، مصوبات مالی، طرح‌ها و تنظیمات سامانه نسخه پشتیبان کامل دریافت یا بازیابی نمایید.
        </p>

        {restoreMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-xl text-emerald-300 text-xs">
            {restoreMsg}
          </div>
        )}

        {restoreErr && (
          <div className="p-3 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-300 text-xs">
            {restoreErr}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Download Backup */}
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={downloadingBackup}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingBackup ? 'در حال آماده‌سازی...' : 'دریافت نسخه پشتیبان کامل'}</span>
          </button>

          {/* Restore Backup */}
          <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl cursor-pointer shadow transition">
            <UploadCloud className="w-4 h-4 text-amber-400" />
            <span>{restoring ? 'در حال بازیابی...' : 'بازیابی از نسخه پشتیبان'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
