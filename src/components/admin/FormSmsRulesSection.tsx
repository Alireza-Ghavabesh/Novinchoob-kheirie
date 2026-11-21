import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Power,
  Check,
  X,
  Info,
  AlertTriangle,
  Users,
  Smartphone,
} from 'lucide-react';
import {
  CUSTOM_FORM_STATUS_LABELS,
  CustomFormField,
  CustomFormSmsRule,
  FormSmsEventType,
} from '../../utils/publicFormConfig';
import { appendSmsCancellationFooter } from '../../utils/smsFormat';
import { toPersianDigits } from '../../utils/persian';

interface FormSmsRulesSectionProps {
  fields: CustomFormField[];
  rules: CustomFormSmsRule[];
  onChange: (nextRules: CustomFormSmsRule[]) => void;
}

const EVENT_TYPE_LABELS: Record<FormSmsEventType, string> = {
  FORM_SUBMITTED: 'هنگام ثبت اولیه فرم',
  FORM_UPDATED: 'هنگام ویرایش فرم توسط مددجو',
  EXPERT_MESSAGE_ADDED: 'هنگام ثبت یا ویرایش پیغام کارشناس',
  FORM_STATUS_CHANGED: 'هنگام تغییر وضعیت بررسی فرم',
};

const EMPTY_RULE = (): CustomFormSmsRule => ({
  id: `rule_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
  title: '',
  isActive: true,
  eventType: 'EXPERT_MESSAGE_ADDED',
  triggerStatus: 'ALL',
  useAccountPhone: true,
  useFormPhoneFields: true,
  formPhoneFieldIds: [],
  useAdmins: false,
  customNumbers: '',
  templateType: 'SIMPLE',
  templateName: '',
  templateParam1: '',
  templateParam2: '',
  templateParam3: '',
  messageBody:
    'سلام {accountName} عزیز، پیغام کارشناس درباره «{formTitle}» ({trackingCode}):\n{expertMessage}',
});

const BUILTIN_TOKENS: Array<{ token: string; label: string }> = [
  { token: '{accountName}', label: 'نام مددجو' },
  { token: '{accountPhone}', label: 'موبایل حساب مددجو' },
  { token: '{formTitle}', label: 'عنوان فرم' },
  { token: '{trackingCode}', label: 'کد پیگیری' },
  { token: '{status}', label: 'وضعیت فعلی' },
  { token: '{expertMessage}', label: 'پیغام کارشناس' },
  { token: '{instName}', label: 'نام مؤسسه' },
  { token: '{date}', label: 'تاریخ' },
];

export const FormSmsRulesSection: React.FC<FormSmsRulesSectionProps> = ({
  fields,
  rules,
  onChange,
}) => {
  const [editingRule, setEditingRule] = useState<CustomFormSmsRule | null>(null);
  const [ruleError, setRuleError] = useState('');

  const candidateFormFields = fields.filter(
    (f) => f.type === 'phone' || f.type === 'text' || f.type === 'number'
  );

  const openNewRule = () => {
    setRuleError('');
    const phoneFields = fields.filter((f) => f.type === 'phone').map((f) => f.id);
    setEditingRule({
      ...EMPTY_RULE(),
      formPhoneFieldIds: phoneFields,
    });
  };

  const openEditRule = (r: CustomFormSmsRule) => {
    setRuleError('');
    setEditingRule({
      ...r,
      formPhoneFieldIds: Array.isArray(r.formPhoneFieldIds) ? [...r.formPhoneFieldIds] : [],
    });
  };

  const toggleRuleActive = (id: string) => {
    onChange(rules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  };

  const deleteRule = (id: string) => {
    onChange(rules.filter((r) => r.id !== id));
    if (editingRule?.id === id) setEditingRule(null);
  };

  const toggleFormPhoneField = (fieldId: string) => {
    if (!editingRule) return;
    const exists = editingRule.formPhoneFieldIds.includes(fieldId);
    setEditingRule({
      ...editingRule,
      formPhoneFieldIds: exists
        ? editingRule.formPhoneFieldIds.filter((id) => id !== fieldId)
        : [...editingRule.formPhoneFieldIds, fieldId],
    });
  };

  const appendTokenToBody = (token: string) => {
    if (!editingRule) return;
    const sep =
      editingRule.messageBody && !editingRule.messageBody.endsWith(' ') && !editingRule.messageBody.endsWith('\n')
        ? ' '
        : '';
    setEditingRule({
      ...editingRule,
      messageBody: `${editingRule.messageBody}${sep}${token}`,
    });
  };

  const saveRule = () => {
    if (!editingRule) return;
    setRuleError('');
    if (!editingRule.title.trim()) {
      setRuleError('لطفاً عنوان این قانون پیامکی را وارد نمایید.');
      return;
    }
    const hasCustomNums = Boolean(editingRule.customNumbers?.trim());
    if (
      !editingRule.useAccountPhone &&
      !editingRule.useFormPhoneFields &&
      !editingRule.useAdmins &&
      !hasCustomNums
    ) {
      setRuleError('حداقل یک نوع گیرنده پیامک را انتخاب نمایید.');
      return;
    }
    if (editingRule.templateType === 'SIMPLE' && !editingRule.messageBody.trim()) {
      setRuleError('متن پیامک نمی‌تواند خالی باشد.');
      return;
    }
    if (editingRule.templateType === 'OTP' && !editingRule.templateName?.trim()) {
      setRuleError('نام قالب خدماتی قاصدک (Template) الزامی است.');
      return;
    }

    const normalized: CustomFormSmsRule = {
      ...editingRule,
      title: editingRule.title.trim(),
      messageBody:
        editingRule.templateType === 'OTP'
          ? editingRule.messageBody.trim()
          : appendSmsCancellationFooter(editingRule.messageBody),
    };

    const exists = rules.some((r) => r.id === normalized.id);
    if (exists) {
      onChange(rules.map((r) => (r.id === normalized.id ? normalized : r)));
    } else {
      onChange([...rules, normalized]);
    }
    setEditingRule(null);
  };

  const describeRecipients = (r: CustomFormSmsRule): string => {
    const parts: string[] = [];
    if (r.useAccountPhone) parts.push('موبایل اکانت مددجو');
    if (r.useFormPhoneFields) {
      if (r.formPhoneFieldIds.length > 0) {
        const labels = r.formPhoneFieldIds
          .map((id) => fields.find((f) => f.id === id)?.label || id)
          .join('، ');
        parts.push(`فیلدهای فرم (${labels})`);
      } else {
        parts.push('فیلدهای موبایل فرم');
      }
    }
    if (r.useAdmins) parts.push('مدیران/کادر');
    if (r.customNumbers?.trim()) parts.push('شماره‌های دلخواه');
    return parts.length > 0 ? parts.join(' + ') : 'بدون گیرنده';
  };

  return (
    <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/70 pb-3">
        <div className="flex items-start gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              ۳. قوانین پویای ارسال پیامک اختصاصی این فرم (بدون نیاز به کدنویسی)
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              تعیین کنید روی چه رویدادی (ثبت فرم، ویرایش، ثبت پیغام کارشناس یا تغییر وضعیت) به چه گیرندگانی (هم‌زمان یک یا چند گیرنده: موبایل اکانت مددجو، شماره ثبت‌شده در فیلدهای فرم برای ثبت شخص ثالث، مدیران یا شماره‌های دلخواه) پیامک ارسال شود.
            </p>
          </div>
        </div>

        {!editingRule && (
          <button
            type="button"
            onClick={openNewRule}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer shrink-0 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن قانون پیامک</span>
          </button>
        )}
      </div>

      {/* Existing Rules List */}
      {rules.length === 0 && !editingRule ? (
        <div className="text-center py-5 px-3 rounded-xl border border-dashed border-indigo-300 bg-white/80 text-xs text-slate-500">
          هنوز قانون پیامکی برای این فرم تعریف نشده است. برای ارسال خودکار پیامک هنگام ثبت پیغام کارشناس یا تغییر وضعیت، روی «افزودن قانون پیامک» کلیک کنید.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className={`p-3 rounded-xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                r.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">{r.title}</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-semibold">
                    {EVENT_TYPE_LABELS[r.eventType]}
                    {r.eventType === 'FORM_STATUS_CHANGED' &&
                      r.triggerStatus &&
                      r.triggerStatus !== 'ALL' &&
                      ` (${CUSTOM_FORM_STATUS_LABELS[r.triggerStatus] || r.triggerStatus})`}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      r.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {r.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 flex items-center gap-1 flex-wrap">
                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>گیرندگان: {describeRecipients(r)}</span>
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => toggleRuleActive(r.id)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    r.isActive
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-slate-400 hover:bg-slate-100'
                  }`}
                  title={r.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openEditRule(r)}
                  className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                  title="ویرایش قانون"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteRule(r.id)}
                  className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="حذف قانون"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule Builder Sub-panel */}
      {editingRule && (
        <div className="bg-white rounded-2xl border-2 border-indigo-300 p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="font-bold text-indigo-900 text-xs sm:text-sm">
              تنظیم قانون ارسال پیامک
            </span>
            <button
              type="button"
              onClick={() => setEditingRule(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {ruleError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{ruleError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                عنوان قانون <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editingRule.title}
                onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                placeholder="مثال: اطلاع‌رسانی پیغام کارشناس یا نقص مدارک"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">رویداد ماشه (Trigger)</label>
              <select
                value={editingRule.eventType}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, eventType: e.target.value as FormSmsEventType })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editingRule.eventType === 'FORM_STATUS_CHANGED' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                فقط هنگام تغییر به این وضعیت ارسال شود:
              </label>
              <select
                value={editingRule.triggerStatus || 'ALL'}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, triggerStatus: e.target.value })
                }
                className="w-full sm:w-1/2 px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none"
              >
                <option value="ALL">تمامی تغییرات وضعیت</option>
                {Object.entries(CUSTOM_FORM_STATUS_LABELS).map(([code, lbl]) => (
                  <option key={code} value={code}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Multi-Select Recipients */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="block font-bold text-slate-800 text-xs">
              گیرندگان پیامک (می‌توانید چند گزینه را هم‌زمان انتخاب کنید):
            </span>

            <label className="flex items-start gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={editingRule.useAccountPhone}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, useAccountPhone: e.target.checked })
                }
                className="mt-0.5 rounded text-indigo-600"
              />
              <div>
                <span className="font-semibold block">شماره همراه حساب کاربری مددجو</span>
                <span className="text-[10px] text-slate-500">
                  شماره موبایلی که مددجو با آن وارد پروفایل خود شده است
                </span>
              </div>
            </label>

            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={editingRule.useFormPhoneFields}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, useFormPhoneFields: e.target.checked })
                  }
                  className="mt-0.5 rounded text-indigo-600"
                />
                <div>
                  <span className="font-semibold block">
                    شماره(های) ثبت‌شده در فیلدهای این فرم (مناسب ثبت توسط شخص ثالث)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    انتخاب کنید شماره موبایل از کدام فیلد یا فیلدهای فرم خوانده شود
                  </span>
                </div>
              </label>

              {editingRule.useFormPhoneFields && (
                <div className="mr-6 p-2.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  {candidateFormFields.length === 0 ? (
                    <span className="text-[11px] text-amber-700 block">
                      هنوز فیلد متنی/موبایل در این فرم تعریف نشده است. پس از افزودن فیلد «شماره موبایل (Phone)» می‌توانید آن را اینجا تیک بزنید.
                    </span>
                  ) : (
                    <>
                      <span className="text-[11px] font-semibold text-slate-600 block">
                        فیلدهای مبدا شماره همراه ({toPersianDigits(editingRule.formPhoneFieldIds.length)} انتخاب):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {candidateFormFields.map((cf) => {
                          const selected = editingRule.formPhoneFieldIds.includes(cf.id);
                          return (
                            <label
                              key={cf.id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer transition ${
                                selected
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleFormPhoneField(cf.id)}
                                className="rounded text-indigo-600"
                              />
                              {cf.type === 'phone' && <Smartphone className="w-3 h-3 text-amber-600" />}
                              <span>{cf.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      {editingRule.formPhoneFieldIds.length === 0 && (
                        <span className="text-[10px] text-slate-400 block">
                          در صورت انتخاب نکردن مورد خاص، به‌صورت خودکار از تمامی فیلدهای از نوع «شماره موبایل» این فرم استفاده می‌شود.
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={editingRule.useAdmins}
                onChange={(e) => setEditingRule({ ...editingRule, useAdmins: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600"
              />
              <span>شماره همراه مدیران و کارشناسان فعال مؤسسه</span>
            </label>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                شماره‌های دلخواه اضافی (اختیاری - جداشده با کاما یا خط جدید)
              </label>
              <input
                type="text"
                dir="ltr"
                value={editingRule.customNumbers}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, customNumbers: e.target.value })
                }
                placeholder="09120000000, 09121111111"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-mono text-left outline-none"
              />
            </div>
          </div>

          {/* Message Type & Template */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-slate-700">نوع ارسال:</label>
              <select
                value={editingRule.templateType}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    templateType: e.target.value === 'OTP' ? 'OTP' : 'SIMPLE',
                  })
                }
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white outline-none"
              >
                <option value="SIMPLE">پیامک متنی دلخواه (ارسال با سرشماره)</option>
                <option value="OTP">قالب خدماتی قاصدک (OTP / Pattern)</option>
              </select>
            </div>

            {/* Dynamic Placeholders Helper */}
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-950 block">
                متغیرهای پویا (برای درج در متن پیامک یا پارامتر قالب کلیک کنید):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BUILTIN_TOKENS.map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() => appendTokenToBody(t.token)}
                    className="px-2 py-0.5 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-[10px] font-semibold text-slate-800 cursor-pointer"
                  >
                    {t.label} <span className="font-mono text-amber-800">{t.token}</span>
                  </button>
                ))}
                {fields.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => appendTokenToBody(`{field:${f.id}}`)}
                    className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-[10px] font-semibold text-indigo-900 cursor-pointer"
                  >
                    + فیلد: {f.label}
                  </button>
                ))}
              </div>
            </div>

            {editingRule.templateType === 'SIMPLE' ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">متن پیامک</label>
                <textarea
                  rows={3}
                  value={editingRule.messageBody}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, messageBody: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>
                    عبارت «لغو 11» به‌صورت خودکار در خط جدید انتهای پیامک افزوده می‌شود.
                  </span>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام قالب ثبت‌شده در قاصدک (Template Name)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editingRule.templateName || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, templateName: e.target.value })
                    }
                    placeholder="charity_expert_msg"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">پرامپت ۱ (param1)</label>
                  <input
                    type="text"
                    value={editingRule.templateParam1 || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, templateParam1: e.target.value })
                    }
                    placeholder="{accountName}"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">پرامپت ۲ (param2)</label>
                  <input
                    type="text"
                    value={editingRule.templateParam2 || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, templateParam2: e.target.value })
                    }
                    placeholder="{trackingCode}"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">پرامپت ۳ (param3)</label>
                  <input
                    type="text"
                    value={editingRule.templateParam3 || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, templateParam3: e.target.value })
                    }
                    placeholder="{expertMessage}"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={editingRule.isActive}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, isActive: e.target.checked })
                }
                className="rounded text-indigo-600"
              />
              <span>این قانون فعال باشد</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={saveRule}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ثبت قانون در فرم</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
