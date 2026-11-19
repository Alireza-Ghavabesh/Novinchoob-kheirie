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
} from 'lucide-react';
import { AppConfig } from '../../types';
import { api } from '../../services/api';
import {
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
  entities: EntityDefinition[];
  onConfigUpdated: (config: AppConfig) => void;
  onOpenEntitiesTab?: () => void;
}

export const PublicFormBuilderSection: React.FC<PublicFormBuilderSectionProps> = ({
  config,
  entities,
  onConfigUpdated,
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

  // Save states
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const persistSchema = async (
    nextSchema: PublicFormSchema,
    successText = 'ساختار فرم درخواست عمومی با موفقیت ذخیره و اعمال شد.'
  ) => {
    setSaving(true);
    setErrorMsg('');
    setSavedMsg('');
    try {
      const updated = await api.updateConfig({
        publicFormConfig: JSON.stringify(nextSchema),
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

  // Toggle built-in field
  const toggleBuiltinField = (
    key:
      | 'showBirthDate'
      | 'showGuardian'
      | 'showDependents'
      | 'showHousing'
      | 'showRequestedAmount'
      | 'showDesc'
      | 'showAddress'
  ) => {
    setSchema((prev) => ({
      ...prev,
      builtin: {
        ...prev.builtin,
        [key]: !prev.builtin[key],
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
      builtin: { ...DEFAULT_PUBLIC_FORM_SCHEMA.builtin },
      guardianOptions: [...DEFAULT_GUARDIAN_OPTIONS],
      housingOptions: [...DEFAULT_HOUSING_OPTIONS],
      customFields: [],
    });
  };

  const builtinToggleItems: Array<{
    key:
      | 'showBirthDate'
      | 'showGuardian'
      | 'showDependents'
      | 'showHousing'
      | 'showRequestedAmount'
      | 'showDesc'
      | 'showAddress';
    title: string;
    labelKey?: 'guardianLabel' | 'housingLabel' | 'descLabel' | 'addressLabel';
  }> = [
    { key: 'showBirthDate', title: 'تاریخ تولد (شمسی)' },
    { key: 'showGuardian', title: 'سلکت‌باکس وضعیت سرپرستی خانوار', labelKey: 'guardianLabel' },
    { key: 'showDependents', title: 'تعداد افراد تحت تکفل' },
    { key: 'showHousing', title: 'سلکت‌باکس وضعیت محل سکونت', labelKey: 'housingLabel' },
    { key: 'showRequestedAmount', title: 'مبلغ تخمینی مورد نیاز' },
    { key: 'showDesc', title: 'شرح تفصیلی مشکل', labelKey: 'descLabel' },
    { key: 'showAddress', title: 'آدرس دقیق محل سکونت', labelKey: 'addressLabel' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-base text-slate-900">
              شخصی‌سازی فیلدها و گزینه‌های فرم درخواست عمومی
            </h3>
            <p className="text-xs text-slate-500">
              فیلدهای متنی، عددی، سلکت‌باکس، موجودیتی (مثل افزودن چندتایی افراد تحت تکفل) و سلکت‌باکس از موجودیت‌ها را اضافه کنید یا فیلدهای پیش‌فرض را مخفی نمایید.
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

      {/* 1. Select Box Options Managers (Guardian & Housing) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guardian Select Options */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                گزینه‌های سلکت‌باکس «{schema.builtin.guardianLabel}»
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

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
            {schema.guardianOptions.map((opt, idx) => (
              <div
                key={`${opt}-${idx}`}
                className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <span className="font-medium text-slate-800 truncate">{opt}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSelectOption('guardianOptions', idx, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="انتقال به بالا"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === schema.guardianOptions.length - 1}
                    onClick={() => moveSelectOption('guardianOptions', idx, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="انتقال به پایین"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSelectOption('guardianOptions', idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
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
                گزینه‌های سلکت‌باکس «{schema.builtin.housingLabel}»
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

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
            {schema.housingOptions.map((opt, idx) => (
              <div
                key={`${opt}-${idx}`}
                className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <span className="font-medium text-slate-800 truncate">{opt}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSelectOption('housingOptions', idx, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="انتقال به بالا"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === schema.housingOptions.length - 1}
                    onClick={() => moveSelectOption('housingOptions', idx, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="انتقال به پایین"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSelectOption('housingOptions', idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
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

      {/* 2. Built-in Fields Visibility & Labels */}
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
        <div>
          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
            مدیریت نمایش / حذف و عنوان فیلدهای پیش‌فرض فرم عمومی
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            مثلاً می‌توانید «تعداد افراد تحت تکفل» را حذف (مخفی) کرده و در بخش پایین یک فیلد موجودیتی «افراد تحت تکفل» به جای آن اضافه نمایید.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {builtinToggleItems.map((item) => {
            const isVisible = schema.builtin[item.key];
            return (
              <div
                key={item.key}
                className={`p-3 rounded-xl border transition space-y-2 ${
                  isVisible
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => toggleBuiltinField(item.key)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                      isVisible
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800'
                    }`}
                  >
                    {isVisible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>فعال در فرم</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>حذف‌شده (بازیابی)</span>
                      </>
                    )}
                  </button>
                </div>

                {item.labelKey && isVisible && (
                  <input
                    type="text"
                    value={schema.builtin[item.labelKey]}
                    onChange={(e) =>
                      setSchema((prev) => ({
                        ...prev,
                        builtin: {
                          ...prev.builtin,
                          [item.labelKey!]: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="عنوان نمایشی فیلد در فرم"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Custom & Entity Fields Builder */}
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 bg-slate-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ListPlus className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                افزودن فیلدهای سفارشی، موجودیتی و سلکت‌باکس به فرم درخواست عمومی
              </h4>
              <p className="text-[11px] text-slate-500">
                علاوه بر فیلدهای متنی/عددی/سلکت‌باکس، می‌توانید «فیلد موجودیتی» (مثل افراد تحت تکفل با جنسیت، سن و تحصیلات) یا «سلکت‌باکس از موجودیت‌ها» اضافه کنید.
              </p>
            </div>
          </div>

          {onOpenEntitiesTab && (
            <button
              type="button"
              onClick={onOpenEntitiesTab}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition cursor-pointer shrink-0"
            >
              مدیریت و تعریف موجودیت‌ها در فرم‌ساز
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
          emptyText="هنوز فیلد سفارشی اضافه نشده است. از بخش بالا می‌توانید فیلدهای متنی، عددی، سلکت‌باکس یا موجودیتی به فرم عمومی اضافه کنید."
        />
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-[11px] text-slate-500">
          پس از تغییر فیلدها یا گزینه‌ها، برای اعمال در فرم عمومی حتماً دکمه ذخیره را بزنید.
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={() => persistSchema(schema)}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات فرم درخواست عمومی'}
        </button>
      </div>
    </div>
  );
};
