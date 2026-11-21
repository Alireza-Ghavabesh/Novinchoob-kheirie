import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  MessageSquareWarning,
  Send,
  Save,
  LogOut,
  RefreshCw,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import {
  AppConfig,
  BeneficiaryAccount,
  BeneficiaryPortalFormItem,
} from '../types';
import {
  CUSTOM_FORM_STATUS_LABELS,
  EntityDefinition,
} from '../utils/publicFormConfig';
import { api } from '../services/api';
import {
  DynamicFieldRenderer,
  DynamicFormValuesMap,
  hydrateValuesFromSubmission,
  validateAndExtractCustomFields,
} from './DynamicFieldRenderer';
import { toPersianDigits } from '../utils/persian';

interface BeneficiaryPortalViewProps {
  beneficiary: BeneficiaryAccount;
  config: AppConfig | null;
  entities: EntityDefinition[];
  onLogout: () => void;
  onBackToPublic: () => void;
}

export const BeneficiaryPortalView: React.FC<BeneficiaryPortalViewProps> = ({
  beneficiary,
  config,
  entities,
  onLogout,
  onBackToPublic,
}) => {
  const [account, setAccount] = useState<BeneficiaryAccount>(beneficiary);
  const [items, setItems] = useState<BeneficiaryPortalFormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [valuesByForm, setValuesByForm] = useState<Record<string, DynamicFormValuesMap>>({});
  const [expandedForms, setExpandedForms] = useState<Record<string, boolean>>({});
  const [submittingFormId, setSubmittingFormId] = useState<string | null>(null);
  const [errorByForm, setErrorByForm] = useState<Record<string, string>>({});
  const [successByForm, setSuccessByForm] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.getBeneficiaryPortal();
      if (data.beneficiary) setAccount(data.beneficiary);
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);

      const initialValues: Record<string, DynamicFormValuesMap> = {};
      const initialExpanded: Record<string, boolean> = {};
      for (const item of list) {
        initialValues[item.form.id] = item.submission
          ? hydrateValuesFromSubmission(item.form.fields, item.submission.data, entities)
          : {};
        initialExpanded[item.form.id] = true;
      }
      setValuesByForm(initialValues);
      setExpandedForms((prev) => ({ ...initialExpanded, ...prev }));
    } catch (err: any) {
      setLoadError(err.message || 'خطا در دریافت فرم‌های پروفایل مددجو');
    } finally {
      setLoading(false);
    }
  }, [entities]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const handleFormSubmit = async (
    e: React.FormEvent,
    item: BeneficiaryPortalFormItem
  ) => {
    e.preventDefault();
    const formId = item.form.id;
    setErrorByForm((prev) => ({ ...prev, [formId]: '' }));
    setSuccessByForm((prev) => ({ ...prev, [formId]: '' }));

    const currentValues = valuesByForm[formId] || {};
    const extracted = validateAndExtractCustomFields(item.form.fields, currentValues, entities);
    if (extracted.error) {
      setErrorByForm((prev) => ({ ...prev, [formId]: extracted.error! }));
      return;
    }

    const isEdit = Boolean(item.submission);
    setSubmittingFormId(formId);
    try {
      const savedSub = await api.submitBeneficiaryForm(formId, extracted.values, isEdit);
      setItems((prev) =>
        prev.map((it) => (it.form.id === formId ? { ...it, submission: savedSub } : it))
      );
      setValuesByForm((prev) => ({
        ...prev,
        [formId]: hydrateValuesFromSubmission(item.form.fields, savedSub.data, entities),
      }));
      setSuccessByForm((prev) => ({
        ...prev,
        [formId]: isEdit
          ? `ویرایش اطلاعات شما با موفقیت ثبت شد (کد پیگیری: ${savedSub.trackingCode}).`
          : `${item.form.successMessage || 'اطلاعات شما با موفقیت ثبت شد.'} — کد پیگیری: ${savedSub.trackingCode}`,
      }));
    } catch (err: any) {
      setErrorByForm((prev) => ({
        ...prev,
        [formId]: err.message || 'خطا در ثبت اطلاعات فرم',
      }));
    } finally {
      setSubmittingFormId(null);
    }
  };

  const scrollToForm = (formId: string) => {
    setExpandedForms((prev) => ({ ...prev, [formId]: true }));
    const el = document.getElementById(`portal-form-${formId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const submittedCount = items.filter((it) => Boolean(it.submission)).length;
  const expertAlerts = items.filter(
    (it) =>
      it.submission &&
      (Boolean(it.submission.expertMessage?.trim()) || it.submission.status === 'NEEDS_INFO')
  );

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToPublic}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به صفحه اصلی</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPortal}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج از پروفایل</span>
          </button>
        </div>
      </div>

      {/* Beneficiary Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-900 text-white p-6 sm:p-7 shadow-xl border border-emerald-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center shrink-0">
              <UserCheck className="w-7 h-7 text-amber-300" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-emerald-200 font-semibold block">
                پروفایل اختصاصی مددجو — {config?.instName || 'مؤسسه خیریه'}
              </span>
              <h2 className="text-lg sm:text-2xl font-extrabold text-white">
                خوش آمدید، {account.fullName}
              </h2>
              <p className="text-xs text-emerald-200 font-mono dir-ltr text-right">
                شماره همراه حساب: {account.phone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center shrink-0">
            <div className="bg-black/25 border border-white/15 rounded-xl px-3 py-2">
              <span className="block text-lg font-black text-white">
                {toPersianDigits(items.length)}
              </span>
              <span className="text-[10px] text-emerald-200">فرم‌های فعال</span>
            </div>
            <div className="bg-black/25 border border-white/15 rounded-xl px-3 py-2">
              <span className="block text-lg font-black text-amber-300">
                {toPersianDigits(submittedCount)}
              </span>
              <span className="text-[10px] text-emerald-200">ثبت‌شده</span>
            </div>
            <div className="bg-black/25 border border-white/15 rounded-xl px-3 py-2">
              <span className="block text-lg font-black text-rose-300">
                {toPersianDigits(expertAlerts.length)}
              </span>
              <span className="text-[10px] text-emerald-200">پیغام کارشناس</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Expert Messages / Incomplete Alerts Banner */}
      {expertAlerts.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm">
            <MessageSquareWarning className="w-5 h-5 text-amber-600 shrink-0" />
            <span>پیغام‌های مهم کارشناس و موارد نیازمند بررسی / تکمیل مدارک</span>
          </div>

          <div className="space-y-2.5">
            {expertAlerts.map((it) => (
              <div
                key={`alert-${it.form.id}`}
                className="bg-white rounded-xl border border-amber-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{it.form.title}</span>
                    {it.submission?.trackingCode && (
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {it.submission.trackingCode}
                      </span>
                    )}
                    {it.submission?.status === 'NEEDS_INFO' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        نقص مدارک / نیازمند اصلاح
                      </span>
                    )}
                  </div>
                  {it.submission?.expertMessage && (
                    <p className="text-amber-950 font-semibold leading-relaxed whitespace-pre-wrap">
                      {it.submission.expertMessage}
                    </p>
                  )}
                  {it.submission?.expertMessageAt && (
                    <span className="text-[10px] text-slate-500 block">
                      ثبت شده توسط {it.submission.expertMessageBy || 'کارشناس'} در تاریخ{' '}
                      {new Date(it.submission.expertMessageAt).toLocaleString('fa-IR')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => scrollToForm(it.form.id)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition"
                >
                  مشاهده و ویرایش فرم
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center space-y-3">
          <div className="w-9 h-9 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">در حال بارگذاری فرم‌های پروفایل شما...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-2">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800">
            در حال حاضر فرمی برای پروفایل مددجو فعال نشده است
          </h3>
          <p className="text-xs text-slate-500">
            مدیر مؤسسه می‌تواند از بخش «فرم‌ساز» فرم‌هایی مثل درخواست کمک یا درخواست ملاقات را برای نمایش در این بخش فعال نماید.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item) => {
            const { form, submission } = item;
            const isExpanded = expandedForms[form.id] !== false;
            const isSubmitting = submittingFormId === form.id;
            const formErr = errorByForm[form.id];
            const formSuccess = successByForm[form.id];

            return (
              <div
                id={`portal-form-${form.id}`}
                key={form.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Form Card Header */}
                <div
                  onClick={() =>
                    setExpandedForms((prev) => ({ ...prev, [form.id]: !isExpanded }))
                  }
                  className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ClipboardList className="w-5 h-5 text-emerald-600 shrink-0" />
                      <h3 className="font-extrabold text-base text-slate-900">{form.title}</h3>

                      {!submission ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
                          تکمیل‌نشده (ثبت اولیه)
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            submission.status === 'APPROVED' || submission.status === 'REVIEWED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : submission.status === 'NEEDS_INFO'
                              ? 'bg-blue-100 text-blue-800'
                              : submission.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : submission.status === 'IN_REVIEW'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {CUSTOM_FORM_STATUS_LABELS[submission.status] || submission.status}
                        </span>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-xs text-slate-500 leading-relaxed">{form.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {submission && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyTracking(submission.trackingCode);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px] font-bold hover:bg-slate-100"
                        title="کپی کد پیگیری"
                      >
                        <Copy className="w-3 h-3 text-emerald-600" />
                        <span>
                          {copiedCode === submission.trackingCode ? 'کپی شد' : submission.trackingCode}
                        </span>
                      </button>
                    )}
                    <span className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </div>
                </div>

                {/* Form Body */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 space-y-5">
                    {/* Expert Message inside form card */}
                    {submission?.expertMessage && (
                      <div className="p-4 rounded-xl bg-amber-50 border-r-4 border-amber-500 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                            <MessageSquareWarning className="w-4 h-4 text-amber-600" />
                            پیغام کارشناس درباره این درخواست:
                          </span>
                          {submission.expertMessageAt && (
                            <span className="text-[11px] text-amber-800 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(submission.expertMessageAt).toLocaleString('fa-IR')}
                            </span>
                          )}
                        </div>
                        <p className="text-amber-950 font-semibold leading-relaxed whitespace-pre-wrap pt-1">
                          {submission.expertMessage}
                        </p>
                      </div>
                    )}

                    {submission?.note && !submission?.expertMessage && (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                        <span className="font-bold">یادداشت وضعیت: </span>
                        <span>{submission.note}</span>
                      </div>
                    )}

                    {formErr && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border-r-4 border-rose-500 text-rose-800 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{formErr}</span>
                      </div>
                    )}

                    {formSuccess && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border-r-4 border-emerald-500 text-emerald-900 text-xs flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{formSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={(e) => handleFormSubmit(e, item)} className="space-y-5">
                      <DynamicFieldRenderer
                        fields={form.fields}
                        values={valuesByForm[form.id] || {}}
                        entities={entities}
                        onChange={(nextVals) =>
                          setValuesByForm((prev) => ({ ...prev, [form.id]: nextVals }))
                        }
                        maxFileSizeMB={form.maxFileSizeMB || 5}
                        uploadContext={{ formId: form.id, formSlug: form.slug }}
                      />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <span className="text-[11px] text-slate-500">
                          {submission
                            ? 'می‌توانید در هر زمان فیلدها یا فایل‌های پیوست این فرم را ویرایش کرده و مجدداً ثبت کنید.'
                            : 'پس از تکمیل فیلدها، دکمه زیر را برای ثبت نهایی بزنید.'}
                        </span>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                        >
                          {submission ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                          <span>
                            {isSubmitting
                              ? 'در حال ذخیره...'
                              : submission
                              ? 'ذخیره و ثبت ویرایش اطلاعات'
                              : form.submitButtonText || 'ثبت اطلاعات فرم'}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
