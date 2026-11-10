import React, { useState } from 'react';
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
  Calendar,
  Users,
  Home,
  CreditCard,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { AppConfig, Category, BeneficiaryRequest } from '../types';
import {
  formatToman,
  numberToPersianWords,
  isValidIranianNID,
  toEnglishDigits,
  toPersianDigits,
  SHAMSI_MONTHS,
} from '../utils/persian';
import { api } from '../services/api';

interface PublicViewProps {
  config: AppConfig | null;
  needCategories: Category[];
  onRequestSubmitted?: () => void;
}

export const PublicView: React.FC<PublicViewProps> = ({
  config,
  needCategories,
  onRequestSubmitted,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [birthYear, setBirthYear] = useState('1365');
  const [birthMonth, setBirthMonth] = useState('01');
  const [birthDay, setBirthDay] = useState('15');
  const [guardian, setGuardian] = useState('زن سرپرست خانوار');
  const [dependents, setDependents] = useState(2);
  const [housing, setHousing] = useState('استیجاری');
  const [cat, setCat] = useState('');
  const [requestedAmount, setRequestedAmount] = useState<number | ''>(15000000);
  const [desc, setDesc] = useState('');
  const [address, setAddress] = useState('');

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

    if (!name.trim()) {
      setFormError('لطفاً نام و نام خانوادگی را وارد نمایید.');
      return;
    }

    const cleanNid = toEnglishDigits(nid.trim());
    if (!cleanNid || cleanNid.length !== 10) {
      setFormError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }
    if (!isValidIranianNID(cleanNid)) {
      setFormError('کد ملی وارد شده با الگوریتم استاندارد کشوری مطابقت ندارد.');
      return;
    }

    const cleanPhone = toEnglishDigits(phone.trim());
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError('شماره تلفن همراه معتبر نمی‌باشد.');
      return;
    }

    const selectedCat = cat || (needCategories[0] ? needCategories[0].name : 'درمان و هزینه‌های پزشکی');
    const birthDate = `${birthYear}/${birthMonth.padStart(2, '0')}/${birthDay.padStart(2, '0')}`;

    try {
      setSubmitting(true);
      const newReq = await api.createRequest({
        name: name.trim(),
        nid: cleanNid,
        phone: cleanPhone,
        birthDate,
        guardian,
        dependents: Number(dependents),
        housing,
        cat: selectedCat,
        requestedAmount: Number(requestedAmount) || 0,
        desc: desc.trim(),
        address: address.trim(),
      });

      setSubmittedRequest(newReq);
      if (onRequestSubmitted) onRequestSubmitted();

      // Reset fields
      setName('');
      setNid('');
      setPhone('');
      setDesc('');
      setAddress('');
      setRequestedAmount(15000000);
    } catch (err: any) {
      setFormError(err.message || 'خطا در ثبت درخواست');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Tracking Search
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInput.trim()) return;

    setTrackingLoading(true);
    setTrackingError('');
    setTrackingResult(null);

    try {
      const res = await api.trackRequest(trackingInput.trim());
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
      {/* Hero / Islamic Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-700/60">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug">
              فرم عمومی پذیرش و نیازسنجی نیازمندان
            </h2>
            <p className="text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              «وَمَا تُنفِقُوا مِنْ خَيْرٍ يُوَفَّ إِلَيْكُمْ وَأَنتُمْ لَا تُظْلَمُونَ»
              <br />
              مراجعین گرامی، این فرم با حفظ کامل کرامت انسانی و محرمانگی هویت شما جهت بررسی در کمیسیون مددکاری مؤسسه خیریه طراحی شده است.
            </p>
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-xl border border-emerald-600/40 text-center shrink-0 w-full md:w-auto">
            <p className="text-xs text-emerald-300 mb-1">تلفن مستقیم پاسخگویی و مددکاری:</p>
            <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-base sm:text-lg dir-ltr">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>{config?.phone || '021-55667788'}</span>
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">ساعت ۸ صبح الی ۱۶ عصر</p>
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
              <h3 className="text-lg font-bold">درخواست شما با موفقیت در سیستم ثبت گردید</h3>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  نام و نام خانوادگی متقاضی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فاطمه حسینی"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  کد ملی ۱۰ رقمی (بدون خط تیره) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="مثال: 0081239874"
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition font-mono"
                />
              </div>
            </div>

            {/* Row 2: Phone & Birth Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  شماره تلفن همراه (جهت پیامک وضعیت) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="مثال: 09123334455"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition font-mono dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  تاریخ تولد (شمسی)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="px-2 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {Array.from({ length: 70 }, (_, i) => 1340 + i).map((y) => (
                      <option key={y} value={y}>
                        {toPersianDigits(y)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="px-2 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {SHAMSI_MONTHS.map((m, idx) => (
                      <option key={m} value={String(idx + 1).padStart(2, '0')}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="px-2 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d).padStart(2, '0')}>
                        {toPersianDigits(d)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Row 3: Guardian Status, Dependents & Housing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  وضعیت سرپرستی خانوار
                </label>
                <select
                  value={guardian}
                  onChange={(e) => setGuardian(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="زن سرپرست خانوار">زن سرپرست خانوار</option>
                  <option value="سرپرست مرد - ازکارافتاده">سرپرست مرد - ازکارافتاده</option>
                  <option value="سرپرست مرد - کارگر فصلی">سرپرست مرد - کارگر فصلی</option>
                  <option value="بدسرپرست">خانواده بدسرپرست</option>
                  <option value="بی‌سرپرست / یتیم">بی‌سرپرست / یتیم</option>
                  <option value="تحت تکفل">تحت تکفل اقوام</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  تعداد افراد تحت تکفل
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={dependents}
                    onChange={(e) => setDependents(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="mr-2 text-xs text-slate-500 shrink-0">نفر</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  وضعیت محل سکونت
                </label>
                <select
                  value={housing}
                  onChange={(e) => setHousing(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="استیجاری">استیجاری (اجاره‌نشین)</option>
                  <option value="سکونت با اقوام">سکونت مشترک با اقوام</option>
                  <option value="رهن کامل">رهن کامل بدون اجاره</option>
                  <option value="ملکی فرسوده">ملکی فرسوده و نیازمند تعمیر</option>
                  <option value="بی‌سرپناه / اضطراری">بی‌سرپناه / اسکان اضطراری</option>
                </select>
              </div>
            </div>

            {/* Row 4: Need Category & Requested Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  دسته‌بندی موضوع نیاز <span className="text-rose-500">*</span>
                </label>
                <select
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  مبلغ تخمینی مورد نیاز (تومان)
                </label>
                <input
                  type="number"
                  step={500000}
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثال: 20000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
                {typeof requestedAmount === 'number' && requestedAmount > 0 && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    معادل: {numberToPersianWords(requestedAmount)}
                  </p>
                )}
              </div>
            </div>

            {/* Row 5: Detailed Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                شرح تفصیلی مشکل و وضعیت اضطرار
              </label>
              <textarea
                rows={3}
                required
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="توضیح دهید مشکل چیست، چه هزینه‌ای پیش‌بینی شده و چه اقدامات درمانی یا معیشتی تا کنون انجام داده‌اید..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>

            {/* Row 6: Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                آدرس دقیق محل سکونت
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="نام شهر، منطقه، خیابان اصلی، کوچه، پلاک و طبقه"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>

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
                    <span>ثبت نهایی و دریافت کد رهگیری</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (1 Col): Online Tracking & Info */}
        <div className="space-y-6">
          {/* Tracking Box */}
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
