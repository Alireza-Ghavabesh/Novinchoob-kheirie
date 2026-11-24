import React, { useState, useEffect } from 'react';
import {
  ListPlus,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Sliders,
  ListChecks,
  UserCheck,
  FileText,
  Save,
  Tag,
  Check,
  X,
  Edit3,
} from 'lucide-react';
import { AppConfig, Category } from '../../types';
import { api } from '../../services/api';
import { toPersianDigits } from '../../utils/persian';
import {
  BuiltinFieldsConfig,
  DEFAULT_GUARDIAN_OPTIONS,
  DEFAULT_HOUSING_OPTIONS,
  DEFAULT_PUBLIC_FORM_SCHEMA,
  EntityDefinition,
  PublicFormSchema,
  parsePublicFormSchema,
} from '../../utils/publicFormConfig';
import { FormFieldsEditor } from './FormFieldsEditor';

interface PublicFormBuilderSectionProps {
  config: AppConfig | null;
  needCategories: Category[];
  entities: EntityDefinition[];
  onConfigUpdated: (config: AppConfig) => void;
  onRefreshCategories: () => void;
  onOpenEntitiesTab?: () => void;
}

type ShowKey =
  | 'showName'
  | 'showNid'
  | 'showPhone'
  | 'showBirthDate'
  | 'showGuardian'
  | 'showDependents'
  | 'showHousing'
  | 'showCat'
  | 'showRequestedAmount'
  | 'showDesc'
  | 'showAddress';

type RequiredKey =
  | 'requiredName'
  | 'requiredNid'
  | 'requiredPhone'
  | 'requiredBirthDate'
  | 'requiredGuardian'
  | 'requiredDependents'
  | 'requiredHousing'
  | 'requiredCat'
  | 'requiredRequestedAmount'
  | 'requiredDesc'
  | 'requiredAddress';

type LabelKey =
  | 'nameLabel'
  | 'nidLabel'
  | 'phoneLabel'
  | 'birthDateLabel'
  | 'guardianLabel'
  | 'dependentsLabel'
  | 'housingLabel'
  | 'catLabel'
  | 'requestedAmountLabel'
  | 'descLabel'
  | 'addressLabel';

type PlaceholderKey =
  | 'namePlaceholder'
  | 'nidPlaceholder'
  | 'phonePlaceholder'
  | 'birthDatePlaceholder'
  | 'dependentsPlaceholder'
  | 'requestedAmountPlaceholder'
  | 'descPlaceholder'
  | 'addressPlaceholder';

interface BuiltinFieldMeta {
  id: string;
  defaultTitle: string;
  fieldTypeLabel: string;
  showKey: ShowKey;
  requiredKey: RequiredKey;
  labelKey: LabelKey;
  placeholderKey?: PlaceholderKey;
  hint?: string;
}

const BUILTIN_FIELD_ITEMS: BuiltinFieldMeta[] = [
  {
    id: 'name',
    defaultTitle: 'نام و نام خانوادگی متقاضی',
    fieldTypeLabel: 'متن کوتاه',
    showKey: 'showName',
    requiredKey: 'requiredName',
    labelKey: 'nameLabel',
    placeholderKey: 'namePlaceholder',
  },
  {
    id: 'nid',
    defaultTitle: 'کد ملی ۱۰ رقمی',
    fieldTypeLabel: 'کد ملی',
    showKey: 'showNid',
    requiredKey: 'requiredNid',
    labelKey: 'nidLabel',
    placeholderKey: 'nidPlaceholder',
  },
  {
    id: 'phone',
    defaultTitle: 'شماره تلفن همراه',
    fieldTypeLabel: 'شماره موبایل',
    showKey: 'showPhone',
    requiredKey: 'requiredPhone',
    labelKey: 'phoneLabel',
    placeholderKey: 'phonePlaceholder',
  },
  {
    id: 'birthDate',
    defaultTitle: 'تاریخ تولد (شمسی)',
    fieldTypeLabel: 'تقویم شمسی',
    showKey: 'showBirthDate',
    requiredKey: 'requiredBirthDate',
    labelKey: 'birthDateLabel',
    placeholderKey: 'birthDatePlaceholder',
  },
  {
    id: 'guardian',
    defaultTitle: 'وضعیت سرپرستی خانوار',
    fieldTypeLabel: 'سلکت‌باکس',
    showKey: 'showGuardian',
    requiredKey: 'requiredGuardian',
    labelKey: 'guardianLabel',
    hint: 'گزینه‌های این فیلد از بخش مدیریت لیست‌های کشویی در پایین قابل ویرایش است.',
  },
  {
    id: 'dependents',
    defaultTitle: 'تعداد افراد تحت تکفل',
    fieldTypeLabel: 'عددی',
    showKey: 'showDependents',
    requiredKey: 'requiredDependents',
    labelKey: 'dependentsLabel',
    placeholderKey: 'dependentsPlaceholder',
  },
  {
    id: 'housing',
    defaultTitle: 'وضعیت محل سکونت',
    fieldTypeLabel: 'سلکت‌باکس',
    showKey: 'showHousing',
    requiredKey: 'requiredHousing',
    labelKey: 'housingLabel',
    hint: 'گزینه‌های این فیلد از بخش مدیریت لیست‌های کشویی در پایین قابل ویرایش است.',
  },
  {
    id: 'cat',
    defaultTitle: 'دسته‌بندی موضوع نیاز',
    fieldTypeLabel: 'سلکت‌باکس',
    showKey: 'showCat',
    requiredKey: 'requiredCat',
    labelKey: 'catLabel',
    hint: 'گزینه‌های این فیلد از بخش «دسته‌بندی‌های موضوع نیاز» در پایین همین صفحه قابل افزودن، ویرایش و حذف هستند.',
  },
  {
    id: 'requestedAmount',
    defaultTitle: 'مبلغ تخمینی مورد نیاز',
    fieldTypeLabel: 'مبلغ (تومان)',
    showKey: 'showRequestedAmount',
    requiredKey: 'requiredRequestedAmount',
    labelKey: 'requestedAmountLabel',
    placeholderKey: 'requestedAmountPlaceholder',
  },
  {
    id: 'desc',
    defaultTitle: 'شرح تفصیلی مشکل',
    fieldTypeLabel: 'متن بلند',
    showKey: 'showDesc',
    requiredKey: 'requiredDesc',
    labelKey: 'descLabel',
    placeholderKey: 'descPlaceholder',
  },
  {
    id: 'address',
    defaultTitle: 'آدرس دقیق محل سکونت',
    fieldTypeLabel: 'متن کوتاه / نشانی',
    showKey: 'showAddress',
    requiredKey: 'requiredAddress',
    labelKey: 'addressLabel',
    placeholderKey: 'addressPlaceholder',
  },
];

const THEME_OPTIONS = [
  { id: 'emerald', label: 'سبز زمردی', swatch: 'bg-emerald-700' },
  { id: 'teal', label: 'فیروزه‌ای', swatch: 'bg-teal-700' },
  { id: 'blue', label: 'آبی لاجوردی', swatch: 'bg-blue-800' },
  { id: 'amber', label: 'طلایی / کهربایی', swatch: 'bg-amber-600' },
  { id: 'slate', label: 'ذغالی رسمی', swatch: 'bg-slate-800' },
];

export const PublicFormBuilderSection: React.FC<PublicFormBuilderSectionProps> = ({
  config,
  needCategories,
  entities,
  onConfigUpdated,
  onRefreshCategories,
  onOpenEntitiesTab,
}) => {
  const [schema, setSchema] = useState<PublicFormSchema>(() =>
    parsePublicFormSchema(config?.publicFormConfig)
  );

  useEffect(() => {
    setSchema(parsePublicFormSchema(config?.publicFormConfig));
  }, [config?.publicFormConfig]);

  // Select options input states
  const [newGuardianOpt, setNewGuardianOpt] = useState('');
  const [newHousingOpt, setNewHousingOpt] = useState('');

  // Need Categories manager states
  const [newNeedCat, setNewNeedCat] = useState('');
  const [addingNeedCat, setAddingNeedCat] = useState(false);
  const [editingNeedCatId, setEditingNeedCatId] = useState<number | null>(null);
  const [editingNeedCatName, setEditingNeedCatName] = useState('');
  const [savingNeedCatId, setSavingNeedCatId] = useState<number | null>(null);
  const [deletingNeedCatId, setDeletingNeedCatId] = useState<number | null>(null);

  // Save states
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddNeedCategory = async () => {
    const val = newNeedCat.trim();
    if (!val) return;
    setAddingNeedCat(true);
    setErrorMsg('');
    try {
      await api.addNeedCategory(val);
      setNewNeedCat('');
      onRefreshCategories();
      setSavedMsg(`دسته‌بندی «${val}» با موفقیت به فرم نیازسنجی اضافه شد.`);
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در افزودن دسته‌بندی موضوع نیاز');
    } finally {
      setAddingNeedCat(false);
    }
  };

  const handleSaveEditNeedCategory = async (id: number) => {
    const val = editingNeedCatName.trim();
    if (!val) return;
    setSavingNeedCatId(id);
    setErrorMsg('');
    try {
      await api.updateNeedCategory(id, val);
      setEditingNeedCatId(null);
      setEditingNeedCatName('');
      onRefreshCategories();
      setSavedMsg(`نام دسته‌بندی به «${val}» به‌روزرسانی شد.`);
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ویرایش دسته‌بندی');
    } finally {
      setSavingNeedCatId(null);
    }
  };

  const handleDeleteNeedCategory = async (catItem: Category) => {
    if (!confirm(`آیا از حذف دسته‌بندی «${catItem.name}» اطمینان دارید؟`)) return;
    setDeletingNeedCatId(catItem.id);
    setErrorMsg('');
    try {
      await api.deleteNeedCategory(catItem.id);
      onRefreshCategories();
      setSavedMsg(`دسته‌بندی «${catItem.name}» حذف شد.`);
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در حذف دسته‌بندی');
    } finally {
      setDeletingNeedCatId(null);
    }
  };

  const persistSchema = async (
    nextSchema: PublicFormSchema,
    successText = 'تنظیمات و فیلدهای فرم درخواست عمومی با موفقیت ذخیره شد.'
  ) => {
    setSaving(true);
    setErrorMsg('');
    setSavedMsg('');
    try {
      const cleanedSchema: PublicFormSchema = {
        ...nextSchema,
        guardianOptions: nextSchema.guardianOptions.map((o) => o.trim()).filter(Boolean),
        housingOptions: nextSchema.housingOptions.map((o) => o.trim()).filter(Boolean),
      };
      const updated = await api.updateConfig({
        publicFormConfig: JSON.stringify(cleanedSchema),
      });
      onConfigUpdated(updated);
      setSavedMsg(successText);
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ذخیره تنظیمات فرم عمومی');
    } finally {
      setSaving(false);
    }
  };

  const updateBuiltin = <K extends keyof BuiltinFieldsConfig>(
    key: K,
    value: BuiltinFieldsConfig[K]
  ) => {
    setSchema((prev) => ({
      ...prev,
      builtin: {
        ...prev.builtin,
        [key]: value,
      },
    }));
  };

  // Manage built-in select options (guardianOptions / housingOptions)
  const addSelectOption = (target: 'guardianOptions' | 'housingOptions') => {
    const raw = target === 'guardianOptions' ? newGuardianOpt : newHousingOpt;
    const val = raw.trim();
    if (!val) return;
    setErrorMsg('');
    if (schema[target].includes(val)) {
      setErrorMsg('این گزینه قبلاً در لیست ثبت شده است.');
      return;
    }
    setSchema((prev) => ({
      ...prev,
      [target]: [...prev[target], val],
    }));
    if (target === 'guardianOptions') setNewGuardianOpt('');
    else setNewHousingOpt('');
  };

  const updateSelectOption = (
    target: 'guardianOptions' | 'housingOptions',
    idx: number,
    nextValue: string
  ) => {
    setSchema((prev) => {
      const list = [...prev[target]];
      list[idx] = nextValue;
      return { ...prev, [target]: list };
    });
  };

  const removeSelectOption = (target: 'guardianOptions' | 'housingOptions', idx: number) => {
    if (schema[target].length <= 1) {
      setErrorMsg(
        'هر لیست کشویی باید حداقل یک گزینه داشته باشد (در صورت عدم نیاز می‌توانید خود فیلد را مخفی کنید).'
      );
      return;
    }
    setErrorMsg('');
    setSchema((prev) => ({
      ...prev,
      [target]: prev[target].filter((_, i) => i !== idx),
    }));
  };

  const moveSelectOption = (
    target: 'guardianOptions' | 'housingOptions',
    idx: number,
    dir: -1 | 1
  ) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= schema[target].length) return;
    setSchema((prev) => {
      const list = [...prev[target]];
      const [item] = list.splice(idx, 1);
      list.splice(nextIdx, 0, item);
      return { ...prev, [target]: list };
    });
  };

  const handleResetAll = () => {
    setSchema({
      ...DEFAULT_PUBLIC_FORM_SCHEMA,
      maxFileSizeMB: 5,
      builtin: { ...DEFAULT_PUBLIC_FORM_SCHEMA.builtin },
      guardianOptions: [...DEFAULT_GUARDIAN_OPTIONS],
      housingOptions: [...DEFAULT_HOUSING_OPTIONS],
      customFields: [],
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-base text-slate-900">
              طراحی و ویرایش کامل فرم درخواست عمومی
            </h3>
            <p className="text-xs text-slate-500">
              تمامی مشخصات فرم، عنوان‌ها، متن راهنما، الزامی/اختیاری بودن و نمایش یا مخفی‌سازی همه فیلدها و همچنین فیلدهای سفارشی در این بخش قابل ویرایش است.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition self-start sm:self-center cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>بازگردانی به پیش‌فرض</span>
        </button>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. General Form Settings (Matching Custom Forms Editor) */}
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText className="w-4 h-4 text-emerald-600" />
          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
            مشخصات و تنظیمات عمومی فرم
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">عنوان فرم</label>
            <input
              type="text"
              value={schema.title}
              onChange={(e) => setSchema((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="مثال: فرم عمومی پذیرش و نیازسنجی نیازمندان"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              عبارت بالای بنر (Hero Badge)
            </label>
            <input
              type="text"
              value={schema.heroBadge}
              onChange={(e) => setSchema((prev) => ({ ...prev, heroBadge: e.target.value }))}
              placeholder="بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">توضیحات فرم</label>
            <textarea
              rows={2}
              value={schema.description}
              onChange={(e) => setSchema((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="توضیحات راهنمای بالای فرم..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">متن دکمه ثبت</label>
            <input
              type="text"
              value={schema.submitButtonText}
              onChange={(e) =>
                setSchema((prev) => ({ ...prev, submitButtonText: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              پیام موفقیت پس از ثبت
            </label>
            <input
              type="text"
              value={schema.successMessage}
              onChange={(e) => setSchema((prev) => ({ ...prev, successMessage: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              تم رنگی بنر صفحه مستقل فرم
            </label>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSchema((prev) => ({ ...prev, theme: t.id }))}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                    (schema.theme || 'emerald') === t.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${t.swatch}`} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              حداکثر حجم مجاز فایل آپلودی (مگابایت)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={25}
                value={schema.maxFileSizeMB || 5}
                onChange={(e) =>
                  setSchema((prev) => ({
                    ...prev,
                    maxFileSizeMB: Math.min(25, Math.max(1, Number(e.target.value) || 5)),
                  }))
                }
                className="w-24 px-3 py-2 rounded-xl border border-slate-300 bg-white text-center font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-slate-600 font-semibold">مگابایت</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
            <div>
              <span className="font-bold text-slate-800 block">
                نمایش بخش پیگیری کد رهگیری در صفحه فرم
              </span>
              <span className="text-[11px] text-slate-500">
                امکان استعلام وضعیت پرونده با کد رهگیری یا کد ملی
              </span>
            </div>
            <input
              type="checkbox"
              checked={schema.showTracking}
              onChange={(e) =>
                setSchema((prev) => ({ ...prev, showTracking: e.target.checked }))
              }
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
            />
          </label>

          <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-800 block">
                  نمایش در پروفایل مددجو
                </span>
                <span className="text-[11px] text-slate-500">
                  امکان تکمیل و ویرایش مستقیم در کارتابل مددجو
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(schema.showInBeneficiaryPortal)}
              onChange={(e) =>
                setSchema((prev) => ({
                  ...prev,
                  showInBeneficiaryPortal: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 shrink-0"
            />
          </label>
        </div>
      </div>

      {/* 2. All 11 Built-in Fields — Full Editability */}
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div>
          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
            ویرایش همه فیلدهای اصلی فرم ({BUILTIN_FIELD_ITEMS.length} فیلد قابل تنظیم)
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            برای هر فیلد می‌توانید عنوان نمایشی، متن راهنمای داخل کادر (Placeholder)، وضعیت اجباری یا اختیاری بودن و همچنین نمایش یا مخفی بودن آن را تغییر دهید.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {BUILTIN_FIELD_ITEMS.map((item) => {
            const isVisible = schema.builtin[item.showKey];
            const isRequired = schema.builtin[item.requiredKey];

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition space-y-2.5 ${
                  isVisible
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-slate-800 truncate">{item.defaultTitle}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold shrink-0">
                      {item.fieldTypeLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isVisible && (
                      <button
                        type="button"
                        onClick={() => updateBuiltin(item.requiredKey, !isRequired)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          isRequired
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="تغییر وضعیت الزامی یا اختیاری بودن فیلد"
                      >
                        {isRequired ? 'الزامی *' : 'اختیاری'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => updateBuiltin(item.showKey, !isVisible)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                        isVisible
                          ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                          : 'bg-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800'
                      }`}
                    >
                      {isVisible ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>فعال</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>مخفی</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isVisible && (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        عنوان فیلد در فرم
                      </label>
                      <input
                        type="text"
                        value={schema.builtin[item.labelKey]}
                        onChange={(e) => updateBuiltin(item.labelKey, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="عنوان نمایشی فیلد"
                      />
                    </div>

                    {item.placeholderKey && (
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          متن راهنمای داخل کادر (Placeholder)
                        </label>
                        <input
                          type="text"
                          value={schema.builtin[item.placeholderKey]}
                          onChange={(e) => updateBuiltin(item.placeholderKey!, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="متن نمونه داخل ورودی..."
                        />
                      </div>
                    )}

                    {item.hint && (
                      <p className="text-[10px] text-slate-500 leading-relaxed">{item.hint}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Select Box Options Managers (Need Categories, Guardian & Housing) */}
      <div className="space-y-5">
        {/* Need Categories Manager — Direct Live Editing Inside Form Builder */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  دسته‌بندی‌های «{schema.builtin.catLabel}» ({toPersianDigits(needCategories.length)} دسته)
                </h4>
                <p className="text-[11px] text-slate-500">
                  تغییرات این بخش بلافاصله در فرم نیازسنجی مردمی، پروفایل مددجو، کارتابل و گزارش‌های مالی اعمال می‌شود.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 text-xs">
            <input
              type="text"
              value={newNeedCat}
              onChange={(e) => setNewNeedCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNeedCategory();
                }
              }}
              placeholder="نام دسته‌بندی نیاز جدید (مثال: کمک‌هزینه جهیزیه، درمان تخصصی...)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              disabled={addingNeedCat || !newNeedCat.trim()}
              onClick={handleAddNeedCategory}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1 transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{addingNeedCat ? 'در حال ثبت...' : 'افزودن دسته'}</span>
            </button>
          </div>

          {needCategories.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
              هنوز هیچ دسته‌بندی نیازی ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-0.5">
              {needCategories.map((catItem) => {
                const isEditing = editingNeedCatId === catItem.id;
                return (
                  <div
                    key={catItem.id}
                    className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingNeedCatName}
                        onChange={(e) => setEditingNeedCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEditNeedCategory(catItem.id);
                          } else if (e.key === 'Escape') {
                            setEditingNeedCatId(null);
                            setEditingNeedCatName('');
                          }
                        }}
                        className="flex-1 px-2 py-1 rounded-lg border border-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 font-semibold text-xs"
                      />
                    ) : (
                      <span className="flex-1 font-semibold text-slate-800 truncate">
                        {catItem.name}
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={savingNeedCatId === catItem.id || !editingNeedCatName.trim()}
                            onClick={() => handleSaveEditNeedCategory(catItem.id)}
                            className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer disabled:opacity-40"
                            title="ذخیره نام جدید"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNeedCatId(null);
                              setEditingNeedCatName('');
                            }}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="انصراف"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNeedCatId(catItem.id);
                              setEditingNeedCatName(catItem.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="ویرایش نام دسته"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingNeedCatId === catItem.id}
                            onClick={() => handleDeleteNeedCategory(catItem)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-40"
                            title="حذف دسته"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Guardian Select Options */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                گزینه‌های «{schema.builtin.guardianLabel}»
              </h4>
            </div>
            <button
              type="button"
              onClick={() =>
                setSchema((prev) => ({
                  ...prev,
                  guardianOptions: [...DEFAULT_GUARDIAN_OPTIONS],
                }))
              }
              className="text-[11px] text-slate-500 hover:text-emerald-700 transition cursor-pointer"
              title="بازگردانی گزینه‌های پیش‌فرض سرپرستی"
            >
              پیش‌فرض
            </button>
          </div>

          <div className="flex gap-2 text-xs">
            <input
              type="text"
              value={newGuardianOpt}
              onChange={(e) => setNewGuardianOpt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSelectOption('guardianOptions');
                }
              }}
              placeholder="گزینه جدید (مثال: دانشجوی بی‌بضاعت)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => addSelectOption('guardianOptions')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
            {schema.guardianOptions.map((opt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
              >
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateSelectOption('guardianOptions', idx, e.target.value)}
                  className="flex-1 px-2 py-1 rounded-lg border border-transparent hover:border-slate-200 focus:border-emerald-400 outline-none text-slate-800 font-medium text-xs"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSelectOption('guardianOptions', idx, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="انتقال به بالا"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === schema.guardianOptions.length - 1}
                    onClick={() => moveSelectOption('guardianOptions', idx, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="انتقال به پایین"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSelectOption('guardianOptions', idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="حذف گزینه"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Housing Select Options */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-teal-600" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                گزینه‌های «{schema.builtin.housingLabel}»
              </h4>
            </div>
            <button
              type="button"
              onClick={() =>
                setSchema((prev) => ({
                  ...prev,
                  housingOptions: [...DEFAULT_HOUSING_OPTIONS],
                }))
              }
              className="text-[11px] text-slate-500 hover:text-teal-700 transition cursor-pointer"
              title="بازگردانی گزینه‌های پیش‌فرض مسکن"
            >
              پیش‌فرض
            </button>
          </div>

          <div className="flex gap-2 text-xs">
            <input
              type="text"
              value={newHousingOpt}
              onChange={(e) => setNewHousingOpt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSelectOption('housingOptions');
                }
              }}
              placeholder="گزینه جدید (مثال: خانه سازمانی)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => addSelectOption('housingOptions')}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
            {schema.housingOptions.map((opt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
              >
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateSelectOption('housingOptions', idx, e.target.value)}
                  className="flex-1 px-2 py-1 rounded-lg border border-transparent hover:border-slate-200 focus:border-teal-400 outline-none text-slate-800 font-medium text-xs"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSelectOption('housingOptions', idx, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="انتقال به بالا"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === schema.housingOptions.length - 1}
                    onClick={() => moveSelectOption('housingOptions', idx, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="انتقال به پایین"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSelectOption('housingOptions', idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="حذف گزینه"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* 4. Custom & Entity Fields Builder */}
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 bg-slate-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ListPlus className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                فیلدهای سفارشی، موجودیتی و سلکت‌باکس اضافه‌شده به فرم
              </h4>
              <p className="text-[11px] text-slate-500">
                علاوه بر فیلدهای اصلی بالا، می‌توانید هر تعداد فیلد متنی، عددی، تاریخ شمسی، سلکت‌باکس، آپلود فایل یا موجودیتی به این فرم اضافه و ویرایش کنید.
              </p>
            </div>
          </div>

          {onOpenEntitiesTab && (
            <button
              type="button"
              onClick={onOpenEntitiesTab}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold transition cursor-pointer shrink-0"
            >
              مدیریت و تعریف موجودیت‌ها
            </button>
          )}
        </div>

        <FormFieldsEditor
          fields={schema.customFields}
          entities={entities}
          onChange={(nextFields) =>
            setSchema((prev) => ({ ...prev, customFields: nextFields }))
          }
          onNavigateToEntities={onOpenEntitiesTab}
          emptyText="هنوز فیلد سفارشی اضافه نشده است. از بخش بالا می‌توانید فیلدهای متنی، عددی، تاریخ شمسی، سلکت‌باکس، آپلود فایل یا موجودیتی به فرم اضافه کنید."
        />
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-[11px] text-slate-500">
          پس از تغییر مشخصات یا فیلدها، برای اعمال در فرم حتماً دکمه ذخیره را بزنید.
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={() => persistSchema(schema)}
          className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات فرم درخواست عمومی'}</span>
        </button>
      </div>
    </div>
  );
};
