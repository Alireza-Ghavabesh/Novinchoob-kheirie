import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Eye,
  Bell,
  Trash2,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Smartphone,
  Send,
  X,
  RefreshCw,
  UserCheck,
  ExternalLink,
  FileText,
  Clock,
  Layers,
  ClipboardList,
} from 'lucide-react';
import {
  AppConfig,
  CustomForm,
  CustomFormSubmission,
  CustomFormSubmissionStatus,
  SmsTemplate,
  StaffUser,
} from '../../types';
import {
  CUSTOM_FORM_STATUS_LABELS,
  SubmittedCustomFieldValue,
  formatBytesCompact,
  formatEntityRowSummary,
} from '../../utils/publicFormConfig';
import { api } from '../../services/api';
import { toPersianDigits } from '../../utils/persian';
import { hasPermission, renderSmsTemplatePreview } from '../../utils/permissions';

interface CustomFormApplicantsPanelProps {
  form: CustomForm;
  currentUser: StaffUser;
  config?: AppConfig | null;
  smsTemplates: SmsTemplate[];
  onSubmissionCountChange?: (formId: string, count: number) => void;
}

const STATUS_BADGE_MAP: Record<string, { label: string; cls: string }> = {
  NEW: { label: 'جدید / در انتظار بررسی', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  IN_REVIEW: { label: 'در حال بررسی کارشناسی', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  NEEDS_INFO: { label: 'نقص مدارک / نیازمند اصلاح', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  APPROVED: { label: 'تأیید و تصویب شد', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  REVIEWED: { label: 'بررسی و تأیید شد', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  REJECTED: { label: 'رد شده', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  ARCHIVED: { label: 'بایگانی‌شده', cls: 'bg-slate-200 text-slate-700 border-slate-300' },
};

function extractKeyApplicantInfo(sub: CustomFormSubmission) {
  const fields = Array.isArray(sub.data) ? sub.data : [];

  const findField = (predicate: (f: SubmittedCustomFieldValue) => boolean) =>
    fields.find((f) => {
      if (!f || f.type === 'entity_list' || f.type === 'file') return false;
      const val = String(f.value ?? '').trim();
      return Boolean(val) && predicate(f);
    });

  const nameField = findField((f) => /نام|متقاضی|نام و نام خانوادگی|سرپرست/i.test(f.label));
  const phoneField = findField(
    (f) => f.type === 'phone' || /موبایل|همراه|تلفن/i.test(f.label)
  );
  const nidField = findField(
    (f) => f.type === 'national_id' || /کد ملی|کدملی/i.test(f.label)
  );

  const applicantName =
    sub.beneficiary?.fullName?.trim() ||
    (nameField ? String(nameField.value).trim() : '') ||
    (fields.find((f) => f.type === 'text' && String(f.value || '').trim())?.value ?? 'متقاضی بدون نام');

  const applicantPhone =
    sub.beneficiary?.phone?.trim() ||
    (phoneField ? String(phoneField.value).trim() : '');

  const applicantNid = nidField ? String(nidField.value).trim() : '';

  const usedIds = new Set<string>(
    [nameField?.id, phoneField?.id, nidField?.id].filter(Boolean) as string[]
  );

  const summaryItems: Array<{ label: string; value: string; isFile?: boolean; isEntity?: boolean }> = [];
  let extraFileCount = 0;
  let extraEntityCount = 0;

  for (const f of fields) {
    if (!f || usedIds.has(f.id)) continue;
    if (f.type === 'file') {
      if (f.fileUrl || f.fileName) extraFileCount++;
      continue;
    }
    if (f.type === 'entity_list') {
      if (Array.isArray(f.items) && f.items.length > 0) extraEntityCount += f.items.length;
      continue;
    }
    const cleanVal = String(f.value ?? '').trim();
    if (!cleanVal) continue;
    summaryItems.push({ label: f.label, value: cleanVal });
  }

  return {
    applicantName: String(applicantName),
    applicantPhone,
    applicantNid,
    previewFields: summaryItems.slice(0, 3),
    remainingCount: Math.max(0, summaryItems.length - 3),
    extraFileCount,
    extraEntityCount,
  };
}

export const CustomFormApplicantsPanel: React.FC<CustomFormApplicantsPanelProps> = ({
  form,
  currentUser,
  config,
  smsTemplates,
  onSubmissionCountChange,
}) => {
  const canDecide =
    hasPermission(currentUser, 'decideInbox') || hasPermission(currentUser, 'manageForms');
  const canDelete =
    hasPermission(currentUser, 'deleteInbox') || hasPermission(currentUser, 'manageForms');
  const canExport = hasPermission(currentUser, 'exportInbox');
  const canSendBell = hasPermission(currentUser, 'sendBeneficiaryBell');
  const canSendSms = hasPermission(currentUser, 'sendBeneficiarySms');
  const canSendPush = hasPermission(currentUser, 'sendBeneficiaryPush');
  const canNotifyAny = canSendBell || canSendSms || canSendPush;

  const [submissions, setSubmissions] = useState<CustomFormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail & Review Modal State
  const [selectedSub, setSelectedSub] = useState<CustomFormSubmission | null>(null);
  const [subStatusInput, setSubStatusInput] = useState<CustomFormSubmissionStatus>('NEW');
  const [subNoteInput, setSubNoteInput] = useState('');
  const [subExpertMsgInput, setSubExpertMsgInput] = useState('');
  const [subSendInApp, setSubSendInApp] = useState(true);
  const [subSendDirectSms, setSubSendDirectSms] = useState(false);
  const [subSmsTemplateId, setSubSmsTemplateId] = useState<number | ''>('');
  const [subSendPush, setSubSendPush] = useState(true);
  const [subSendRules, setSubSendRules] = useState(true);
  const [savingSub, setSavingSub] = useState(false);
  const [subFeedback, setSubFeedback] = useState('');
  const [subError, setSubError] = useState('');

  // Quick Direct Notify Modal State
  const [notifySub, setNotifySub] = useState<CustomFormSubmission | null>(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySendInApp, setNotifySendInApp] = useState(true);
  const [notifySendSms, setNotifySendSms] = useState(false);
  const [notifySmsTemplateId, setNotifySmsTemplateId] = useState<number | ''>('');
  const [notifySendPush, setNotifySendPush] = useState(true);
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifyResultMsg, setNotifyResultMsg] = useState('');
  const [notifyErrorMsg, setNotifyErrorMsg] = useState('');

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const list = await api.getFormSubmissions(form.id);
      const safeList = Array.isArray(list) ? list : [];
      setSubmissions(safeList);
      onSubmissionCountChange?.(form.id, safeList.length);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در دریافت لیست متقاضیان این فرم');
    } finally {
      setLoading(false);
    }
  }, [form.id, onSubmissionCountChange]);

  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSelectedSub(null);
    setNotifySub(null);
    loadSubmissions();
  }, [loadSubmissions]);

  const kpis = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter((s) => s.status === 'NEW' || s.status === 'IN_REVIEW').length;
    const approved = submissions.filter((s) => s.status === 'APPROVED' || s.status === 'REVIEWED').length;
    const needsInfo = submissions.filter((s) => s.status === 'NEEDS_INFO').length;
    const rejected = submissions.filter((s) => s.status === 'REJECTED').length;
    return { total, pending, approved, needsInfo, rejected };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING_GROUP') {
          if (sub.status !== 'NEW' && sub.status !== 'IN_REVIEW') return false;
        } else if (statusFilter === 'APPROVED_GROUP') {
          if (sub.status !== 'APPROVED' && sub.status !== 'REVIEWED') return false;
        } else if (sub.status !== statusFilter) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const inCode = sub.trackingCode.toLowerCase().includes(q);
        const inBen =
          sub.beneficiary?.fullName?.toLowerCase().includes(q) ||
          sub.beneficiary?.phone?.includes(q);
        const inData = (sub.data || []).some((d) =>
          String(d.value ?? '')
            .toLowerCase()
            .includes(q)
        );
        if (!inCode && !inBen && !inData) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, searchTerm]);

  const openDetailModal = (sub: CustomFormSubmission) => {
    setSelectedSub(sub);
    setSubStatusInput(sub.status || 'NEW');
    setSubNoteInput(sub.note || '');
    setSubExpertMsgInput(sub.expertMessage || '');
    setSubSendInApp(canSendBell);
    setSubSendDirectSms(false);
    setSubSmsTemplateId(smsTemplates[0]?.id ?? '');
    setSubSendPush(canSendPush);
    setSubSendRules(true);
    setSubFeedback('');
    setSubError('');
  };

  const handleSaveSubmissionReview = async () => {
    if (!selectedSub) return;
    if (subSendDirectSms && !subSmsTemplateId) {
      setSubError('برای ارسال پیامک، انتخاب یکی از متن‌های مجاز ثبت‌شده توسط ادمین الزامی است.');
      return;
    }
    setSavingSub(true);
    setSubError('');
    setSubFeedback('');
    try {
      const hasMsg = Boolean(subExpertMsgInput.trim());
      const updated = await api.updateFormSubmission(selectedSub.id, {
        status: canDecide ? subStatusInput : undefined,
        note: canDecide ? subNoteInput : undefined,
        expertMessage: subExpertMsgInput,
        sendSms: subSendRules,
        sendInApp: canSendBell && hasMsg ? subSendInApp : false,
        sendDirectSms: canSendSms ? subSendDirectSms : false,
        smsTemplateId: subSendDirectSms && subSmsTemplateId ? Number(subSmsTemplateId) : null,
        sendPush: canSendPush && hasMsg ? subSendPush : false,
      });
      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedSub(updated);

      const parts: string[] = ['تغییرات پرونده با موفقیت ثبت شد'];
      if (updated.notificationResult?.inApp?.created) parts.push('اعلان در زنگوله پروفایل ثبت شد');
      if (updated.notificationResult?.sms?.attempted) {
        parts.push(
          updated.notificationResult.sms.sent
            ? 'پیامک مجاز ارسال شد'
            : `پیامک ارسال نشد (${updated.notificationResult.sms.error || 'خطا'})`
        );
      }
      if (updated.notificationResult?.push?.attempted) {
        parts.push(
          updated.notificationResult.push.sentCount > 0
            ? `پوش نوتیفیکیشن به ${toPersianDigits(updated.notificationResult.push.sentCount)} دستگاه ارسال شد`
            : `پوش: ${updated.notificationResult.push.error || 'دستگاه فعالی یافت نشد'}`
        );
      }
      setSubFeedback(parts.join(' • '));
    } catch (err: any) {
      setSubError(err.message || 'خطا در ذخیره بررسی پرونده');
    } finally {
      setSavingSub(false);
    }
  };

  const openQuickNotifyModal = (sub: CustomFormSubmission) => {
    setNotifySub(sub);
    setNotifyTitle(`پیام کارشناس درباره «${form.title}» (${sub.trackingCode})`);
    setNotifyMessage(sub.expertMessage || '');
    setNotifySendInApp(canSendBell);
    setNotifySendSms(false);
    setNotifySmsTemplateId(smsTemplates[0]?.id ?? '');
    setNotifySendPush(canSendPush);
    setNotifyResultMsg('');
    setNotifyErrorMsg('');
  };

  const handleSendQuickNotify = async () => {
    if (!notifySub) return;
    if (!notifySendInApp && !notifySendSms && !notifySendPush) {
      setNotifyErrorMsg('لطفاً حداقل یکی از کانال‌های ارسال را انتخاب کنید.');
      return;
    }
    if ((notifySendInApp || notifySendPush) && !notifyMessage.trim() && !notifySendSms) {
      setNotifyErrorMsg('لطفاً متن پیام برای مددجو را وارد کنید.');
      return;
    }
    if (notifySendSms && !notifySmsTemplateId) {
      setNotifyErrorMsg('برای ارسال پیامک، انتخاب یکی از متن‌های مجاز ثبت‌شده توسط ادمین الزامی است.');
      return;
    }

    const info = extractKeyApplicantInfo(notifySub);
    setNotifySubmitting(true);
    setNotifyErrorMsg('');
    setNotifyResultMsg('');
    try {
      const { result } = await api.sendBeneficiaryNotification({
        beneficiaryId: notifySub.beneficiaryId || notifySub.beneficiary?.id || null,
        beneficiaryName: info.applicantName,
        phone: info.applicantPhone || null,
        title: notifyTitle.trim() || `پیام کارشناس درباره «${form.title}»`,
        message: notifyMessage.trim(),
        formId: form.id,
        formTitle: form.title,
        trackingCode: notifySub.trackingCode,
        sendInApp: canSendBell && notifySendInApp,
        sendSms: canSendSms && notifySendSms,
        smsTemplateId: notifySendSms && notifySmsTemplateId ? Number(notifySmsTemplateId) : null,
        sendPush: canSendPush && notifySendPush,
      });

      const parts: string[] = [];
      if (result.inApp.created) parts.push('در زنگوله پروفایل مددجو ثبت شد');
      if (result.sms.attempted) {
        parts.push(
          result.sms.sent
            ? `پیامک مجاز به ${result.sms.receptor || info.applicantPhone} ارسال شد`
            : `پیامک ارسال نشد (${result.sms.error || 'خطا'})`
        );
      }
      if (result.push.attempted) {
        parts.push(
          result.push.sentCount > 0
            ? `پوش نوتیفیکیشن به ${toPersianDigits(result.push.sentCount)} دستگاه ارسال شد`
            : `پوش: ${result.push.error || 'دستگاه فعالی یافت نشد'}`
        );
      }
      setNotifyResultMsg(parts.join(' • ') || 'ارسال انجام شد');
    } catch (err: any) {
      setNotifyErrorMsg(err.message || 'خطا در ارسال اعلان به مددجو');
    } finally {
      setNotifySubmitting(false);
    }
  };

  const handleDeleteSub = async (subId: number) => {
    if (!confirm('آیا از حذف دائمی این پرونده از این فرم اطمینان دارید؟')) return;
    try {
      await api.deleteFormSubmission(subId);
      const next = submissions.filter((s) => s.id !== subId);
      setSubmissions(next);
      onSubmissionCountChange?.(form.id, next.length);
      if (selectedSub?.id === subId) setSelectedSub(null);
    } catch (err: any) {
      alert(err.message || 'خطا در حذف پرونده');
    }
  };

  const exportCsv = () => {
    if (filteredSubmissions.length === 0) return;
    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const headers = [
      'کد رهگیری',
      'نام متقاضی',
      'شماره موبایل',
      'وضعیت',
      'تاریخ ثبت',
      'اطلاعات ثبت‌شده در فرم',
      'پیام کارشناس',
      'یادداشت',
    ];
    const rows = filteredSubmissions.map((s) => {
      const info = extractKeyApplicantInfo(s);
      const joined = (s.data || [])
        .map((item) => {
          if (item.type === 'entity_list' && Array.isArray(item.items)) {
            const subRows = item.items.map((r, idx) => formatEntityRowSummary(r, idx)).join(' // ');
            return `${item.label}: [${subRows}]`;
          }
          if (item.type === 'file' && item.fileUrl) {
            return `${item.label}: ${item.fileName || item.value} (${item.fileUrl})`;
          }
          return `${item.label}: ${item.value}`;
        })
        .join(' | ');
      return [
        s.trackingCode,
        info.applicantName,
        info.applicantPhone || '-',
        CUSTOM_FORM_STATUS_LABELS[s.status] || s.status,
        new Date(s.createdAt).toLocaleDateString('fa-IR'),
        joined,
        s.expertMessage || '',
        s.note || '',
      ].map(escapeCsv);
    });
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `applicants-${form.slug}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const notifyInfo = notifySub ? extractKeyApplicantInfo(notifySub) : null;
  const selectedInfo = selectedSub ? extractKeyApplicantInfo(selectedSub) : null;

  return (
    <div className="space-y-5">
      {/* Form Context Banner */}
      <div className="bg-gradient-to-l from-emerald-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base">{form.title}</h3>
              {form.showInBeneficiaryPortal && (
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-200 text-[10px] font-bold">
                  فعال در پروفایل مددجو
                </span>
              )}
            </div>
            {form.description && (
              <p className="text-xs text-emerald-100/80 mt-0.5 line-clamp-1">{form.description}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={loadSubmissions}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer shrink-0 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>بروزرسانی فهرست</span>
        </button>
      </div>

      {/* KPI Cards (Matching Public Request Form style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">کل پرونده‌های این فرم</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{toPersianDigits(kpis.total)}</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-xs text-amber-800 font-semibold">جدید / در صف بررسی</span>
          <p className="text-2xl font-black text-amber-700 mt-1">{toPersianDigits(kpis.pending)}</p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <span className="text-xs text-emerald-800 font-semibold">تأیید و تصویب‌شده</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {toPersianDigits(kpis.approved)}
          </p>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 shadow-sm">
          <span className="text-xs text-blue-800 font-semibold">نقص مدارک / اصلاح</span>
          <p className="text-2xl font-black text-blue-700 mt-1">{toPersianDigits(kpis.needsInfo)}</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-xs text-rose-800 font-semibold">رد شده</span>
          <p className="text-2xl font-black text-rose-700 mt-1">{toPersianDigits(kpis.rejected)}</p>
        </div>
      </div>

      {/* Filter & Export Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[210px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="جستجو در کد رهگیری، نام، موبایل یا پاسخ‌های فرم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="PENDING_GROUP">جدید / در حال بررسی</option>
              <option value="APPROVED_GROUP">تأیید شده</option>
              <option value="NEEDS_INFO">نقص مدارک</option>
              <option value="REJECTED">رد شده</option>
              <option value="ARCHIVED">بایگانی‌شده</option>
            </select>
          </div>
        </div>

        {canExport && (
          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredSubmissions.length === 0}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>خروجی اکسل (CSV)</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Clean Concise Applicants Table (Structured like Public Request Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold">
                <th className="py-3.5 px-4">کد رهگیری / تاریخ</th>
                <th className="py-3.5 px-4">متقاضی و مشخصات کلیدی</th>
                <th className="py-3.5 px-4">خلاصه اطلاعات ثبت‌شده</th>
                <th className="py-3.5 px-4">وضعیت پرونده</th>
                <th className="py-3.5 px-4 text-center">عملیات بررسی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    در حال بارگذاری فهرست متقاضیان این فرم...
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    هیچ رکوردی با فیلترهای انتخاب‌شده برای این فرم یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const info = extractKeyApplicantInfo(sub);
                  const badge = STATUS_BADGE_MAP[sub.status] || {
                    label: CUSTOM_FORM_STATUS_LABELS[sub.status] || sub.status,
                    cls: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition align-top">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md block w-fit">
                          {sub.trackingCode}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1.5">
                          {new Date(sub.createdAt).toLocaleDateString('fa-IR')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{info.applicantName}</span>
                          {sub.beneficiary && (
                            <span
                              title="ثبت‌شده از پروفایل مددجو"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold"
                            >
                              <UserCheck className="w-3 h-3" />
                              پروفایل
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-2 mt-1">
                          {info.applicantPhone && (
                            <span className="font-mono dir-ltr">
                              {toPersianDigits(info.applicantPhone)}
                            </span>
                          )}
                          {info.applicantNid && (
                            <span className="font-mono">
                              کد ملی: {toPersianDigits(info.applicantNid)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-md">
                        <div className="space-y-1">
                          {info.previewFields.length > 0 ? (
                            info.previewFields.map((pf, idx) => (
                              <div key={idx} className="text-[11px] text-slate-700 leading-snug truncate">
                                <span className="text-slate-400 font-medium">{pf.label}: </span>
                                <span className="font-semibold text-slate-800">{pf.value}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              برای مشاهده جزئیات روی آیکون چشم کلیک کنید
                            </span>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {info.remainingCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                + {toPersianDigits(info.remainingCount)} فیلد دیگر
                              </span>
                            )}
                            {info.extraFileCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                <FileText className="w-3 h-3" />
                                {toPersianDigits(info.extraFileCount)} فایل پیوست
                              </span>
                            )}
                            {info.extraEntityCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                <Layers className="w-3 h-3" />
                                {toPersianDigits(info.extraEntityCount)} ردیف موجودیت
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                        {(sub.expertMessage || sub.note) && (
                          <p
                            className="text-[10px] text-slate-500 mt-1 max-w-[180px] truncate"
                            title={sub.expertMessage || sub.note || ''}
                          >
                            {sub.expertMessage || sub.note}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openDetailModal(sub)}
                            title="مشاهده تمام فیلدها و بررسی پرونده"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>بررسی</span>
                          </button>

                          {canNotifyAny && (
                            <button
                              type="button"
                              onClick={() => openQuickNotifyModal(sub)}
                              title="ارسال اعلان زنگوله / پیامک مجاز / پوش نوتیفیکیشن"
                              className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSub(sub.id)}
                              title="حذف کامل پرونده"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Details & Review Modal */}
      {selectedSub && selectedInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base text-slate-900">
                    پرونده متقاضی: {selectedInfo.applicantName}
                  </h3>
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">
                    {selectedSub.trackingCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  فرم: <strong className="text-slate-700">{form.title}</strong> • ثبت:{' '}
                  {new Date(selectedSub.createdAt).toLocaleString('fa-IR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedSub.beneficiary && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex flex-wrap items-center justify-between gap-2 text-xs text-teal-900">
                <div className="flex items-center gap-2 font-bold">
                  <UserCheck className="w-4 h-4 text-teal-700" />
                  <span>حساب کاربری مددجو: {selectedSub.beneficiary.fullName}</span>
                </div>
                <span className="font-mono dir-ltr font-bold">{selectedSub.beneficiary.phone}</span>
              </div>
            )}

            {/* All Submitted Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {(selectedSub.data || []).map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className={`p-3 rounded-xl bg-slate-50 border border-slate-200 ${
                    item.type === 'textarea' || item.type === 'entity_list' || item.type === 'file'
                      ? 'sm:col-span-2'
                      : ''
                  }`}
                >
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    {item.label}
                  </span>

                  {item.type === 'entity_list' && Array.isArray(item.items) ? (
                    item.items.length === 0 ? (
                      <span className="text-slate-400">موردی ثبت نشده</span>
                    ) : (
                      <div className="space-y-1.5 mt-1">
                        {item.items.map((row, rIdx) => (
                          <div
                            key={rIdx}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium"
                          >
                            {formatEntityRowSummary(row, rIdx)}
                          </div>
                        ))}
                      </div>
                    )
                  ) : item.type === 'file' && item.fileUrl ? (
                    <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 p-2 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">
                            {item.fileName || item.value || 'فایل پیوست'}
                          </span>
                          {item.fileSize && (
                            <span className="text-[10px] text-slate-500">
                              {formatBytesCompact(item.fileSize)}
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>مشاهده / دانلود</span>
                      </a>
                    </div>
                  ) : (
                    <span className="font-bold text-slate-900 whitespace-pre-wrap">
                      {item.value || '-'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Review & Notification Controls */}
            {(canDecide || canNotifyAny) && (
              <div className="pt-4 border-t border-slate-200 space-y-3 text-xs">
                {canDecide && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">وضعیت بررسی</label>
                      <select
                        value={subStatusInput}
                        onChange={(e) =>
                          setSubStatusInput(e.target.value as CustomFormSubmissionStatus)
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {Object.entries(CUSTOM_FORM_STATUS_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        یادداشت کوتاه وضعیت
                      </label>
                      <input
                        type="text"
                        value={subNoteInput}
                        onChange={(e) => setSubNoteInput(e.target.value)}
                        placeholder="یادداشت کوتاه جهت نمایش در استعلام..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {canNotifyAny && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                    <label className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-amber-600" />
                      <span>پیغام کارشناس برای مددجو (نمایش در پروفایل، زنگوله و پوش):</span>
                    </label>
                    <textarea
                      rows={2}
                      value={subExpertMsgInput}
                      onChange={(e) => setSubExpertMsgInput(e.target.value)}
                      placeholder="مثال: مدارک شما بررسی شد؛ لطفاً تصویر اجاره‌نامه را در پروفایل بارگذاری کنید..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {canSendBell && (
                        <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-amber-200 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            checked={subSendInApp}
                            onChange={(e) => setSubSendInApp(e.target.checked)}
                            className="rounded text-emerald-600"
                          />
                          <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>زنگوله پروفایل</span>
                        </label>
                      )}

                      {canSendSms && (
                        <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-amber-200 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            checked={subSendDirectSms}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSubSendDirectSms(checked);
                              if (checked && !subSmsTemplateId && smsTemplates[0]) {
                                setSubSmsTemplateId(smsTemplates[0].id);
                              }
                            }}
                            className="rounded text-emerald-600"
                          />
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>ارسال پیامک (متن مجاز)</span>
                        </label>
                      )}

                      {canSendPush && (
                        <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-amber-200 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            checked={subSendPush}
                            onChange={(e) => setSubSendPush(e.target.checked)}
                            className="rounded text-emerald-600"
                          />
                          <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>پوش نوتیفیکیشن</span>
                        </label>
                      )}
                    </div>

                    {canSendSms && subSendDirectSms && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                        <label className="block text-[11px] font-bold text-emerald-950">
                          انتخاب متن مجاز پیامک (ثبت‌شده توسط مدیر کل):
                        </label>
                        {smsTemplates.length === 0 ? (
                          <p className="text-[11px] text-rose-700 font-semibold">
                            هیچ متن پیامک مجازی توسط مدیر کل ثبت نشده است.
                          </p>
                        ) : (
                          <>
                            <select
                              value={subSmsTemplateId}
                              onChange={(e) =>
                                setSubSmsTemplateId(e.target.value ? Number(e.target.value) : '')
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-[11px] font-semibold outline-none"
                            >
                              <option value="">-- انتخاب متن مجاز پیامک --</option>
                              {smsTemplates.map((tpl) => (
                                <option key={tpl.id} value={tpl.id}>
                                  {tpl.title}
                                </option>
                              ))}
                            </select>
                            {subSmsTemplateId && (() => {
                              const chosen = smsTemplates.find((t) => t.id === Number(subSmsTemplateId));
                              if (!chosen) return null;
                              return (
                                <div className="p-2 rounded-lg bg-white border border-emerald-200 text-[11px] text-slate-700 leading-relaxed">
                                  <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">
                                    پیش‌نمایش دقیق پیامک ارسالی (غیرقابل تغییر):
                                  </span>
                                  {renderSmsTemplatePreview(chosen.body, {
                                    name: selectedInfo.applicantName,
                                    trackingCode: selectedSub.trackingCode,
                                    formTitle: form.title,
                                    instName: config?.instName,
                                  })}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {subError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                    {subError}
                  </div>
                )}

                {subFeedback && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{subFeedback}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 text-[11px]">
                    <input
                      type="checkbox"
                      checked={subSendRules}
                      onChange={(e) => setSubSendRules(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>اجرای قوانین پیامک خودکار تعریف‌شده روی این فرم</span>
                  </label>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedSub(null)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                    >
                      بستن
                    </button>
                    <button
                      type="button"
                      disabled={savingSub}
                      onClick={handleSaveSubmissionReview}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{savingSub ? 'در حال ثبت...' : 'ذخیره بررسی و ارسال پیام'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Direct Notify Modal */}
      {notifySub && notifyInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">ارسال پیام و اعلان به مددجو</h3>
                  <p className="text-[11px] text-slate-500">
                    {notifyInfo.applicantName} • <span className="font-mono">{notifySub.trackingCode}</span>
                    {notifyInfo.applicantPhone && (
                      <>
                        {' '}
                        • <span className="font-mono dir-ltr">{notifyInfo.applicantPhone}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifySub(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">عنوان اعلان</label>
                <input
                  type="text"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {(canSendBell || canSendPush) && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    متن اعلان زنگوله پروفایل و پوش نوتیفیکیشن:
                  </label>
                  <textarea
                    rows={3}
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="توضیحات کارشناس جهت نمایش در زنگوله پروفایل مددجو و پوش..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                <span className="font-bold text-amber-950 block">کانال‌های ارسال مجاز شما:</span>

                {canSendBell && (
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold">
                    <input
                      type="checkbox"
                      checked={notifySendInApp}
                      onChange={(e) => setNotifySendInApp(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ثبت در زنگوله اعلانات پروفایل مددجو</span>
                  </label>
                )}

                {canSendSms && (
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold">
                    <input
                      type="checkbox"
                      checked={notifySendSms}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNotifySendSms(checked);
                        if (checked && !notifySmsTemplateId && smsTemplates[0]) {
                          setNotifySmsTemplateId(smsTemplates[0].id);
                        }
                      }}
                      className="rounded text-emerald-600"
                    />
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>ارسال پیامک (SMS) صرفاً از میان متن‌های مجاز ثبت‌شده</span>
                  </label>
                )}

                {canSendSms && notifySendSms && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <label className="block text-[11px] font-bold text-emerald-950">
                      انتخاب متن مجاز پیامک:
                    </label>
                    {smsTemplates.length === 0 ? (
                      <p className="text-[11px] text-rose-700 font-semibold">
                        هیچ متن پیامک مجازی توسط مدیر کل ثبت نشده است.
                      </p>
                    ) : (
                      <>
                        <select
                          value={notifySmsTemplateId}
                          onChange={(e) =>
                            setNotifySmsTemplateId(e.target.value ? Number(e.target.value) : '')
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-[11px] font-semibold outline-none"
                        >
                          <option value="">-- یک متن مجاز را انتخاب کنید --</option>
                          {smsTemplates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.title}
                            </option>
                          ))}
                        </select>
                        {notifySmsTemplateId && (() => {
                          const chosen = smsTemplates.find((t) => t.id === Number(notifySmsTemplateId));
                          if (!chosen) return null;
                          return (
                            <div className="p-2 rounded-lg bg-white border border-emerald-200 text-[11px] text-slate-700 leading-relaxed">
                              <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">
                                پیش‌نمایش دقیق پیامک ارسالی:
                              </span>
                              {renderSmsTemplatePreview(chosen.body, {
                                name: notifyInfo.applicantName,
                                trackingCode: notifySub.trackingCode,
                                formTitle: form.title,
                                instName: config?.instName,
                              })}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {canSendPush && (
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold">
                    <input
                      type="checkbox"
                      checked={notifySendPush}
                      onChange={(e) => setNotifySendPush(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>ارسال پوش نوتیفیکیشن به گوشی/مرورگر مددجو</span>
                  </label>
                )}
              </div>
            </div>

            {notifyErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {notifyErrorMsg}
              </div>
            )}

            {notifyResultMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{notifyResultMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNotifySub(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                بستن
              </button>
              <button
                type="button"
                disabled={notifySubmitting}
                onClick={handleSendQuickNotify}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{notifySubmitting ? 'در حال ارسال...' : 'ارسال پیام به مددجو'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
