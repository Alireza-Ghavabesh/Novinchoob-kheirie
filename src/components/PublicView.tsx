import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Send,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Copy,
  Info,
  Phone,
  MapPin,
  FileText,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { AppConfig, Category, BeneficiaryRequest } from '../types';
import {
  formatToman,
  numberToPersianWords,
  isValidIranianNID,
  toEnglishDigits,
} from '../utils/persian';
import { api } from '../services/api';
import {
  EntityDefinition,
  parsePublicFormSchema,
} from '../utils/publicFormConfig';
import {
  DynamicFieldRenderer,
  DynamicFormValuesMap,
  validateAndExtractCustomFields,
} from './DynamicFieldRenderer';
import { ShamsiDatePicker } from './ShamsiDatePicker';

const THEME_GRADIENTS: Record<string, string> = {
  emerald: 'from-emerald-800 via-teal-800 to-emerald-900 border-emerald-700/60',
  teal: 'from-teal-800 via-cyan-800 to-teal-900 border-teal-700/60',
  blue: 'from-blue-900 via-indigo-800 to-slate-900 border-blue-700/60',
  amber: 'from-amber-700 via-orange-700 to-amber-900 border-amber-600/60',
  slate: 'from-slate-800 via-slate-900 to-slate-950 border-slate-700/60',
};

interface PublicViewProps {
  config: AppConfig | null;
  needCategories: Category[];
  entities?: EntityDefinition[];
  onRequestSubmitted?: () => void;
  onOpenBeneficiaryPortal?: () => void;
}

export const PublicView: React.FC<PublicViewProps> = ({
  config,
  needCategories,
  entities = [],
  onRequestSubmitted,
  onOpenBeneficiaryPortal,
}) => {
  const formSchema = useMemo(
    () => parsePublicFormSchema(config?.publicFormConfig),
    [config?.publicFormConfig]
  );

  // Form State
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [guardian, setGuardian] = useState(formSchema.guardianOptions[0] || 'زن سرپرست خانوار');
  const [dependents, setDependents] = useState(2);
  const [housing, setHousing] = useState(formSchema.housingOptions[0] || 'استیجاری');
  const [cat, setCat] = useState('');
  const [requestedAmount, setRequestedAmount] = useState<number | ''>(15000000);
  const [desc, setDesc] = useState('');
  const [address, setAddress] = useState('');
  const [customValues, setCustomValues] = useState<DynamicFormValuesMap>({});

  // Sync default select values if schema options change in settings
  useEffect(() => {
    if (formSchema.guardianOptions.length > 0 && !formSchema.guardianOptions.includes(guardian)) {
      setGuardian(formSchema.guardianOptions[0]);
    }
  }, [formSchema.guardianOptions, guardian]);

  useEffect(() => {
    if (formSchema.housingOptions.length > 0 && !formSchema.housingOptions.includes(housing)) {
      setHousing(formSchema.housingOptions[0]);
    }
  }, [formSchema.housingOptions, housing]);

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<BeneficiaryRequest | null>(null);
  const [copied, setCopied] = useState(false);

  // Tracking State
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [trackingError, setTrackingError] = useState('');

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const b = formSchema.builtin;

    if (b.showName && b.requiredName && !name.trim()) {
      setFormError(`لطفاً «${b.nameLabel}» را وارد نمایید.`);
      return;
    }

    const cleanNid = toEnglishDigits(nid.trim());
    if (b.showNid && b.requiredNid && !cleanNid) {
      setFormError(`لطفاً «${b.nidLabel}» را وارد نمایید.`);
      return;
    }
    if (b.showNid && cleanNid) {
      if (cleanNid.length !== 10) {
        setFormError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
        return;
      }
      if (!isValidIranianNID(cleanNid)) {
        setFormError('کد ملی وارد شده با الگوریتم استاندارد کشوری مطابقت ندارد.');
        return;
      }
    }

    const cleanPhone = toEnglishDigits(phone.trim());
    if (b.showPhone && b.requiredPhone && (!cleanPhone || cleanPhone.length < 10)) {
      setFormError('شماره تلفن همراه معتبر نمی‌باشد.');
      return;
    }
    if (b.showPhone && cleanPhone && cleanPhone.length < 10) {
      setFormError('شماره تلفن همراه معتبر نمی‌باشد.');
      return;
    }

    if (b.showBirthDate && b.requiredBirthDate && !birthDate.trim()) {
      setFormError(`لطفاً «${b.birthDateLabel}» را انتخاب نمایید.`);
      return;
    }
    if (b.showRequestedAmount && b.requiredRequestedAmount && (!requestedAmount || Number(requestedAmount) <= 0)) {
      setFormError(`لطفاً «${b.requestedAmountLabel}» را وارد نمایید.`);
      return;
    }
    if (b.showDesc && b.requiredDesc && !desc.trim()) {
      setFormError(`لطفاً «${b.descLabel}» را وارد نمایید.`);
      return;
    }
    if (b.showAddress && b.requiredAddress && !address.trim()) {
      setFormError(`لطفاً «${b.addressLabel}» را وارد نمایید.`);
      return;
    }

    const extracted = validateAndExtractCustomFields(
      formSchema.customFields,
      customValues,
      entities
    );
    if (extracted.error) {
      setFormError(extracted.error);
      return;
    }
    const submittedCustomFields = extracted.values;

    const selectedCat = b.showCat
      ? cat || (needCategories[0] ? needCategories[0].name : 'درمان و هزینه‌های پزشکی')
      : '-';

    try {
      setSubmitting(true);
      const newReq = await api.createRequest({
        name: b.showName ? name.trim() : '-',
        nid: b.showNid ? cleanNid : '',
        phone: b.showPhone ? cleanPhone : '',
        birthDate: b.showBirthDate ? birthDate.trim() : '',
        guardian: b.showGuardian ? guardian : '-',
        dependents: b.showDependents ? Number(dependents) : 0,
        housing: b.showHousing ? housing : '-',
        cat: selectedCat,
        requestedAmount: b.showRequestedAmount ? Number(requestedAmount) || 0 : 0,
        desc: b.showDesc ? desc.trim() : '',
        address: b.showAddress ? address.trim() : '',
        customFields: submittedCustomFields,
      });

      setSubmittedRequest(newReq);
      if (onRequestSubmitted) onRequestSubmitted();

      // Reset fields
      setName('');
      setNid('');
      setPhone('');
      setBirthDate('');
      setDesc('');
      setAddress('');
      setRequestedAmount(15000000);
      setCustomValues({});
    } catch (err: any) {
      setFormError(err.message || 'خطا در ثبت درخواست');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Tracking Search
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = toEnglishDigits(trackingInput.trim());
    if (!cleaned) return;

    setTrackingLoading(true);
    setTrackingError('');
    setTrackingResult(null);

    try {
      const res = await api.trackRequest(cleaned);
      setTrackingResult(res);
    } catch (err: any) {
      setTrackingError(err.message || 'پرونده‌ای با این مشخصات یافت نشد.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const copyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${
          THEME_GRADIENTS[formSchema.theme || 'emerald'] || THEME_GRADIENTS.emerald
        } text-white p-6 sm:p-8 shadow-xl border`}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-3">
            {formSchema.heroBadge && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {formSchema.heroBadge}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug">
              {formSchema.title}
            </h2>
            {formSchema.description && (
              <p className="text-sm text-white/90 max-w-2xl leading-relaxed whitespace-pre-line">
                {formSchema.description}
              </p>
            )}
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-xl border border-emerald-600/40 text-center shrink-0 w-full md:w-auto space-y-2.5">
            <div>
              <p className="text-xs text-emerald-300 mb-1">تلفن مستقیم پاسخگویی و مددکاری:</p>
              <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-base sm:text-lg dir-ltr">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{config?.phone || '021-55667788'}</span>
              </div>
              <p className="text-[11px] text-emerald-400/80 mt-1">ساعت ۸ صبح الی ۱۶ عصر</p>
            </div>
            {onOpenBeneficiaryPortal && (
              <button
                type="button"
                onClick={onOpenBeneficiaryPortal}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow transition cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>ورود به پروفایل مددجو</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {config?.notice && (
        <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-xl shadow-sm flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
            <strong className="block text-amber-950 mb-0.5">اطلاعیه مهم مددکاری:</strong>
            {config.notice}
          </div>
        </div>
      )}

      {/* Success Modal / Box if request just submitted */}
      {submittedRequest && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 shadow-md text-slate-800 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-4 text-emerald-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-lg font-bold">{formSchema.successMessage}</h3>
              <p className="text-xs text-emerald-700">
                پرونده مددکاری برای شما ایجاد شد و در نوبت رسیدگی کمیسیون قرار گرفت.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 block mb-1">کد رهگیری اختصاصی پرونده شما:</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-wider font-mono">
                {submittedRequest.trackingCode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyTrackingCode(submittedRequest.trackingCode)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow transition"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'کپی شد!' : 'کپی کد رهگیری'}
              </button>
              <button
                onClick={() => setSubmittedRequest(null)}
                className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
              >
                بستن پیام
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Two Columns: Request Form & Tracking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Beneficiary Intake Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                تکمیل مشخصات و ثبت درخواست کمک
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                لطفاً تمامی موارد را با دقت و بر اساس مدارک شناسایی ثبت نمایید.
              </p>
            </div>
          </div>

          {formError && (
            <div className="mb-6 bg-rose-50 border-r-4 border-rose-500 p-3.5 rounded-lg text-rose-800 text-xs sm:text-sm flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Name & National ID */}
            {(formSchema.builtin.showName || formSchema.builtin.showNid) && (
              <div
                className={`grid grid-cols-1 ${
                  formSchema.builtin.showName && formSchema.builtin.showNid ? 'sm:grid-cols-2' : ''
                } gap-4`}
              >
                {formSchema.builtin.showName && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {formSchema.builtin.nameLabel}{' '}
                      {formSchema.builtin.requiredName && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      required={formSchema.builtin.requiredName}
                      placeholder={formSchema.builtin.namePlaceholder}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition"
                    />
                  </div>
                )}

                {formSchema.builtin.showNid && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {formSchema.builtin.nidLabel}{' '}
                      {formSchema.builtin.requiredNid && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      required={formSchema.builtin.requiredNid}
                      maxLength={10}
                      placeholder={formSchema.builtin.nidPlaceholder}
                      value={nid}
                      onChange={(e) => setNid(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Row 2: Phone & Birth Date */}
            {(formSchema.builtin.showPhone || formSchema.builtin.showBirthDate) && (
              <div
                className={`grid grid-cols-1 ${
                  formSchema.builtin.showPhone && formSchema.builtin.showBirthDate
                    ? 'sm:grid-cols-2'
                    : ''
                } gap-4`}
              >
                {formSchema.builtin.showPhone && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {formSchema.builtin.phoneLabel}{' '}
                      {formSchema.builtin.requiredPhone && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="tel"
                      required={formSchema.builtin.requiredPhone}
                      placeholder={formSchema.builtin.phonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition font-mono dir-ltr text-right"
                    />
                  </div>
                )}

                {formSchema.builtin.showBirthDate && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {formSchema.builtin.birthDateLabel}{' '}
                      {formSchema.builtin.requiredBirthDate && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <ShamsiDatePicker
                      value={birthDate}
                      onChange={setBirthDate}
                      placeholder={formSchema.builtin.birthDatePlaceholder}
                      required={formSchema.builtin.requiredBirthDate}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Row 3: Guardian Status, Dependents & Housing (Dynamically shown) */}
            {(formSchema.builtin.showGuardian ||
              formSchema.builtin.showDependents ||
              formSchema.builtin.showHousing) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {formSchema.builtin.showGuardian && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {formSchema.builtin.guardianLabel}{' '}
                      {formSchema.builtin.requiredGuardian && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <select
                      required={formSchema.builtin.requiredGuardian}
                      value={guardian}
                      onChange={(e) => setGuardian(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {formSchema.guardianOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formSchema.builtin.showDependents && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {formSchema.builtin.dependentsLabel}{' '}
                      {formSchema.builtin.requiredDependents && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        required={formSchema.builtin.requiredDependents}
                        placeholder={formSchema.builtin.dependentsPlaceholder}
                        value={dependents}
                        onChange={(e) => setDependents(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <span className="mr-2 text-xs text-slate-500 shrink-0">نفر</span>
                    </div>
                  </div>
                )}

                {formSchema.builtin.showHousing && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {formSchema.builtin.housingLabel}{' '}
                      {formSchema.builtin.requiredHousing && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <select
                      required={formSchema.builtin.requiredHousing}
                      value={housing}
                      onChange={(e) => setHousing(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {formSchema.housingOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Row 4: Need Category & Optional Requested Amount */}
            {(formSchema.builtin.showCat || formSchema.builtin.showRequestedAmount) && (
              <div
                className={`grid grid-cols-1 ${
                  formSchema.builtin.showCat && formSchema.builtin.showRequestedAmount
                    ? 'sm:grid-cols-2'
                    : ''
                } gap-4`}
              >
                {formSchema.builtin.showCat && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {formSchema.builtin.catLabel}{' '}
                      {formSchema.builtin.requiredCat && <span className="text-rose-500">*</span>}
                    </label>
                    <select
                      required={formSchema.builtin.requiredCat}
                      value={cat}
                      onChange={(e) => setCat(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                    >
                      {needCategories.length > 0 ? (
                        needCategories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      ) : (
                        <option value="درمان و هزینه‌های پزشکی و جراحی">
                          درمان و هزینه‌های پزشکی و جراحی
                        </option>
                      )}
                    </select>
                  </div>
                )}

                {formSchema.builtin.showRequestedAmount && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {formSchema.builtin.requestedAmountLabel}{' '}
                      {formSchema.builtin.requiredRequestedAmount && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step={500000}
                      required={formSchema.builtin.requiredRequestedAmount}
                      value={requestedAmount}
                      onChange={(e) =>
                        setRequestedAmount(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder={formSchema.builtin.requestedAmountPlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                    {typeof requestedAmount === 'number' && requestedAmount > 0 && (
                      <p className="text-[11px] text-emerald-700 font-medium mt-1">
                        معادل: {numberToPersianWords(requestedAmount)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Custom & Entity Fields from Admin Settings */}
            <DynamicFieldRenderer
              fields={formSchema.customFields}
              values={customValues}
              entities={entities}
              onChange={setCustomValues}
              maxFileSizeMB={formSchema.maxFileSizeMB || 5}
              uploadContext={{ source: 'public_form' }}
            />

            {/* Row 5: Detailed Description */}
            {formSchema.builtin.showDesc && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {formSchema.builtin.descLabel}{' '}
                  {formSchema.builtin.requiredDesc && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  required={formSchema.builtin.requiredDesc}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder={formSchema.builtin.descPlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            )}

            {/* Row 6: Address */}
            {formSchema.builtin.showAddress && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {formSchema.builtin.addressLabel}{' '}
                  {formSchema.builtin.requiredAddress && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  required={formSchema.builtin.requiredAddress}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={formSchema.builtin.addressPlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span>در حال ثبت در دیتابیس...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{formSchema.submitButtonText}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (1 Col): Online Tracking & Info */}
        <div className="space-y-6">
          {/* Tracking Box */}
          {formSchema.showTracking && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-emerald-600" />
              پیگیری وضعیت پرونده
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              کد رهگیری (مثلاً REQ-1405-1001) یا کد ملی ۱۰ رقمی خود را وارد نمایید:
            </p>

            <form onSubmit={handleTrack} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="کد رهگیری یا کد ملی"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>

              <button
                type="submit"
                disabled={trackingLoading || !trackingInput.trim()}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow disabled:opacity-50"
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
              <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500">نام متقاضی:</span>
                  <span className="text-xs font-bold text-slate-800">{trackingResult.name}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500">موضوع نیاز:</span>
                  <span className="text-xs font-medium text-slate-700">{trackingResult.cat}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500">وضعیت پرونده:</span>
                  {trackingResult.status === 'APPROVED' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تایید و مصوب شده
                    </span>
                  )}
                  {trackingResult.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" />
                      در حال بررسی کمیسیون
                    </span>
                  )}
                  {trackingResult.status === 'NEEDS_INFO' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                      <Info className="w-3.5 h-3.5" />
                      نیازمند تکمیل مدارک
                    </span>
                  )}
                  {trackingResult.status === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                      <XCircle className="w-3.5 h-3.5" />
                      عدم احراز شرایط
                    </span>
                  )}
                </div>

                {trackingResult.status === 'APPROVED' && (
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>مبلغ مصوب:</span>
                      <span>{formatToman(trackingResult.approvedAmount)} تومان</span>
                    </div>
                    {trackingResult.note && (
                      <p className="text-[11px] text-emerald-800">
                        یادداشت مصوبه: {trackingResult.note}
                      </p>
                    )}
                  </div>
                )}

                {trackingResult.status === 'NEEDS_INFO' && trackingResult.note && (
                  <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-xs text-blue-900">
                    <p className="font-semibold mb-0.5">پیام واحد مددکاری:</p>
                    <p className="text-[11px]">{trackingResult.note}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Charity Trust & Info Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400" />
              ارزش‌های سازمانی خیریه
            </h4>
            <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>حفظ صددرصدی کرامت، آبرو و رازداری هویت خانوارها</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>بررسی عادلانه پرونده‌ها توسط هیئت کارشناسی و مددکاران میدانی</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>واریز مستقیم مبالغ مصوب به حساب یا تحویل اقلام اساسی</span>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-700/80 text-[11px] text-slate-400 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>{config?.address || 'تهران، منطقه ۱۷، خیابان ابوذر، پلاک ۲۴'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
