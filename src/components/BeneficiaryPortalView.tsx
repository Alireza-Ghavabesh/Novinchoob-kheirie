import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Bell,
  BellRing,
  CheckCheck,
  Smartphone,
  MessageSquare,
  X,
} from 'lucide-react';
import {
  AppConfig,
  BeneficiaryAccount,
  BeneficiaryNotification,
  BeneficiaryPortalFormItem,
  BeneficiaryRequest,
  Category,
  LoginPortal,
} from '../types';
import {
  CUSTOM_FORM_STATUS_LABELS,
  EntityDefinition,
  parsePublicFormSchema,
  SubmittedCustomFieldValue,
} from '../utils/publicFormConfig';
import { api } from '../services/api';
import {
  DynamicFieldRenderer,
  DynamicFormValuesMap,
  hydrateValuesFromSubmission,
  validateAndExtractCustomFields,
} from './DynamicFieldRenderer';
import {
  formatToman,
  isValidIranianNID,
  numberToPersianWords,
  toEnglishDigits,
  toPersianDigits,
} from '../utils/persian';
import { ShamsiDatePicker } from './ShamsiDatePicker';

interface BeneficiaryPortalViewProps {
  beneficiary: BeneficiaryAccount;
  config: AppConfig | null;
  portal?: LoginPortal | null;
  needCategories?: Category[];
  entities: EntityDefinition[];
  onLogout: () => void;
  onBackToPublic: () => void;
  isolated?: boolean;
}

const PUBLIC_REQ_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در صف بررسی کارشناسی',
  APPROVED: 'تأیید و تصویب شد',
  NEEDS_INFO: 'نقص مدارک / نیازمند اصلاح',
  REJECTED: 'رد شده',
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const BeneficiaryPortalView: React.FC<BeneficiaryPortalViewProps> = ({
  beneficiary,
  config,
  portal = null,
  needCategories = [],
  entities,
  onLogout,
  onBackToPublic,
  isolated = false,
}) => {
  const getItemKey = (item: BeneficiaryPortalFormItem) =>
    item.programId ? `prog-${item.programId}-${item.form.id}` : item.form.id;

  const publicFormSchema = useMemo(
    () => parsePublicFormSchema(config?.publicFormConfig),
    [config?.publicFormConfig]
  );

  const [account, setAccount] = useState<BeneficiaryAccount>(beneficiary);
  const [items, setItems] = useState<BeneficiaryPortalFormItem[]>([]);
  const [publicFormEnabled, setPublicFormEnabled] = useState(false);
  const [publicRequest, setPublicRequest] = useState<BeneficiaryRequest | null>(null);
  const [publicExpanded, setPublicExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    title: string;
    subtitle?: string;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (type: 'success' | 'error', title: string, subtitle?: string) => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({ type, title, subtitle });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 4800);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Public Request Form Fields State
  const [pubName, setPubName] = useState(beneficiary.fullName || '');
  const [pubNid, setPubNid] = useState('');
  const [pubPhone, setPubPhone] = useState(beneficiary.phone || '');
  const [pubBirthDate, setPubBirthDate] = useState('');
  const [pubGuardian, setPubGuardian] = useState(
    publicFormSchema.guardianOptions[0] || 'زن سرپرست خانوار'
  );
  const [pubDependents, setPubDependents] = useState(0);
  const [pubHousing, setPubHousing] = useState(
    publicFormSchema.housingOptions[0] || 'استیجاری'
  );
  const [pubCat, setPubCat] = useState(
    needCategories[0]?.name || 'درمان و هزینه‌های پزشکی و جراحی'
  );
  const [pubRequestedAmount, setPubRequestedAmount] = useState<number | ''>(0);
  const [pubDesc, setPubDesc] = useState('');
  const [pubAddress, setPubAddress] = useState('');
  const [pubCustomValues, setPubCustomValues] = useState<DynamicFormValuesMap>({});
  const [pubSubmitting, setPubSubmitting] = useState(false);
  const [pubError, setPubError] = useState('');
  const [pubSuccess, setPubSuccess] = useState('');

  const [valuesByForm, setValuesByForm] = useState<Record<string, DynamicFormValuesMap>>({});
  const [expandedForms, setExpandedForms] = useState<Record<string, boolean>>({});
  const [submittingFormId, setSubmittingFormId] = useState<string | null>(null);
  const [errorByForm, setErrorByForm] = useState<Record<string, string>>({});
  const [successByForm, setSuccessByForm] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Bell Notifications & Web Push State
  const [notifications, setNotifications] = useState<BeneficiaryNotification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushFeedback, setPushFeedback] = useState('');

  const hydratePublicForm = useCallback(
    (req: BeneficiaryRequest | null, acc: BeneficiaryAccount) => {
      if (req) {
        setPubName(req.name && req.name !== '-' ? req.name : acc.fullName || '');
        setPubNid(req.nid && req.nid !== '-' ? req.nid : '');
        setPubPhone(req.phone && req.phone !== '-' ? req.phone : acc.phone || '');
        setPubBirthDate(req.birthDate || '');
        setPubGuardian(
          req.guardian && req.guardian !== '-'
            ? req.guardian
            : publicFormSchema.guardianOptions[0] || 'زن سرپرست خانوار'
        );
        setPubDependents(Number(req.dependents) || 0);
        setPubHousing(
          req.housing && req.housing !== '-'
            ? req.housing
            : publicFormSchema.housingOptions[0] || 'استیجاری'
        );
        setPubCat(req.cat || needCategories[0]?.name || 'درمان و هزینه‌های پزشکی و جراحی');
        setPubRequestedAmount(req.requestedAmount || 0);
        setPubDesc(req.desc || '');
        setPubAddress(req.address || '');

        let parsedCustom: SubmittedCustomFieldValue[] = [];
        try {
          if (typeof req.customFields === 'string' && req.customFields.trim()) {
            const p = JSON.parse(req.customFields);
            if (Array.isArray(p)) parsedCustom = p;
          }
        } catch {
          parsedCustom = [];
        }
        setPubCustomValues(
          hydrateValuesFromSubmission(publicFormSchema.customFields, parsedCustom, entities)
        );
      } else {
        setPubName(acc.fullName || '');
        setPubPhone(acc.phone || '');
        setPubGuardian(publicFormSchema.guardianOptions[0] || 'زن سرپرست خانوار');
        setPubHousing(publicFormSchema.housingOptions[0] || 'استیجاری');
        setPubCat(needCategories[0]?.name || 'درمان و هزینه‌های پزشکی و جراحی');
      }
    },
    [entities, needCategories, publicFormSchema]
  );

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.getBeneficiaryPortal(portal?.slug);
      const activeAcc = data.beneficiary || beneficiary;
      if (data.beneficiary) setAccount(data.beneficiary);
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      const isPubEnabled = Boolean(data.publicFormEnabled);
      setPublicFormEnabled(isPubEnabled);
      setPublicRequest(data.publicRequest || null);
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      if (isPubEnabled) {
        hydratePublicForm(data.publicRequest || null, activeAcc);
      }

      const initialValues: Record<string, DynamicFormValuesMap> = {};
      const initialExpanded: Record<string, boolean> = {};
      for (const item of list) {
        const key = item.programId ? `prog-${item.programId}-${item.form.id}` : item.form.id;
        initialValues[key] = item.submission
          ? hydrateValuesFromSubmission(item.form.fields, item.submission.data, entities)
          : {};
        initialExpanded[key] = true;
      }
      setValuesByForm(initialValues);
      setExpandedForms((prev) => ({ ...initialExpanded, ...prev }));
    } catch (err: any) {
      setLoadError(err.message || 'خطا در دریافت فرم‌های پروفایل');
    } finally {
      setLoading(false);
    }
  }, [beneficiary, entities, hydratePublicForm, portal?.slug]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  // Detect browser Web Push support & current subscription
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setPushSupported(true);
      navigator.serviceWorker
        .register('/sw.js')
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          setPushEnabled(Boolean(sub));
        })
        .catch(() => undefined);
    }
  }, []);

  // Poll notifications periodically when tab is visible
  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await api.getBeneficiaryNotifications();
        if (Array.isArray(res.notifications)) {
          setNotifications(res.notifications);
        }
      } catch {
        // ignore transient polling errors
      }
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bellOpen]);

  const handleTogglePush = async () => {
    setPushBusy(true);
    setPushFeedback('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushFeedback('مرورگر فعلی از پوش نوتیفیکیشن پشتیبانی نمی‌کند.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();

      if (existingSub) {
        await api.unsubscribeBeneficiaryPush(existingSub.endpoint).catch(() => undefined);
        await existingSub.unsubscribe();
        setPushEnabled(false);
        setPushFeedback('پوش نوتیفیکیشن این دستگاه غیرفعال شد.');
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setPushFeedback('اجازه نمایش اعلان در مرورگر داده نشد. لطفاً از تنظیمات مرورگر آن را مجاز کنید.');
          return;
        }
        const vapidKey = await api.getBeneficiaryPushKey();
        if (!vapidKey) {
          setPushFeedback('کلید پوش نوتیفیکیشن روی سرور آماده نیست.');
          return;
        }
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        await api.subscribeBeneficiaryPush(newSub.toJSON());
        setPushEnabled(true);
        setPushFeedback('پوش نوتیفیکیشن با موفقیت روی این دستگاه فعال شد.');
      }
    } catch (err: any) {
      setPushFeedback(err.message || 'خطا در تغییر وضعیت پوش نوتیفیکیشن');
    } finally {
      setPushBusy(false);
    }
  };

  const handleNotificationClick = (notif: BeneficiaryNotification) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      api.markBeneficiaryNotificationRead(notif.id).catch(() => undefined);
    }
  };

  const handleOpenNotificationForm = (
    e: React.MouseEvent,
    notif: BeneficiaryNotification
  ) => {
    e.stopPropagation();
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      api.markBeneficiaryNotificationRead(notif.id).catch(() => undefined);
    }
    setBellOpen(false);
    if (notif.formId === 'PUBLIC_REQUEST') {
      scrollToPublicForm();
    } else if (notif.formId) {
      scrollToForm(notif.formId);
    }
  };

  const handleDeleteNotification = async (
    e: React.MouseEvent,
    notifId: number
  ) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    try {
      await api.deleteBeneficiaryNotification(notifId);
    } catch {
      // Reload on failure so state stays consistent
      api
        .getBeneficiaryNotifications()
        .then((res) => {
          if (Array.isArray(res.notifications)) {
            setNotifications(res.notifications);
          }
        })
        .catch(() => undefined);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.markAllBeneficiaryNotificationsRead();
    } catch {
      // ignore
    }
  };

  const handlePublicRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPubError('');
    setPubSuccess('');

    const b = publicFormSchema.builtin;

    if (b.showName && b.requiredName && !pubName.trim()) {
      setPubError(`لطفاً «${b.nameLabel}» را وارد نمایید.`);
      return;
    }

    const cleanNid = toEnglishDigits(pubNid.trim());
    if (b.showNid && b.requiredNid && !cleanNid) {
      setPubError(`لطفاً «${b.nidLabel}» را وارد نمایید.`);
      return;
    }
    if (b.showNid && cleanNid) {
      if (cleanNid.length !== 10) {
        setPubError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
        return;
      }
      if (!isValidIranianNID(cleanNid)) {
        setPubError('کد ملی وارد شده با الگوریتم استاندارد کشوری مطابقت ندارد.');
        return;
      }
    }

    const cleanPhone = toEnglishDigits((pubPhone || (b.showPhone ? '' : account.phone || '')).trim());
    if (b.showPhone && b.requiredPhone && (!cleanPhone || cleanPhone.length < 10)) {
      setPubError('شماره تلفن همراه معتبر نمی‌باشد.');
      return;
    }
    if (b.showPhone && cleanPhone && cleanPhone.length < 10) {
      setPubError('شماره تلفن همراه معتبر نمی‌باشد.');
      return;
    }

    if (b.showBirthDate && b.requiredBirthDate && !pubBirthDate.trim()) {
      setPubError(`لطفاً «${b.birthDateLabel}» را انتخاب نمایید.`);
      return;
    }
    if (b.showCat && b.requiredCat && !pubCat.trim()) {
      setPubError(`لطفاً «${b.catLabel}» را انتخاب نمایید.`);
      return;
    }
    if (b.showRequestedAmount && b.requiredRequestedAmount && (!pubRequestedAmount || Number(pubRequestedAmount) <= 0)) {
      setPubError(`لطفاً «${b.requestedAmountLabel}» را وارد نمایید.`);
      return;
    }
    if (b.showDesc && b.requiredDesc && !pubDesc.trim()) {
      setPubError(`لطفاً «${b.descLabel}» را وارد نمایید.`);
      return;
    }
    if (b.showAddress && b.requiredAddress && !pubAddress.trim()) {
      setPubError(`لطفاً «${b.addressLabel}» را وارد نمایید.`);
      return;
    }

    const extracted = validateAndExtractCustomFields(
      publicFormSchema.customFields,
      pubCustomValues,
      entities
    );
    if (extracted.error) {
      setPubError(extracted.error);
      return;
    }

    const selectedCat = b.showCat
      ? pubCat || needCategories[0]?.name || 'درمان و هزینه‌های پزشکی و جراحی'
      : '-';

    const isEdit = Boolean(publicRequest);
    setPubSubmitting(true);
    try {
      const saved = await api.submitBeneficiaryPublicRequest(
        {
          name: b.showName ? pubName.trim() : (account.fullName || '-'),
          nid: b.showNid ? cleanNid : '',
          phone: b.showPhone ? cleanPhone : (account.phone || ''),
          birthDate: b.showBirthDate ? pubBirthDate.trim() : '',
          guardian: b.showGuardian ? pubGuardian : '-',
          dependents: b.showDependents ? Number(pubDependents) || 0 : 0,
          housing: b.showHousing ? pubHousing : '-',
          cat: selectedCat,
          requestedAmount: b.showRequestedAmount ? Number(pubRequestedAmount) || 0 : 0,
          desc: b.showDesc ? pubDesc.trim() : '',
          address: b.showAddress ? pubAddress.trim() : '',
          customFields: extracted.values,
        },
        isEdit
      );
      setPublicRequest(saved);
      if (!account.fullName?.trim() && saved.name) {
        setAccount((prev) => ({ ...prev, fullName: saved.name }));
      }
      setPubSuccess(
        isEdit
          ? `ویرایش درخواست شما با موفقیت ذخیره شد (کد رهگیری: ${saved.trackingCode}).`
          : `${publicFormSchema.successMessage || 'درخواست شما با موفقیت ثبت شد.'} — کد رهگیری: ${saved.trackingCode}`
      );
      showToast(
        'success',
        isEdit ? 'ویرایش فرم با موفقیت ذخیره شد' : 'فرم درخواست شما با موفقیت ثبت شد',
        `کد رهگیری: ${saved.trackingCode}`
      );
    } catch (err: any) {
      const msg = err.message || 'خطا در ثبت فرم درخواست عمومی';
      setPubError(msg);
      showToast('error', 'خطا در ذخیره فرم درخواست عمومی', msg);
    } finally {
      setPubSubmitting(false);
    }
  };

  const handleFormSubmit = async (
    e: React.FormEvent,
    item: BeneficiaryPortalFormItem
  ) => {
    e.preventDefault();
    const formId = item.form.id;
    const itemKey = getItemKey(item);
    setErrorByForm((prev) => ({ ...prev, [itemKey]: '' }));
    setSuccessByForm((prev) => ({ ...prev, [itemKey]: '' }));

    const currentValues = valuesByForm[itemKey] || {};
    const extracted = validateAndExtractCustomFields(item.form.fields, currentValues, entities);
    if (extracted.error) {
      setErrorByForm((prev) => ({ ...prev, [itemKey]: extracted.error! }));
      showToast('error', 'لطفاً فیلدهای الزامی را تکمیل نمایید', extracted.error);
      return;
    }

    const isEdit = Boolean(item.submission);
    setSubmittingFormId(itemKey);
    try {
      const savedSub = await api.submitBeneficiaryForm(formId, extracted.values, isEdit, {
        portalId: portal?.id || null,
        programId: item.programId || null,
      });
      setItems((prev) =>
        prev.map((it) => (getItemKey(it) === itemKey ? { ...it, submission: savedSub } : it))
      );
      setValuesByForm((prev) => ({
        ...prev,
        [itemKey]: hydrateValuesFromSubmission(item.form.fields, savedSub.data, entities),
      }));
      setSuccessByForm((prev) => ({
        ...prev,
        [itemKey]: isEdit
          ? `ویرایش اطلاعات شما با موفقیت ثبت شد (کد پیگیری: ${savedSub.trackingCode}).`
          : `${item.form.successMessage || 'اطلاعات شما با موفقیت ثبت شد.'} — کد پیگیری: ${savedSub.trackingCode}`,
      }));
      showToast(
        'success',
        isEdit
          ? `تغییرات فرم «${item.form.title}» ذخیره شد`
          : `فرم «${item.form.title}» با موفقیت ثبت شد`,
        `کد پیگیری: ${savedSub.trackingCode}`
      );
    } catch (err: any) {
      const msg = err.message || 'خطا در ثبت اطلاعات فرم';
      setErrorByForm((prev) => ({
        ...prev,
        [itemKey]: msg,
      }));
      showToast('error', `خطا در ذخیره فرم «${item.form.title}»`, msg);
    } finally {
      setSubmittingFormId(null);
    }
  };

  const scrollToForm = (targetKeyOrFormId: string) => {
    const matched = items.find(
      (it) => getItemKey(it) === targetKeyOrFormId || it.form.id === targetKeyOrFormId
    );
    const key = matched ? getItemKey(matched) : targetKeyOrFormId;
    setExpandedForms((prev) => ({ ...prev, [key]: true }));
    const el = document.getElementById(`portal-form-${key}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const scrollToPublicForm = () => {
    setPublicExpanded(true);
    const el = document.getElementById('portal-public-request-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const totalActiveFormsCount = items.length + (publicFormEnabled ? 1 : 0);
  const submittedCount =
    items.filter((it) => Boolean(it.submission)).length +
    (publicFormEnabled && publicRequest ? 1 : 0);
  const publicReqHasAlert =
    publicFormEnabled &&
    Boolean(publicRequest) &&
    (Boolean(publicRequest?.note?.trim()) || publicRequest?.status === 'NEEDS_INFO');
  const expertAlerts = items.filter(
    (it) =>
      it.submission &&
      (Boolean(it.submission.expertMessage?.trim()) || it.submission.status === 'NEEDS_INFO')
  );
  const totalAlertsCount = expertAlerts.length + (publicReqHasAlert ? 1 : 0);

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isolated ? (
          <button
            type="button"
            onClick={onBackToPublic}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به صفحه اصلی</span>
          </button>
        ) : (
          <div className="text-xs font-bold text-emerald-900">
            پروفایل اختصاصی و امن مددجو
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Notification Bell & Dropdown */}
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => setBellOpen((prev) => !prev)}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                unreadNotifCount > 0
                  ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="اعلانات و پیام‌های کارشناس"
            >
              {unreadNotifCount > 0 ? (
                <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
              ) : (
                <Bell className="w-4 h-4 text-slate-600" />
              )}
              <span className="hidden sm:inline">اعلانات</span>
              {unreadNotifCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                  {toPersianDigits(unreadNotifCount)}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute left-0 mt-2 w-[min(92vw,390px)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in">
                {/* Dropdown Header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <span className="font-extrabold text-xs text-slate-900">
                      اعلانات و پیام‌های کارشناس
                    </span>
                    {unreadNotifCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                        {toPersianDigits(unreadNotifCount)} جدید
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>خواندن همه</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setBellOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Push Notification Subscription Bar */}
                <div className="px-4 py-2.5 bg-indigo-50/70 border-b border-indigo-100 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold text-indigo-950">
                        {pushEnabled
                          ? 'پوش نوتیفیکیشن روی این دستگاه فعال است'
                          : 'دریافت فوری پیام‌ها (پوش نوتیفیکیشن)'}
                      </span>
                    </div>
                    {pushSupported ? (
                      <button
                        type="button"
                        disabled={pushBusy}
                        onClick={handleTogglePush}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 disabled:opacity-50 ${
                          pushEnabled
                            ? 'bg-white border border-indigo-200 text-indigo-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                        }`}
                      >
                        {pushBusy
                          ? 'صبر کنید...'
                          : pushEnabled
                          ? 'غیرفعال‌سازی'
                          : 'فعال‌سازی'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">پشتیبانی نمی‌شود</span>
                    )}
                  </div>
                  {pushFeedback && (
                    <p className="text-[10px] font-semibold text-indigo-800 leading-relaxed">
                      {pushFeedback}
                    </p>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-10 px-4 text-center space-y-1.5">
                      <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">
                        هنوز اعلانی برای شما ثبت نشده است
                      </p>
                      <p className="text-[11px] text-slate-400">
                        هر زمان کارشناس پیامی درباره پرونده یا فرم شما ارسال کند، اینجا نمایش داده می‌شود.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`relative p-3.5 pr-10 cursor-pointer transition-all space-y-1.5 ${
                          !notif.isRead
                            ? 'bg-amber-50/75 hover:bg-amber-50'
                            : 'bg-slate-50/60 opacity-55 hover:opacity-80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(e, notif.id)}
                          title="حذف اعلان"
                          aria-label="حذف اعلان"
                          className="absolute top-3 right-2.5 w-5 h-5 rounded-full bg-slate-100/90 hover:bg-rose-100 text-slate-400 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 flex items-center justify-center transition cursor-pointer shadow-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                            <span
                              className={`text-xs truncate ${
                                !notif.isRead
                                  ? 'font-extrabold text-slate-900'
                                  : 'font-semibold text-slate-500'
                              }`}
                            >
                              {notif.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {notif.isRead && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-500">
                                خوانده‌شده
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(notif.createdAt).toLocaleDateString('fa-IR')}
                            </span>
                          </div>
                        </div>

                        <p
                          className={`text-xs leading-relaxed whitespace-pre-wrap ${
                            !notif.isRead ? 'text-slate-800' : 'text-slate-500'
                          }`}
                        >
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {notif.trackingCode && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {notif.trackingCode}
                              </span>
                            )}
                            {notif.senderName && (
                              <span className="text-[10px] text-slate-500">
                                از طرف: {notif.senderName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {notif.sentSms && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold">
                                <MessageSquare className="w-2.5 h-2.5" />
                                پیامک
                              </span>
                            )}
                            {notif.sentPush && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold">
                                <Smartphone className="w-2.5 h-2.5" />
                                پوش
                              </span>
                            )}
                            {notif.formId && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenNotificationForm(e, notif)}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition cursor-pointer"
                              >
                                مشاهده فرم
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={loadPortal}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">بروزرسانی</span>
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
                {portal
                  ? `${portal.title} — ${config?.instName || 'مؤسسه خیریه'}`
                  : `پروفایل اختصاصی مددجو — ${config?.instName || 'مؤسسه خیریه'}`}
              </span>
              <h2 className="text-lg sm:text-2xl font-extrabold text-white">
                {account.fullName?.trim()
                  ? `خوش آمدید، ${account.fullName}`
                  : portal
                  ? 'خوش آمدید، شرکت‌کننده گرامی'
                  : 'خوش آمدید، مددجوی گرامی'}
              </h2>
              {portal?.subtitle && (
                <p className="text-xs text-emerald-100/90 leading-relaxed">{portal.subtitle}</p>
              )}
              <p className="text-xs text-emerald-200 font-mono dir-ltr text-right">
                شماره همراه حساب: {account.phone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center shrink-0">
            <div className="bg-black/25 border border-white/15 rounded-xl px-3 py-2">
              <span className="block text-lg font-black text-white">
                {toPersianDigits(totalActiveFormsCount)}
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
                {toPersianDigits(totalAlertsCount)}
              </span>
              <span className="text-[10px] text-emerald-200">پیغام کارشناس</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Expert Messages / Incomplete Alerts Banner */}
      {totalAlertsCount > 0 && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm">
            <MessageSquareWarning className="w-5 h-5 text-amber-600 shrink-0" />
            <span>پیغام‌های مهم کارشناس و موارد نیازمند بررسی / تکمیل مدارک</span>
          </div>

          <div className="space-y-2.5">
            {publicReqHasAlert && publicRequest && (
              <div className="bg-white rounded-xl border border-amber-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{publicFormSchema.title}</span>
                    <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {publicRequest.trackingCode}
                    </span>
                    {publicRequest.status === 'NEEDS_INFO' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        نقص مدارک / نیازمند اصلاح
                      </span>
                    )}
                  </div>
                  {publicRequest.note && (
                    <p className="text-amber-950 font-semibold leading-relaxed whitespace-pre-wrap">
                      {publicRequest.note}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={scrollToPublicForm}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition"
                >
                  مشاهده و ویرایش فرم
                </button>
              </div>
            )}

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
      ) : totalActiveFormsCount === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-2">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800">
            {portal
              ? 'هنوز فرم ثبت‌نامی برای پروژه‌های متصل به این صفحه اختصاصی تعریف نشده است'
              : 'در حال حاضر فرمی برای پروفایل مددجو فعال نشده است'}
          </h3>
          <p className="text-xs text-slate-500">
            {portal
              ? 'مدیر سامانه می‌تواند در بخش «پروژه‌ها و طرح‌ها»، پروژه مورد نظر را به این صفحه ورود متصل کرده و فرم ثبت‌نام آن را انتخاب نماید.'
              : 'مدیر مؤسسه می‌تواند از بخش «فرم‌ساز» فرم درخواست عمومی یا سایر فرم‌های اختصاصی را برای نمایش در این بخش فعال نماید.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Public Request Form inside Beneficiary Portal — Same neutral card style as custom forms */}
          {publicFormEnabled && (
            <div
              id="portal-public-request-form"
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div
                onClick={() => setPublicExpanded((prev) => !prev)}
                className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ClipboardList className="w-5 h-5 text-emerald-600 shrink-0" />
                    <h3 className="font-extrabold text-base text-slate-900">
                      {publicFormSchema.title}
                    </h3>
                    {!publicRequest ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
                        تکمیل‌نشده (ثبت اولیه)
                      </span>
                    ) : (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          publicRequest.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : publicRequest.status === 'NEEDS_INFO'
                            ? 'bg-blue-100 text-blue-800'
                            : publicRequest.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {PUBLIC_REQ_STATUS_LABELS[publicRequest.status] || publicRequest.status}
                      </span>
                    )}
                    {publicRequest?.status === 'APPROVED' && publicRequest.approvedAmount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[11px] font-bold">
                        مبلغ مصوب: {formatToman(publicRequest.approvedAmount)}
                      </span>
                    )}
                  </div>
                  {publicFormSchema.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {publicFormSchema.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {publicRequest && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyTracking(publicRequest.trackingCode);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px] font-bold hover:bg-slate-100"
                      title="کپی کد رهگیری"
                    >
                      <Copy className="w-3 h-3 text-emerald-600" />
                      <span>
                        {copiedCode === publicRequest.trackingCode
                          ? 'کپی شد'
                          : publicRequest.trackingCode}
                      </span>
                    </button>
                  )}
                  <span className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500">
                    {publicExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </div>
              </div>

              {publicExpanded && (
                <div className="p-5 sm:p-6 space-y-5">
                  {publicRequest?.note && (
                    <div className="p-4 rounded-xl bg-amber-50 border-r-4 border-amber-500 space-y-1 text-xs">
                      <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                        <MessageSquareWarning className="w-4 h-4 text-amber-600" />
                        یادداشت کارشناس درباره پرونده شما:
                      </span>
                      <p className="text-amber-950 font-semibold leading-relaxed whitespace-pre-wrap pt-1">
                        {publicRequest.note}
                      </p>
                    </div>
                  )}

                  {pubError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border-r-4 border-rose-500 text-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{pubError}</span>
                    </div>
                  )}

                  {pubSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border-r-4 border-emerald-500 text-emerald-900 text-xs flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{pubSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handlePublicRequestSubmit} className="space-y-5">
                    {(publicFormSchema.builtin.showName || publicFormSchema.builtin.showNid) && (
                      <div
                        className={`grid grid-cols-1 ${
                          publicFormSchema.builtin.showName && publicFormSchema.builtin.showNid
                            ? 'sm:grid-cols-2'
                            : ''
                        } gap-4`}
                      >
                        {publicFormSchema.builtin.showName && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {publicFormSchema.builtin.nameLabel}{' '}
                              {publicFormSchema.builtin.requiredName && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            <input
                              type="text"
                              required={publicFormSchema.builtin.requiredName}
                              placeholder={publicFormSchema.builtin.namePlaceholder}
                              value={pubName}
                              onChange={(e) => setPubName(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm outline-none transition"
                            />
                          </div>
                        )}

                        {publicFormSchema.builtin.showNid && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {publicFormSchema.builtin.nidLabel}{' '}
                              {publicFormSchema.builtin.requiredNid && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            <input
                              type="text"
                              required={publicFormSchema.builtin.requiredNid}
                              maxLength={10}
                              placeholder={publicFormSchema.builtin.nidPlaceholder}
                              value={pubNid}
                              onChange={(e) => setPubNid(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm outline-none transition font-mono"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {(publicFormSchema.builtin.showPhone ||
                      publicFormSchema.builtin.showBirthDate) && (
                      <div
                        className={`grid grid-cols-1 ${
                          publicFormSchema.builtin.showPhone &&
                          publicFormSchema.builtin.showBirthDate
                            ? 'sm:grid-cols-2'
                            : ''
                        } gap-4`}
                      >
                        {publicFormSchema.builtin.showPhone && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {publicFormSchema.builtin.phoneLabel}{' '}
                              {publicFormSchema.builtin.requiredPhone && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            <input
                              type="tel"
                              required={publicFormSchema.builtin.requiredPhone}
                              placeholder={publicFormSchema.builtin.phonePlaceholder}
                              value={pubPhone}
                              onChange={(e) => setPubPhone(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm outline-none transition font-mono dir-ltr text-right"
                            />
                          </div>
                        )}

                        {publicFormSchema.builtin.showBirthDate && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {publicFormSchema.builtin.birthDateLabel}{' '}
                              {publicFormSchema.builtin.requiredBirthDate && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            <ShamsiDatePicker
                              value={pubBirthDate}
                              onChange={setPubBirthDate}
                              placeholder={publicFormSchema.builtin.birthDatePlaceholder}
                              required={publicFormSchema.builtin.requiredBirthDate}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {(publicFormSchema.builtin.showGuardian ||
                      publicFormSchema.builtin.showDependents ||
                      publicFormSchema.builtin.showHousing) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {publicFormSchema.builtin.showGuardian && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {publicFormSchema.builtin.guardianLabel}{' '}
                              {publicFormSchema.builtin.requiredGuardian && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            <select
                              required={publicFormSchema.builtin.requiredGuardian}
                              value={pubGuardian}
                              onChange={(e) => setPubGuardian(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                              {publicFormSchema.guardianOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {publicFormSchema.builtin.showDependents && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {publicFormSchema.builtin.dependentsLabel}{' '}
                              {publicFormSchema.builtin.requiredDependents && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            <div className="flex items-center">
                              <input
                                type="number"
                                min={0}
                                max={15}
                                required={publicFormSchema.builtin.requiredDependents}
                                placeholder={publicFormSchema.builtin.dependentsPlaceholder}
                                value={pubDependents}
                                onChange={(e) =>
                                  setPubDependents(Math.max(0, parseInt(e.target.value) || 0))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              <span className="mr-2 text-xs text-slate-500 shrink-0">نفر</span>
                            </div>
                          </div>
                        )}

                        {publicFormSchema.builtin.showHousing && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {publicFormSchema.builtin.housingLabel}{' '}
                              {publicFormSchema.builtin.requiredHousing && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            <select
                              required={publicFormSchema.builtin.requiredHousing}
                              value={pubHousing}
                              onChange={(e) => setPubHousing(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                              {publicFormSchema.housingOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {(publicFormSchema.builtin.showCat ||
                      publicFormSchema.builtin.showRequestedAmount) && (
                      <div
                        className={`grid grid-cols-1 ${
                          publicFormSchema.builtin.showCat &&
                          publicFormSchema.builtin.showRequestedAmount
                            ? 'sm:grid-cols-2'
                            : ''
                        } gap-4`}
                      >
                        {publicFormSchema.builtin.showCat && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {publicFormSchema.builtin.catLabel}{' '}
                              {publicFormSchema.builtin.requiredCat && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            <select
                              required={publicFormSchema.builtin.requiredCat}
                              value={pubCat}
                              onChange={(e) => setPubCat(e.target.value)}
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

                        {publicFormSchema.builtin.showRequestedAmount && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {publicFormSchema.builtin.requestedAmountLabel}{' '}
                              {publicFormSchema.builtin.requiredRequestedAmount && (
                                <span className="text-rose-500">*</span>
                              )}
                            </label>
                            <input
                              type="number"
                              step={500000}
                              required={publicFormSchema.builtin.requiredRequestedAmount}
                              value={pubRequestedAmount}
                              onChange={(e) =>
                                setPubRequestedAmount(
                                  e.target.value === '' ? '' : Number(e.target.value)
                                )
                              }
                              placeholder={publicFormSchema.builtin.requestedAmountPlaceholder}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                            />
                            {typeof pubRequestedAmount === 'number' && pubRequestedAmount > 0 && (
                              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                                معادل: {numberToPersianWords(pubRequestedAmount)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <DynamicFieldRenderer
                      fields={publicFormSchema.customFields}
                      values={pubCustomValues}
                      entities={entities}
                      onChange={setPubCustomValues}
                      maxFileSizeMB={publicFormSchema.maxFileSizeMB || 5}
                      uploadContext={{ source: 'public_form' }}
                    />

                    {publicFormSchema.builtin.showDesc && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {publicFormSchema.builtin.descLabel}{' '}
                          {publicFormSchema.builtin.requiredDesc && (
                            <span className="text-rose-500">*</span>
                          )}
                        </label>
                        <textarea
                          rows={3}
                          required={publicFormSchema.builtin.requiredDesc}
                          value={pubDesc}
                          onChange={(e) => setPubDesc(e.target.value)}
                          placeholder={publicFormSchema.builtin.descPlaceholder}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        />
                      </div>
                    )}

                    {publicFormSchema.builtin.showAddress && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {publicFormSchema.builtin.addressLabel}{' '}
                          {publicFormSchema.builtin.requiredAddress && (
                            <span className="text-rose-500">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          required={publicFormSchema.builtin.requiredAddress}
                          value={pubAddress}
                          onChange={(e) => setPubAddress(e.target.value)}
                          placeholder={publicFormSchema.builtin.addressPlaceholder}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">
                        {publicRequest
                          ? 'می‌توانید در هر زمان مشخصات یا مدارک این درخواست را ویرایش و مجدداً ذخیره کنید.'
                          : 'پس از تکمیل فیلدها، درخواست شما مستقیماً در کارتابل مددکاری ثبت می‌شود.'}
                      </span>

                      <button
                        type="submit"
                        disabled={pubSubmitting}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                      >
                        {publicRequest ? (
                          <Save className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>
                          {pubSubmitting
                            ? 'در حال ذخیره...'
                            : publicRequest
                            ? 'ذخیره و ثبت ویرایش درخواست'
                            : publicFormSchema.submitButtonText || 'ثبت نهایی درخواست'}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {items.map((item) => {
            const { form, submission } = item;
            const itemKey = getItemKey(item);
            const isExpanded = expandedForms[itemKey] !== false;
            const isSubmitting = submittingFormId === itemKey;
            const formErr = errorByForm[itemKey];
            const formSuccess = successByForm[itemKey];

            return (
              <div
                id={`portal-form-${itemKey}`}
                key={itemKey}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Form Card Header */}
                <div
                  onClick={() =>
                    setExpandedForms((prev) => ({ ...prev, [itemKey]: !isExpanded }))
                  }
                  className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ClipboardList className="w-5 h-5 text-emerald-600 shrink-0" />
                      <h3 className="font-extrabold text-base text-slate-900">{form.title}</h3>
                      {item.programTitle && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
                          پروژه: {item.programTitle}
                        </span>
                      )}

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
                        values={valuesByForm[itemKey] || {}}
                        entities={entities}
                        onChange={(nextVals) =>
                          setValuesByForm((prev) => ({ ...prev, [itemKey]: nextVals }))
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

      {/* Sleek Bottom Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 flex justify-center pointer-events-none"
        >
          <div
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md max-w-md w-full sm:w-auto sm:min-w-[320px] animate-in fade-in slide-in-from-bottom-4 duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 text-white border-emerald-500/40'
                : 'bg-rose-950/95 text-white border-rose-500/40'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-extrabold leading-snug">{toast.title}</p>
              {toast.subtitle && (
                <p
                  className={`text-[11px] mt-0.5 truncate ${
                    toast.type === 'success' ? 'text-emerald-200/90' : 'text-rose-200/90'
                  }`}
                >
                  {toast.subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
              aria-label="بستن اعلان"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
