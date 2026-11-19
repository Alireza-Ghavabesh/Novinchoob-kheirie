import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  ShieldAlert,
  Phone,
  MapPin,
  Archive,
} from 'lucide-react';
import { AppConfig, CustomForm } from '../types';
import { EntityDefinition, parseCustomFormFieldsList } from '../utils/publicFormConfig';
import { api } from '../services/api';
import {
  DynamicFieldRenderer,
  DynamicFormValuesMap,
  validateAndExtractCustomFields,
} from './DynamicFieldRenderer';
import { toEnglishDigits } from '../utils/persian';

interface CustomFormPublicViewProps {
  slug: string;
  config: AppConfig | null;
}

const THEME_GRADIENTS: Record<string, string> = {
  emerald: 'from-emerald-800 via-teal-800 to-emerald-900 border-emerald-700/60',
  teal: 'from-teal-800 via-cyan-800 to-teal-900 border-teal-700/60',
  blue: 'from-blue-900 via-indigo-800 to-slate-900 border-blue-700/60',
  amber: 'from-amber-700 via-orange-700 to-amber-900 border-amber-600/60',
  slate: 'from-slate-800 via-slate-900 to-slate-950 border-slate-700/60',
};

export const CustomFormPublicView: React.FC<CustomFormPublicViewProps> = ({ slug, config }) => {
  const [form, setForm] = useState<CustomForm | null>(null);
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [values, setValues] = useState<DynamicFormValuesMap>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Optional tracking lookup
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<{
    trackingCode: string;
    status: string;
    note?: string | null;
    createdAt: string;
  } | null>(null);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [f, ents] = await Promise.all([api.getPublicForm(slug), api.getEntities()]);
        if (!mounted) return;
        setForm({
          ...f,
          fields: parseCustomFormFieldsList(f.fields),
        });
        setEntities(Array.isArray(ents) ? ents : []);
      } catch (err: any) {
        if (mounted) setLoadError(err.message || 'فرم مورد نظر در دسترس نیست.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setFormError('');

    const extracted = validateAndExtractCustomFields(form.fields, values, entities);
    if (extracted.error) {
      setFormError(extracted.error);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitPublicForm(form.slug, extracted.values);
      setSubmittedCode(res.trackingCode);
      setValues({});
    } catch (err: any) {
      setFormError(err.message || 'خطا در ثبت اطلاعات فرم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const cleaned = toEnglishDigits(trackingInput.trim());
    if (!cleaned) return;
    setTrackingLoading(true);
    setTrackingError('');
    setTrackingResult(null);
    try {
      const res = await api.trackFormSubmission(form.slug, cleaned);
      setTrackingResult(res);
    } catch (err: any) {
      setTrackingError(err.message || 'رکوردی یافت نشد.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const copyCode = () => {
    if (!submittedCode) return;
    navigator.clipboard.writeText(submittedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">در حال بارگذاری فرم...</p>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">عدم دسترسی به فرم</h2>
          <p className="text-xs text-slate-600">{loadError || 'فرم مورد نظر یافت نشد.'}</p>
        </div>
      </div>
    );
  }

  const heroTheme = THEME_GRADIENTS[form.theme] || THEME_GRADIENTS.emerald;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${heroTheme} text-white p-6 sm:p-8 shadow-xl border`}>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-2.5">
            {form.heroBadge && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {form.heroBadge}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {form.title}
            </h2>
            {form.description && (
              <p className="text-sm text-white/90 max-w-2xl leading-relaxed whitespace-pre-line">
                {form.description}
              </p>
            )}
          </div>

          {config?.phone && (
            <div className="bg-black/25 p-4 rounded-xl border border-white/15 text-center shrink-0 w-full md:w-auto">
              <p className="text-xs text-white/75 mb-1">پاسخگویی مؤسسه:</p>
              <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-base dir-ltr">
                <Phone className="w-4 h-4" />
                <span>{config.phone}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Box */}
      {submittedCode && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 shadow-md text-slate-800 space-y-4">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold">{form.successMessage}</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                اطلاعات شما با موفقیت در سامانه ثبت شد.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 block mb-1">کد پیگیری اختصاصی شما:</span>
              <span className="text-xl font-black text-emerald-800 tracking-wider font-mono">
                {submittedCode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? 'کپی شد!' : 'کپی کد پیگیری'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSubmittedCode('')}
                className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className={`grid grid-cols-1 ${form.showTracking ? 'lg:grid-cols-3' : ''} gap-8`}>
        {/* Form Card */}
        <div className={`${form.showTracking ? 'lg:col-span-2' : ''} bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8`}>
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>تکمیل اطلاعات فرم</span>
            </h3>
          </div>

          {formError && (
            <div className="mb-6 bg-rose-50 border-r-4 border-rose-500 p-3.5 rounded-lg text-rose-800 text-xs sm:text-sm flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {form.fields.filter((f) => f.enabled !== false).length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              هنوز فیلدی برای این فرم تعریف نشده است.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <DynamicFieldRenderer
                fields={form.fields}
                values={values}
                entities={entities}
                onChange={setValues}
              />

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'در حال ثبت اطلاعات...' : form.submitButtonText}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Side Tracking & Info Card */}
        {form.showTracking && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Search className="w-5 h-5 text-emerald-600" />
                پیگیری وضعیت ثبت فرم
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                کد پیگیری دریافتی پس از ثبت فرم (مثلاً FRM-1404-1001) را وارد کنید:
              </p>

              <form onSubmit={handleTrack} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="کد پیگیری"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  disabled={trackingLoading || !trackingInput.trim()}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow disabled:opacity-50 cursor-pointer"
                >
                  {trackingLoading ? 'در حال استعلام...' : 'استعلام وضعیت'}
                </button>
              </form>

              {trackingError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{trackingError}</span>
                </div>
              )}

              {trackingResult && (
                <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">کد پیگیری:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {trackingResult.trackingCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">وضعیت بررسی:</span>
                    {trackingResult.status === 'REVIEWED' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        بررسی شده
                      </span>
                    ) : trackingResult.status === 'ARCHIVED' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full">
                        <Archive className="w-3.5 h-3.5" />
                        بایگانی شده
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        در صف بررسی
                      </span>
                    )}
                  </div>
                  {trackingResult.note && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-blue-900 text-[11px]">
                      {trackingResult.note}
                    </div>
                  )}
                </div>
              )}
            </div>

            {config?.address && (
              <div className="bg-slate-900 text-slate-300 rounded-2xl p-5 text-xs flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-1">
                    {config.instName || 'مؤسسه خیریه'}
                  </span>
                  <span>{config.address}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
