import React, { useState, useEffect } from 'react';
import {
  Sliders,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  FileText,
  Save,
  Tag,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  ListPlus,
} from 'lucide-react';
import { AppConfig, Category } from '../../types';
import { api } from '../../services/api';
import { toPersianDigits } from '../../utils/persian';
import { EntityDefinition } from '../../utils/publicFormConfig';
import {
  DEFAULT_PROGRAM_FORM_SCHEMA,
  ProgramBuiltinFieldsConfig,
  ProgramFormSchema,
  parseProgramFormSchema,
} from '../../utils/programFormConfig';
import { FormFieldsEditor } from './FormFieldsEditor';

interface ProgramFormBuilderSectionProps {
  config: AppConfig | null;
  programCategories: Category[];
  entities: EntityDefinition[];
  onConfigUpdated: (config: AppConfig) => void;
  onRefreshCategories: () => void;
  onOpenEntitiesTab?: () => void;
}

type ProgShowKey =
  | 'showTitle'
  | 'showCat'
  | 'showRequestedBudget'
  | 'showVolunteers'
  | 'showRoles'
  | 'showStartDate'
  | 'showEndDate'
  | 'showDesc';

type ProgRequiredKey =
  | 'requiredTitle'
  | 'requiredCat'
  | 'requiredRequestedBudget'
  | 'requiredVolunteers'
  | 'requiredRoles'
  | 'requiredStartDate'
  | 'requiredEndDate'
  | 'requiredDesc';

type ProgLabelKey =
  | 'titleLabel'
  | 'catLabel'
  | 'requestedBudgetLabel'
  | 'volunteersLabel'
  | 'rolesLabel'
  | 'startDateLabel'
  | 'endDateLabel'
  | 'descLabel';

type ProgPlaceholderKey =
  | 'titlePlaceholder'
  | 'requestedBudgetPlaceholder'
  | 'volunteersPlaceholder'
  | 'rolesPlaceholder'
  | 'startDatePlaceholder'
  | 'endDatePlaceholder'
  | 'descPlaceholder';

interface ProgBuiltinMeta {
  id: string;
  defaultTitle: string;
  fieldTypeLabel: string;
  showKey: ProgShowKey;
  requiredKey: ProgRequiredKey;
  labelKey: ProgLabelKey;
  placeholderKey?: ProgPlaceholderKey;
  alwaysVisible?: boolean;
  hint?: string;
}

const PROGRAM_BUILTIN_FIELDS: ProgBuiltinMeta[] = [
  {
    id: 'title',
    defaultTitle: 'عنوان کامل طرح / پروژه',
    fieldTypeLabel: 'متن کوتاه (اصلی)',
    showKey: 'showTitle',
    requiredKey: 'requiredTitle',
    labelKey: 'titleLabel',
    placeholderKey: 'titlePlaceholder',
    alwaysVisible: true,
    hint: 'عنوان پروژه برای شناسایی در لیست پروژه‌ها و تقویم همیشه فعال است، اما برچسب و راهنمای آن قابل ویرایش است.',
  },
  {
    id: 'cat',
    defaultTitle: 'دسته‌بندی طرح',
    fieldTypeLabel: 'سلکت‌باکس',
    showKey: 'showCat',
    requiredKey: 'requiredCat',
    labelKey: 'catLabel',
    hint: 'گزینه‌های این فیلد از بخش «دسته‌بندی‌های طرح و پروژه» در بالای همین صفحه قابل افزودن، ویرایش و حذف هستند.',
  },
  {
    id: 'requestedBudget',
    defaultTitle: 'برآورد بودجه اولیه (تومان)',
    fieldTypeLabel: 'مبلغ (تومان)',
    showKey: 'showRequestedBudget',
    requiredKey: 'requiredRequestedBudget',
    labelKey: 'requestedBudgetLabel',
    placeholderKey: 'requestedBudgetPlaceholder',
  },
  {
    id: 'volunteers',
    defaultTitle: 'تعداد داوطلب مورد نیاز',
    fieldTypeLabel: 'عددی',
    showKey: 'showVolunteers',
    requiredKey: 'requiredVolunteers',
    labelKey: 'volunteersLabel',
    placeholderKey: 'volunteersPlaceholder',
  },
  {
    id: 'roles',
    defaultTitle: 'نقش‌ها و تخصص‌ها',
    fieldTypeLabel: 'متن کوتاه',
    showKey: 'showRoles',
    requiredKey: 'requiredRoles',
    labelKey: 'rolesLabel',
    placeholderKey: 'rolesPlaceholder',
  },
  {
    id: 'startDate',
    defaultTitle: 'تاریخ شروع (شمسی)',
    fieldTypeLabel: 'تقویم شمسی',
    showKey: 'showStartDate',
    requiredKey: 'requiredStartDate',
    labelKey: 'startDateLabel',
    placeholderKey: 'startDatePlaceholder',
  },
  {
    id: 'endDate',
    defaultTitle: 'تاریخ پایان (شمسی)',
    fieldTypeLabel: 'تقویم شمسی',
    showKey: 'showEndDate',
    requiredKey: 'requiredEndDate',
    labelKey: 'endDateLabel',
    placeholderKey: 'endDatePlaceholder',
  },
  {
    id: 'desc',
    defaultTitle: 'اهداف و شرح پروژه',
    fieldTypeLabel: 'متن بلند',
    showKey: 'showDesc',
    requiredKey: 'requiredDesc',
    labelKey: 'descLabel',
    placeholderKey: 'descPlaceholder',
  },
];

export const ProgramFormBuilderSection: React.FC<ProgramFormBuilderSectionProps> = ({
  config,
  programCategories,
  entities,
  onConfigUpdated,
  onRefreshCategories,
  onOpenEntitiesTab,
}) => {
  const [schema, setSchema] = useState<ProgramFormSchema>(() =>
    parseProgramFormSchema(config?.programFormConfig)
  );

  useEffect(() => {
    setSchema(parseProgramFormSchema(config?.programFormConfig));
  }, [config?.programFormConfig]);

  // Program Categories manager states
  const [newProgCat, setNewProgCat] = useState('');
  const [addingProgCat, setAddingProgCat] = useState(false);
  const [editingProgCatId, setEditingProgCatId] = useState<number | null>(null);
  const [editingProgCatName, setEditingProgCatName] = useState('');
  const [savingProgCatId, setSavingProgCatId] = useState<number | null>(null);
  const [deletingProgCatId, setDeletingProgCatId] = useState<number | null>(null);

  // Save states
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const updateBuiltin = <K extends keyof ProgramBuiltinFieldsConfig>(
    key: K,
    value: ProgramBuiltinFieldsConfig[K]
  ) => {
    setSchema((prev) => ({
      ...prev,
      builtin: {
        ...prev.builtin,
        [key]: value,
      },
    }));
  };

  const handleAddProgramCategory = async () => {
    const val = newProgCat.trim();
    if (!val) return;
    setAddingProgCat(true);
    setErrorMsg('');
    try {
      await api.addProgramCategory(val);
      setNewProgCat('');
      onRefreshCategories();
      setSavedMsg(`دسته‌بندی طرح «${val}» با موفقیت اضافه شد.`);
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در افزودن دسته‌بندی طرح');
    } finally {
      setAddingProgCat(false);
    }
  };

  const handleSaveEditProgramCategory = async (id: number) => {
    const val = editingProgCatName.trim();
    if (!val) return;
    setSavingProgCatId(id);
    setErrorMsg('');
    try {
      await api.updateProgramCategory(id, val);
      setEditingProgCatId(null);
      setEditingProgCatName('');
      onRefreshCategories();
      setSavedMsg(`نام دسته‌بندی طرح به «${val}» به‌روزرسانی شد.`);
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ویرایش دسته‌بندی طرح');
    } finally {
      setSavingProgCatId(null);
    }
  };

  const handleDeleteProgramCategory = async (catItem: Category) => {
    if (!confirm(`آیا از حذف دسته‌بندی «${catItem.name}» اطمینان دارید؟`)) return;
    setDeletingProgCatId(catItem.id);
    setErrorMsg('');
    try {
      await api.deleteProgramCategory(catItem.id);
      onRefreshCategories();
      setSavedMsg(`دسته‌بندی «${catItem.name}» حذف شد.`);
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در حذف دسته‌بندی طرح');
    } finally {
      setDeletingProgCatId(null);
    }
  };

  const handleResetAll = () => {
    setSchema({
      ...DEFAULT_PROGRAM_FORM_SCHEMA,
      builtin: { ...DEFAULT_PROGRAM_FORM_SCHEMA.builtin },
      customFields: [],
    });
  };

  const handleSaveSchema = async () => {
    setSaving(true);
    setErrorMsg('');
    setSavedMsg('');
    try {
      const updated = await api.updateConfig({
        programFormConfig: JSON.stringify(schema),
      });
      onConfigUpdated(updated);
      setSavedMsg('تنظیمات و فیلدهای فرم تعریف پروژه با موفقیت ذخیره شد.');
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ذخیره تنظیمات فرم پروژه');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-base text-slate-900">
              طراحی فیلدها و مدیریت دسته‌بندی‌های طرح و پروژه
            </h3>
            <p className="text-xs text-slate-500">
              دسته‌بندی‌های طرح را ویرایش کنید، فیلدهای اصلی پروژه را سفارشی‌سازی یا مخفی کنید و مانند فرم‌ساز هر تعداد فیلد دلخواه برای پروژه‌ها تعریف نمایید.
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

      {/* 1. Program Categories Manager */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
          <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-900">
              دسته‌بندی‌های طرح و پروژه ({toPersianDigits(programCategories.length)} دسته)
            </h4>
            <p className="text-[11px] text-slate-500">
              دسته‌بندی‌های جدید اضافه کنید یا نام دسته‌های فعلی را ویرایش و حذف نمایید؛ تغییرات بلافاصله ذخیره می‌شوند.
            </p>
          </div>
        </div>

        <div className="flex gap-2 text-xs">
          <input
            type="text"
            value={newProgCat}
            onChange={(e) => setNewProgCat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddProgramCategory();
              }
            }}
            placeholder="نام دسته‌بندی طرح جدید (مثال: کاروان سلامت، عمرانی و مدرسه‌سازی، فرهنگی...)"
            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            disabled={addingProgCat || !newProgCat.trim()}
            onClick={handleAddProgramCategory}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1 transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{addingProgCat ? 'در حال ثبت...' : 'افزودن دسته'}</span>
          </button>
        </div>

        {programCategories.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            هنوز هیچ دسته‌بندی طرحی ثبت نشده است.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-0.5">
            {programCategories.map((catItem) => {
              const isEditing = editingProgCatId === catItem.id;
              return (
                <div
                  key={catItem.id}
                  className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingProgCatName}
                      onChange={(e) => setEditingProgCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEditProgramCategory(catItem.id);
                        } else if (e.key === 'Escape') {
                          setEditingProgCatId(null);
                          setEditingProgCatName('');
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
                          disabled={savingProgCatId === catItem.id || !editingProgCatName.trim()}
                          onClick={() => handleSaveEditProgramCategory(catItem.id)}
                          className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer disabled:opacity-40"
                          title="ذخیره نام جدید"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProgCatId(null);
                            setEditingProgCatName('');
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
                            setEditingProgCatId(catItem.id);
                            setEditingProgCatName(catItem.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="ویرایش نام دسته"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingProgCatId === catItem.id}
                          onClick={() => handleDeleteProgramCategory(catItem)}
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

      {/* 2. General Settings */}
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText className="w-4 h-4 text-emerald-600" />
          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
            تنظیمات عمومی فرم تعریف پروژه
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">عنوان پنجره تعریف پروژه</label>
            <input
              type="text"
              value={schema.formTitle}
              onChange={(e) => setSchema((prev) => ({ ...prev, formTitle: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">متن دکمه ثبت پروژه</label>
            <input
              type="text"
              value={schema.submitButtonText}
              onChange={(e) => setSchema((prev) => ({ ...prev, submitButtonText: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              سقف حجم فایل پیوست (مگابایت)
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
      </div>

      {/* 3. Built-in Program Fields Customization */}
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div>
          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
            ویرایش فیلدهای اصلی پروژه ({toPersianDigits(PROGRAM_BUILTIN_FIELDS.length)} فیلد قابل تنظیم)
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            می‌توانید عنوان، متن راهنما (Placeholder)، الزامی یا اختیاری بودن و همچنین نمایش یا مخفی‌سازی هر یک از فیلدهای پیش‌فرض پروژه را تنظیم کنید.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {PROGRAM_BUILTIN_FIELDS.map((item) => {
            const isVisible = item.alwaysVisible ? true : schema.builtin[item.showKey];
            const isRequired = item.alwaysVisible ? true : schema.builtin[item.requiredKey];

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
                    {isVisible && !item.alwaysVisible && (
                      <button
                        type="button"
                        onClick={() => updateBuiltin(item.requiredKey, !isRequired)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          isRequired
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isRequired ? 'الزامی *' : 'اختیاری'}
                      </button>
                    )}

                    {item.alwaysVisible ? (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        همیشه فعال
                      </span>
                    ) : (
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
                    )}
                  </div>
                </div>

                {isVisible && (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        عنوان فیلد در فرم پروژه
                      </label>
                      <input
                        type="text"
                        value={schema.builtin[item.labelKey]}
                        onChange={(e) => updateBuiltin(item.labelKey, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
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

      {/* 4. Global Custom Fields for Projects */}
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 bg-slate-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ListPlus className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                فیلدهای سفارشی عمومی همه پروژه‌ها
              </h4>
              <p className="text-[11px] text-slate-500">
                فیلدهایی که اینجا اضافه می‌کنید به‌صورت خودکار در فرم تعریف تمامی پروژه‌ها نمایش داده می‌شوند (همچنین هنگام ساخت هر پروژه می‌توانید فیلدهای دلخواه اختصاصی همان پروژه را نیز اضافه کنید).
              </p>
            </div>
          </div>

          {onOpenEntitiesTab && (
            <button
              type="button"
              onClick={onOpenEntitiesTab}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold transition cursor-pointer shrink-0"
            >
              مدیریت موجودیت‌ها در فرم‌ساز
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
          emptyText="هنوز فیلد سفارشی عمومی برای پروژه‌ها تعریف نشده است. از بخش بالا می‌توانید فیلدهای متنی، عددی، تاریخ شمسی، مبلغ، سلکت‌باکس، آپلود فایل یا موجودیتی اضافه کنید."
        />
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-[11px] text-slate-500">
          پس از تغییر فیلدهای فرم پروژه، برای ذخیره روی دکمه زیر کلیک کنید.
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveSchema}
          className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات فرم پروژه'}</span>
        </button>
      </div>
    </div>
  );
};
