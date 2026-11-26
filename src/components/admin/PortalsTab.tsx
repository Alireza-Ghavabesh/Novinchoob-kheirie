import React, { useState, useRef } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  Image as ImageIcon,
  X,
  Save,
  FolderKanban,
  Globe,
  Info,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { LoginPortal } from '../../types';
import { api } from '../../services/api';
import { LOGIN_THEMES, LoginThemeConfig, getLoginTheme } from '../../utils/loginThemes';
import { toPersianDigits } from '../../utils/persian';

interface PortalsTabProps {
  portals: LoginPortal[];
  onRefresh: () => void | Promise<void>;
  onOpenProgramParticipants?: (programId: number) => void;
}

interface PortalDraft {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  welcomeNote: string;
  phoneLabel: string;
  phoneHelperText: string;
  submitButtonText: string;
  verifyButtonText: string;
  footerText: string;
  theme: LoginThemeConfig['id'];
  bgDataUrl: string | null;
  showLogo: boolean;
  showSupportPhone: boolean;
  isActive: boolean;
}

const EMPTY_DRAFT: PortalDraft = {
  title: '',
  slug: '',
  subtitle: '',
  welcomeNote: '',
  phoneLabel: 'شماره موبایل',
  phoneHelperText: 'کد تایید ۶ رقمی به این شماره پیامک خواهد شد.',
  submitButtonText: 'ارسال کد تایید پیامکی',
  verifyButtonText: 'تایید کد و ورود',
  footerText: '',
  theme: 'emerald',
  bgDataUrl: null,
  showLogo: true,
  showSupportPhone: true,
  isActive: true,
};

function slugifyInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-');
}

export const PortalsTab: React.FC<PortalsTabProps> = ({
  portals,
  onRefresh,
  onOpenProgramParticipants,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<PortalDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (portal: LoginPortal) => {
    setDraft({
      id: portal.id,
      title: portal.title || '',
      slug: portal.slug || '',
      subtitle: portal.subtitle || '',
      welcomeNote: portal.welcomeNote || '',
      phoneLabel: portal.phoneLabel || 'شماره موبایل',
      phoneHelperText: portal.phoneHelperText || '',
      submitButtonText: portal.submitButtonText || 'ارسال کد تایید پیامکی',
      verifyButtonText: portal.verifyButtonText || 'تایید کد و ورود',
      footerText: portal.footerText || '',
      theme: (LOGIN_THEMES[portal.theme]
        ? portal.theme
        : 'emerald') as LoginThemeConfig['id'],
      bgDataUrl: portal.bgDataUrl || null,
      showLogo: portal.showLogo !== false,
      showSupportPhone: portal.showSupportPhone !== false,
      isActive: portal.isActive !== false,
    });
    setError('');
    setModalOpen(true);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('حجم تصویر پس‌زمینه نباید بیشتر از ۳ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, bgDataUrl: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanTitle = draft.title.trim();
    const cleanSlug = slugifyInput(draft.slug.trim()).replace(/^-+|-+$/g, '');

    if (!cleanTitle) {
      setError('عنوان صفحه ورود اختصاصی الزامی است.');
      return;
    }
    if (!cleanSlug || cleanSlug.length < 2) {
      setError('شناسه لینک انگلیسی (حداقل ۲ کاراکتر، مانند quran-course) الزامی است.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...draft,
        title: cleanTitle,
        slug: cleanSlug,
      };
      if (draft.id) {
        await api.updatePortal(draft.id, payload);
      } else {
        await api.createPortal(payload);
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره صفحه ورود اختصاصی');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (portal: LoginPortal) => {
    const connectedCount = portal.connectedPrograms?.length || 0;
    const confirmed = window.confirm(
      connectedCount > 0
        ? `آیا از حذف صفحه ورود «${portal.title}» مطمئن هستید؟ اتصال ${connectedCount} پروژه به این صفحه قطع خواهد شد (اطلاعات شرکت‌کنندگان قبلی حفظ می‌شود).`
        : `آیا از حذف صفحه ورود اختصاصی «${portal.title}» مطمئن هستید؟`
    );
    if (!confirmed) return;

    setDeletingId(portal.id);
    try {
      await api.deletePortal(portal.id);
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'خطا در حذف صفحه ورود اختصاصی');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (portal: LoginPortal) => {
    const fullUrl = `${origin}/p/${portal.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(portal.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const previewTheme = getLoginTheme(draft.theme);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                صفحات ورود اختصاصی (پورتال‌های ویژه)
              </h2>
              <p className="text-xs text-slate-500">
                برای هر دوره، طرح یا گروه خاص (مثلاً شرکت‌کنندگان دوره آموزش قرآن) یک صفحه ورود با لینک اختصاصی بسازید و به پروژه متصل کنید.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ایجاد صفحه ورود اختصاصی جدید</span>
        </button>
      </div>

      {/* How-it-works quick guide */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold">نحوه استفاده و اتصال به پروژه:</p>
          <p className="text-indigo-900/85">
            ۱. ابتدا در این بخش یک صفحه ورود اختصاصی با لینک دلخواه (مثلاً <span className="font-mono font-bold dir-ltr inline-block">/p/quran-course</span>) ایجاد کنید.
            ۲. سپس در تب <strong>«طرح‌ها و پروژه‌ها»</strong> هنگام ایجاد یا ویرایش پروژه، این صفحه ورود و فرم‌های ثبت‌نام مربوط به پروژه را انتخاب نمایید.
            ۳. هر فردی با لینک اختصاصی وارد شود و فرم را تکمیل کند، به‌صورت خودکار در بخش <strong>«شرکت‌کنندگان»</strong> همان پروژه ثبت می‌شود.
          </p>
        </div>
      </div>

      {/* Portals Grid */}
      {portals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <Globe className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-800">
            هنوز صفحه ورود اختصاصی تعریف نشده است
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            می‌توانید برای دوره‌های آموزشی، رویدادها یا گروه‌های خاص یک صفحه ورود جداگانه با ظاهر و متن دلخواه بسازید تا مخاطبان آن گروه جدا از مددجویان عمومی وارد شوند.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ساخت اولین صفحه ورود اختصاصی</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {portals.map((portal) => {
            const theme = getLoginTheme(portal.theme);
            const fullUrl = `${origin}/p/${portal.slug}`;
            const connected = portal.connectedPrograms || [];

            return (
              <div
                key={portal.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  {/* Mini Header Strip */}
                  <div className={`h-2 w-full bg-gradient-to-r ${theme.iconBox}`} />

                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${theme.iconBox} text-white flex items-center justify-center shrink-0 shadow-sm`}
                        >
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-sm text-slate-900 truncate">
                            {portal.title}
                          </h3>
                          {portal.subtitle && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {portal.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          portal.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {portal.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>

                    {/* Shareable URL Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <code className="text-[11px] font-mono text-emerald-800 dir-ltr truncate select-all">
                        /p/{portal.slug}
                      </code>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(portal)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                          title="کپی لینک کامل"
                        >
                          {copiedId === portal.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>کپی شد</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>کپی لینک</span>
                            </>
                          )}
                        </button>
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                          title="باز کردن صفحه در تب جدید"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Connected Projects */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <FolderKanban className="w-3.5 h-3.5" />
                        پروژه‌های متصل ({toPersianDigits(connected.length)}):
                      </span>
                      {connected.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">
                          هنوز پروژه‌ای به این صفحه متصل نشده است.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {connected.map((prog) => (
                            <button
                              key={prog.id}
                              type="button"
                              onClick={() => onOpenProgramParticipants?.(prog.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-bold transition cursor-pointer"
                              title="مشاهده شرکت‌کنندگان این پروژه"
                            >
                              <span>{prog.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(portal)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-xs font-bold text-slate-700 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>ویرایش ظاهر و تنظیمات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(portal)}
                    disabled={deletingId === portal.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40"
                    title="حذف صفحه ورود اختصاصی"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {draft.id ? 'ویرایش صفحه ورود اختصاصی' : 'ایجاد صفحه ورود اختصاصی جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Form Fields (3 cols) */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        عنوان صفحه ورود <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={draft.title}
                        onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                        placeholder="مثلاً: ورود شرکت‌کنندگان دوره آموزش قرآن"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        شناسه لینک اختصاصی (انگلیسی) <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center dir-ltr">
                        <span className="px-2.5 py-2 rounded-l-xl bg-slate-100 border border-r-0 border-slate-300 text-xs font-mono text-slate-500">
                          /p/
                        </span>
                        <input
                          type="text"
                          required
                          dir="ltr"
                          value={draft.slug}
                          onChange={(e) =>
                            setDraft((p) => ({ ...p, slug: slugifyInput(e.target.value) }))
                          }
                          placeholder="quran-course"
                          className="w-full px-3 py-2 rounded-r-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      زیرعنوان / توضیح کوتاه زیر تیتر
                    </label>
                    <input
                      type="text"
                      value={draft.subtitle}
                      onChange={(e) => setDraft((p) => ({ ...p, subtitle: e.target.value }))}
                      placeholder="مثلاً: ویژه ثبت‌نام‌کنندگان دوره حفظ و قرائت قرآن کریم"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      پیام خوش‌آمدگویی یا راهنمای بالای کادر موبایل (اختیاری)
                    </label>
                    <textarea
                      rows={2}
                      value={draft.welcomeNote}
                      onChange={(e) => setDraft((p) => ({ ...p, welcomeNote: e.target.value }))}
                      placeholder="مثلاً: پس از ورود با شماره موبایل خود، فرم ثبت‌نام دوره را تکمیل و ارسال نمایید."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        برچسب فیلد موبایل
                      </label>
                      <input
                        type="text"
                        value={draft.phoneLabel}
                        onChange={(e) => setDraft((p) => ({ ...p, phoneLabel: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        متن راهنمای زیر موبایل
                      </label>
                      <input
                        type="text"
                        value={draft.phoneHelperText}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, phoneHelperText: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        متن دکمه ارسال کد
                      </label>
                      <input
                        type="text"
                        value={draft.submitButtonText}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, submitButtonText: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        متن دکمه تایید و ورود
                      </label>
                      <input
                        type="text"
                        value={draft.verifyButtonText}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, verifyButtonText: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      متن پاورقی (فوتر کارت ورود)
                    </label>
                    <input
                      type="text"
                      value={draft.footerText}
                      onChange={(e) => setDraft((p) => ({ ...p, footerText: e.target.value }))}
                      placeholder="مثلاً: در صورت نیاز به راهنمایی با واحد آموزش تماس بگیرید."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Theme & Background */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700">تم رنگی صفحه</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.values(LOGIN_THEMES).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setDraft((p) => ({ ...p, theme: t.id }))}
                          className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                            draft.theme === t.id
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full ${t.swatch} shrink-0`} />
                          <span className="truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBgUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bgInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>{draft.bgDataUrl ? 'تغییر تصویر پس‌زمینه' : 'انتخاب تصویر پس‌زمینه'}</span>
                    </button>
                    {draft.bgDataUrl && (
                      <button
                        type="button"
                        onClick={() => setDraft((p) => ({ ...p, bgDataUrl: null }))}
                        className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        حذف پس‌زمینه
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-5 pt-2 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.showLogo}
                        onChange={(e) => setDraft((p) => ({ ...p, showLogo: e.target.checked }))}
                        className="rounded text-emerald-600"
                      />
                      <span className="font-semibold text-slate-700">نمایش لوگوی مؤسسه</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.showSupportPhone}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, showSupportPhone: e.target.checked }))
                        }
                        className="rounded text-emerald-600"
                      />
                      <span className="font-semibold text-slate-700">نمایش شماره تماس پشتیبانی</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(e) => setDraft((p) => ({ ...p, isActive: e.target.checked }))}
                        className="rounded text-emerald-600"
                      />
                      <span className="font-semibold text-slate-700">صفحه فعال باشد</span>
                    </label>
                  </div>
                </div>

                {/* Live Mini Preview (2 cols) */}
                <div className="lg:col-span-2">
                  <div className="sticky top-0 space-y-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      پیش‌نمایش زنده کارت ورود
                    </span>
                    <div
                      className={`relative rounded-2xl border border-slate-200 p-5 overflow-hidden min-h-[340px] flex items-center justify-center ${
                        draft.bgDataUrl ? 'bg-slate-900' : 'bg-gradient-to-b from-slate-100 to-slate-50'
                      }`}
                    >
                      {draft.bgDataUrl && (
                        <>
                          <img
                            src={draft.bgDataUrl}
                            alt="پس‌زمینه"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/55" />
                        </>
                      )}
                      <div className="relative z-10 w-full bg-white/95 rounded-2xl shadow-xl p-5 space-y-3.5 text-center border border-slate-200/80">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${previewTheme.iconBox} text-white mx-auto flex items-center justify-center shadow-md`}
                        >
                          <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-slate-900">
                            {draft.title.trim() || 'عنوان صفحه ورود اختصاصی'}
                          </h4>
                          {draft.subtitle.trim() && (
                            <p className="text-[10px] text-slate-500 mt-1">{draft.subtitle.trim()}</p>
                          )}
                        </div>
                        {draft.welcomeNote.trim() && (
                          <div
                            className={`p-2 rounded-lg border text-[10px] text-right leading-relaxed ${previewTheme.welcomeBox}`}
                          >
                            {draft.welcomeNote.trim()}
                          </div>
                        )}
                        <div className="text-right space-y-1">
                          <span className="text-[10px] font-bold text-slate-700 block">
                            {draft.phoneLabel || 'شماره موبایل'} *
                          </span>
                          <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-left font-mono text-[11px] text-slate-400">
                            09123456789
                          </div>
                        </div>
                        <div
                          className={`w-full py-2 rounded-xl bg-gradient-to-r ${previewTheme.button} text-white text-xs font-bold shadow`}
                        >
                          {draft.submitButtonText || 'ارسال کد تایید پیامکی'}
                        </div>
                        {draft.footerText.trim() && (
                          <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                            {draft.footerText.trim()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'در حال ذخیره...' : 'ذخیره صفحه ورود'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
