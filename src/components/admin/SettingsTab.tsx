import React, { useState } from 'react';
import { AppConfig, Category } from '../../types';
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
} from 'lucide-react';
import { api } from '../../services/api';

interface SettingsTabProps {
  config: AppConfig | null;
  needCategories: Category[];
  programCategories: Category[];
  onConfigUpdated: (config: AppConfig) => void;
  onRefreshCategories: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  needCategories,
  programCategories,
  onConfigUpdated,
  onRefreshCategories,
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

  // Restore DB State
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');

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
      alert('خطا در ذخیره تنظیمات');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddNeedCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeedCat.trim()) return;
    setCatLoading(true);
    try {
      await api.addNeedCategory(newNeedCat.trim());
      setNewNeedCat('');
      onRefreshCategories();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت دسته نیاز');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteNeedCategory = async (id: number) => {
    if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) return;
    try {
      await api.deleteNeedCategory(id);
      onRefreshCategories();
    } catch {
      alert('خطا در حذف دسته‌بندی');
    }
  };

  const handleAddProgCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgCat.trim()) return;
    setCatLoading(true);
    try {
      await api.addProgramCategory(newProgCat.trim());
      setNewProgCat('');
      onRefreshCategories();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت دسته طرح');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteProgCategory = async (id: number) => {
    if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) return;
    try {
      await api.deleteProgramCategory(id);
      onRefreshCategories();
    } catch {
      alert('خطا در حذف دسته‌بندی');
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setRestoring(true);
        const json = JSON.parse(reader.result as string);
        await api.restoreBackup(json);
        setRestoreMsg('بازیابی دیتابیس با موفقیت انجام شد. صفحه رفرش می‌شود...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        alert(err.message || 'فایل پشتیبان نامعتبر است');
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
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

      {/* Dynamic Categories Management */}
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

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Download Backup */}
          <a
            href={api.exportBackupUrl}
            download
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>دریافت نسخه پشتیبان کامل</span>
          </a>

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
