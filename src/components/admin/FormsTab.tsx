import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Layers,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  Trash2,
  Inbox,
  Save,
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Eye,
  Clock,
  Archive,
  UserCheck,
  MessageSquare,
  HardDrive,
  FileText,
  Sparkles,
  ArrowRight,
  Bell,
  Smartphone,
} from 'lucide-react';
import {
  AppConfig,
  Category,
  CustomForm,
  CustomFormSubmission,
  CustomFormSubmissionStatus,
  SmsTemplate,
  StaffUser,
} from '../../types';
import {
  CUSTOM_FORM_STATUS_LABELS,
  CustomFormField,
  CustomFormSmsRule,
  EntityDefinition,
  createPublicRequestFormTemplateFields,
  formatBytesCompact,
  formatEntityRowSummary,
  parseCustomFormSmsRules,
  parsePublicFormSchema,
} from '../../utils/publicFormConfig';
import { api } from '../../services/api';
import { toPersianDigits } from '../../utils/persian';
import { hasPermission, renderSmsTemplatePreview } from '../../utils/permissions';
import { EntitiesManagerSection } from './EntitiesManagerSection';
import { FormFieldsEditor } from './FormFieldsEditor';
import { FormSmsRulesSection } from './FormSmsRulesSection';
import { PublicFormBuilderSection } from './PublicFormBuilderSection';

interface FormsTabProps {
  currentUser?: StaffUser;
  config: AppConfig | null;
  needCategories: Category[];
  entities: EntityDefinition[];
  onRefreshEntities: () => void;
  onConfigUpdated: (config: AppConfig) => void;
}

const THEME_OPTIONS = [
  { id: 'emerald', label: 'سبز زمردی', swatch: 'bg-emerald-700' },
  { id: 'teal', label: 'فیروزه‌ای', swatch: 'bg-teal-700' },
  { id: 'blue', label: 'آبی لاجوردی', swatch: 'bg-blue-800' },
  { id: 'amber', label: 'طلایی / کهربایی', swatch: 'bg-amber-600' },
  { id: 'slate', label: 'ذغالی رسمی', swatch: 'bg-slate-800' },
];

export const FormsTab: React.FC<FormsTabProps> = ({
  currentUser,
  config,
  needCategories,
  entities,
  onRefreshEntities,
  onConfigUpdated,
}) => {
  const canManageForms = !currentUser || hasPermission(currentUser, 'manageForms');
  const canSendBell = !currentUser || hasPermission(currentUser, 'sendBeneficiaryBell');
  const canSendSms = !currentUser || hasPermission(currentUser, 'sendBeneficiarySms');
  const canSendPush = !currentUser || hasPermission(currentUser, 'sendBeneficiaryPush');

  const [subTab, setSubTab] = useState<'forms' | 'entities'>('forms');
  const [editingPublicForm, setEditingPublicForm] = useState(false);
  const [copiedPublicForm, setCopiedPublicForm] = useState(false);
  const [togglingPublicPortal, setTogglingPublicPortal] = useState(false);
  const [togglingFormPortalId, setTogglingFormPortalId] = useState<string | null>(null);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [heroBadge, setHeroBadge] = useState('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
  const [theme, setTheme] = useState('emerald');
  const [submitButtonText, setSubmitButtonText] = useState('ثبت نهایی اطلاعات');
  const [successMessage, setSuccessMessage] = useState('اطلاعات شما با موفقیت در سیستم ثبت گردید.');
  const [isActive, setIsActive] = useState(true);
  const [showTracking, setShowTracking] = useState(true);
  const [showInBeneficiaryPortal, setShowInBeneficiaryPortal] = useState(false);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState<number>(5);
  const [smsRules, setSmsRules] = useState<CustomFormSmsRule[]>([]);
  const [fields, setFields] = useState<CustomFormField[]>([]);
  const [savingForm, setSavingForm] = useState(false);

  // Submissions Viewer State
  const [viewingForm, setViewingForm] = useState<CustomForm | null>(null);
  const [submissions, setSubmissions] = useState<CustomFormSubmission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [selectedSub, setSelectedSub] = useState<CustomFormSubmission | null>(null);
  const [subNoteInput, setSubNoteInput] = useState('');
  const [subExpertMsgInput, setSubExpertMsgInput] = useState('');
  const [subSendSms, setSubSendSms] = useState(true);
  const [subSendInApp, setSubSendInApp] = useState(true);
  const [subSendDirectSms, setSubSendDirectSms] = useState(false);
  const [subSmsTemplateId, setSubSmsTemplateId] = useState<number | ''>('');
  const [subSendPush, setSubSendPush] = useState(true);
  const [subStatusInput, setSubStatusInput] = useState<CustomFormSubmissionStatus>('NEW');
  const [savingSub, setSavingSub] = useState(false);
  const [subFeedback, setSubFeedback] = useState('');

  useEffect(() => {
    api.getSmsTemplates(false).then((list) => {
      setSmsTemplates(Array.isArray(list) ? list : []);
    }).catch(() => undefined);
  }, []);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getForms();
      setForms(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در دریافت لیست فرم‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const resetEditor = () => {
    setEditingFormId(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setHeroBadge('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
    setTheme('emerald');
    setSubmitButtonText('ثبت نهایی اطلاعات');
    setSuccessMessage('اطلاعات شما با موفقیت در سیستم ثبت گردید.');
    setIsActive(true);
    setShowTracking(true);
    setShowInBeneficiaryPortal(false);
    setMaxFileSizeMB(5);
    setSmsRules([]);
    setFields([]);
    setErrorMsg('');
  };

  const openCreateForm = () => {
    resetEditor();
    setShowEditor(true);
  };

  const openCreateFromPublicTemplate = () => {
    resetEditor();
    const publicSchema = parsePublicFormSchema(config?.publicFormConfig);
    setTitle(`کپی از ${publicSchema.title}`);
    setDescription(publicSchema.description);
    setHeroBadge(publicSchema.heroBadge || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
    setSubmitButtonText(publicSchema.submitButtonText || 'ثبت نهایی و دریافت کد رهگیری');
    setSuccessMessage(publicSchema.successMessage || 'درخواست شما با موفقیت در سیستم ثبت گردید.');
    setMaxFileSizeMB(publicSchema.maxFileSizeMB || 5);
    setFields(createPublicRequestFormTemplateFields(needCategories.map((c) => c.name)));
    setShowEditor(true);
  };

  const applyPublicTemplateToCurrentEditor = () => {
    if (
      fields.length > 0 &&
      !confirm('فیلدهای الگوی کامل فرم درخواست عمومی به انتهای فیلدهای فعلی اضافه شوند؟')
    ) {
      return;
    }
    const tpl = createPublicRequestFormTemplateFields(needCategories.map((c) => c.name));
    setFields((prev) => [...prev, ...tpl]);
  };

  const copyPublicFormUrl = () => {
    const url = `${window.location.origin}/form`;
    navigator.clipboard.writeText(url);
    setCopiedPublicForm(true);
    setTimeout(() => setCopiedPublicForm(false), 2500);
  };

  const togglePublicFormInBeneficiaryPortal = async () => {
    setTogglingPublicPortal(true);
    setErrorMsg('');
    try {
      const currentSchema = parsePublicFormSchema(config?.publicFormConfig);
      const nextVal = !currentSchema.showInBeneficiaryPortal;
      const updated = await api.updateConfig({
        publicFormConfig: JSON.stringify({
          ...currentSchema,
          showInBeneficiaryPortal: nextVal,
        }),
      });
      onConfigUpdated(updated);
      setStatusMsg(
        nextVal
          ? 'فرم درخواست عمومی با موفقیت برای نمایش در پروفایل مددجو فعال شد.'
          : 'نمایش فرم درخواست عمومی در پروفایل مددجو غیرفعال شد.'
      );
      setTimeout(() => setStatusMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در تغییر وضعیت نمایش فرم عمومی در پروفایل مددجو');
    } finally {
      setTogglingPublicPortal(false);
    }
  };

  const openEditForm = (f: CustomForm) => {
    setEditingFormId(f.id);
    setTitle(f.title);
    setSlug(f.slug);
    setDescription(f.description || '');
    setHeroBadge(f.heroBadge || '');
    setTheme(f.theme || 'emerald');
    setSubmitButtonText(f.submitButtonText || 'ثبت نهایی اطلاعات');
    setSuccessMessage(f.successMessage || 'اطلاعات شما با موفقیت ثبت شد.');
    setIsActive(f.isActive !== false);
    setShowTracking(f.showTracking !== false);
    setShowInBeneficiaryPortal(Boolean(f.showInBeneficiaryPortal));
    setMaxFileSizeMB(typeof f.maxFileSizeMB === 'number' && f.maxFileSizeMB > 0 ? f.maxFileSizeMB : 5);
    setSmsRules(parseCustomFormSmsRules(f.smsRules));
    setFields(Array.isArray(f.fields) ? JSON.parse(JSON.stringify(f.fields)) : []);
    setErrorMsg('');
    setShowEditor(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!title.trim()) {
      setErrorMsg('عنوان فرم را وارد نمایید.');
      return;
    }
    setSavingForm(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        heroBadge: heroBadge.trim(),
        theme,
        submitButtonText: submitButtonText.trim() || 'ثبت نهایی اطلاعات',
        successMessage: successMessage.trim() || 'اطلاعات شما با موفقیت ثبت شد.',
        isActive,
        showTracking,
        showInBeneficiaryPortal,
        maxFileSizeMB: Math.min(25, Math.max(1, Math.round(Number(maxFileSizeMB) || 5))),
        smsRules,
        fields,
      };
      if (editingFormId) {
        await api.updateForm(editingFormId, payload);
        setStatusMsg('فرم اختصاصی با موفقیت ذخیره شد.');
      } else {
        await api.createForm(payload);
        setStatusMsg('صفحه و فرم جدید با موفقیت ایجاد شد.');
      }
      setShowEditor(false);
      resetEditor();
      loadForms();
      setTimeout(() => setStatusMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ذخیره فرم');
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteForm = async (f: CustomForm) => {
    if (!confirm(`آیا از حذف فرم «${f.title}» و تمامی پاسخ‌های ثبت‌شده آن اطمینان دارید؟`)) {
      return;
    }
    try {
      await api.deleteForm(f.id);
      loadForms();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در حذف فرم');
    }
  };

  const copyShareUrl = (formSlug: string) => {
    const url = `${window.location.origin}/forms/${formSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(formSlug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const openSubmissions = async (f: CustomForm) => {
    setViewingForm(f);
    setSubsLoading(true);
    setSelectedSub(null);
    try {
      const list = await api.getFormSubmissions(f.id);
      setSubmissions(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در دریافت پاسخ‌ها');
    } finally {
      setSubsLoading(false);
    }
  };

  const handleToggleCustomFormPortal = async (f: CustomForm) => {
    if (!canManageForms) return;
    setTogglingFormPortalId(f.id);
    setErrorMsg('');
    try {
      const nextVal = !f.showInBeneficiaryPortal;
      const updated = await api.updateForm(f.id, { showInBeneficiaryPortal: nextVal });
      setForms((prev) => prev.map((item) => (item.id === f.id ? updated : item)));
      setStatusMsg(
        nextVal
          ? `فرم «${f.title}» در پروفایل مددجو فعال شد و اکنون برای مددجویان نمایش داده می‌شود.`
          : `نمایش فرم «${f.title}» در پروفایل مددجو غیرفعال شد.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در تغییر وضعیت نمایش فرم در پروفایل مددجو');
    } finally {
      setTogglingFormPortalId(null);
    }
  };

  const openSubmissionDetail = (sub: CustomFormSubmission) => {
    setSelectedSub(sub);
    setSubStatusInput(sub.status || 'NEW');
    setSubNoteInput(sub.note || '');
    setSubExpertMsgInput(sub.expertMessage || '');
    setSubSendSms(true);
    setSubSendInApp(canSendBell);
    setSubSendDirectSms(false);
    setSubSmsTemplateId(smsTemplates[0]?.id ?? '');
    setSubSendPush(canSendPush);
    setSubFeedback('');
  };

  const handleUpdateSubmission = async () => {
    if (!selectedSub || !viewingForm) return;
    if (subSendDirectSms && !subSmsTemplateId) {
      setErrorMsg('برای ارسال پیامک، انتخاب یکی از متن‌های مجاز ثبت‌شده توسط ادمین الزامی است.');
      return;
    }
    setSavingSub(true);
    setSubFeedback('');
    setErrorMsg('');
    try {
      const hasMsg = Boolean(subExpertMsgInput.trim());
      const updated = await api.updateFormSubmission(selectedSub.id, {
        status: subStatusInput,
        note: subNoteInput,
        expertMessage: subExpertMsgInput,
        sendSms: subSendSms,
        sendInApp: canSendBell && hasMsg ? subSendInApp : false,
        sendDirectSms: canSendSms ? subSendDirectSms : false,
        smsTemplateId: subSendDirectSms && subSmsTemplateId ? Number(subSmsTemplateId) : null,
        sendPush: canSendPush && hasMsg ? subSendPush : false,
      });
      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedSub(updated);

      const parts: string[] = ['وضعیت و پیغام کارشناس ذخیره شد'];
      if (updated.notificationResult?.inApp?.created) {
        parts.push('در زنگوله پروفایل مددجو ثبت شد');
      }
      if (updated.notificationResult?.sms?.attempted) {
        if (updated.notificationResult.sms.sent) {
          parts.push('پیامک مجاز ارسال شد');
        } else if (updated.notificationResult.sms.error) {
          parts.push(`پیامک ارسال نشد (${updated.notificationResult.sms.error})`);
        }
      }
      if (updated.notificationResult?.push?.attempted) {
        if (updated.notificationResult.push.sentCount > 0) {
          parts.push(
            `پوش نوتیفیکیشن به ${toPersianDigits(updated.notificationResult.push.sentCount)} دستگاه ارسال شد`
          );
        } else if (updated.notificationResult.push.error) {
          parts.push(`پوش: ${updated.notificationResult.push.error}`);
        }
      }
      if (updated.dispatchedSmsCount && updated.dispatchedSmsCount > 0) {
        parts.push(`قوانین پیامک: ${toPersianDigits(updated.dispatchedSmsCount)} ارسال`);
      }
      setSubFeedback(parts.join(' • '));
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ثبت وضعیت');
    } finally {
      setSavingSub(false);
    }
  };

  const handleDeleteSubmission = async (subId: number) => {
    if (!confirm('آیا از حذف این پاسخ اطمینان دارید؟')) return;
    try {
      await api.deleteFormSubmission(subId);
      setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      if (selectedSub?.id === subId) setSelectedSub(null);
      loadForms();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در حذف پاسخ');
    }
  };

  const exportSubmissionsCsv = () => {
    if (!viewingForm || submissions.length === 0) return;
    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const headers = ['کد پیگیری', 'مددجو', 'موبایل حساب', 'وضعیت', 'تاریخ ثبت', 'پاسخ‌ها', 'پیغام کارشناس', 'یادداشت'];
    const rows = submissions.map((s) => {
      const joinedData = (s.data || [])
        .map((item) => {
          if (item.type === 'entity_list' && Array.isArray(item.items)) {
            const subRows = item.items
              .map((r, idx) => formatEntityRowSummary(r, idx))
              .join(' // ');
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
        s.beneficiary?.fullName || '-',
        s.beneficiary?.phone || '-',
        CUSTOM_FORM_STATUS_LABELS[s.status] || s.status,
        new Date(s.createdAt).toLocaleDateString('fa-IR'),
        joinedData,
        s.expertMessage || '',
        s.note || '',
      ].map(escapeCsv);
    });
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `form-${viewingForm.slug}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setSubTab('forms');
              setEditingPublicForm(false);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'forms'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <span>فرم‌ها و صفحات اختصاصی</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('entities');
              setEditingPublicForm(false);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'entities'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-teal-600" />
            <span>بانک موجودیت‌ها ({toPersianDigits(entities.length)})</span>
          </button>
        </div>

        {subTab === 'forms' && !editingPublicForm && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreateFromPublicTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>ساخت از الگوی فرم عمومی</span>
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ایجاد فرم و صفحه جدید</span>
            </button>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && !showEditor && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {subTab === 'entities' ? (
        <EntitiesManagerSection
          entities={entities}
          onRefreshEntities={onRefreshEntities}
        />
      ) : editingPublicForm ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white text-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  ویرایش و طراحی فیلدهای فرم درخواست عمومی
                </h3>
                <p className="text-[11px] text-slate-500">
                  تغییرات شما مستقیماً در فرم عمومی سامانه (/form) و پروفایل مددجو اعمال می‌شود.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingPublicForm(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به لیست فرم‌ها</span>
            </button>
          </div>

          <PublicFormBuilderSection
            config={config}
            entities={entities}
            onConfigUpdated={onConfigUpdated}
            onOpenEntitiesTab={() => {
              setEditingPublicForm(false);
              setSubTab('entities');
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>فهرست فرم‌های سامانه ({toPersianDigits(forms.length + 1)})</span>
            </h4>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              در حال بارگذاری فرم‌ها...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Public Charity Request Form Card — Exact same visual style as custom forms */}
              {(() => {
                const publicSchema = parsePublicFormSchema(config?.publicFormConfig);
                const publicFormUrl =
                  typeof window !== 'undefined' ? `${window.location.origin}/form` : '/form';
                const activeBuiltinCount = [
                  publicSchema.builtin.showName,
                  publicSchema.builtin.showNid,
                  publicSchema.builtin.showPhone,
                  publicSchema.builtin.showBirthDate,
                  publicSchema.builtin.showGuardian,
                  publicSchema.builtin.showDependents,
                  publicSchema.builtin.showHousing,
                  publicSchema.builtin.showCat,
                  publicSchema.builtin.showRequestedAmount,
                  publicSchema.builtin.showDesc,
                  publicSchema.builtin.showAddress,
                ].filter(Boolean).length;
                const customCount = (publicSchema.customFields || []).filter(
                  (f) => f.enabled !== false
                ).length;

                return (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                              {publicSchema.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              فعال
                            </span>
                          </div>
                          {publicSchema.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {publicSchema.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canManageForms && (
                            <button
                              type="button"
                              onClick={() => setEditingPublicForm(true)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="ویرایش فرم و فیلدها"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Direct 1-Click Beneficiary Portal Toggle */}
                      <div
                        className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 transition ${
                          publicSchema.showInBeneficiaryPortal
                            ? 'bg-teal-50/80 border-teal-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          <UserCheck
                            className={`w-4 h-4 shrink-0 ${
                              publicSchema.showInBeneficiaryPortal
                                ? 'text-teal-700'
                                : 'text-slate-400'
                            }`}
                          />
                          <span
                            className={
                              publicSchema.showInBeneficiaryPortal
                                ? 'text-teal-900'
                                : 'text-slate-600'
                            }
                          >
                            {publicSchema.showInBeneficiaryPortal
                              ? 'فعال در پروفایل مددجو'
                              : 'نمایش در پروفایل مددجو غیرفعال است'}
                          </span>
                        </div>

                        {canManageForms && (
                          <button
                            type="button"
                            disabled={togglingPublicPortal}
                            onClick={togglePublicFormInBeneficiaryPortal}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-50 shrink-0 ${
                              publicSchema.showInBeneficiaryPortal
                                ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700'
                                : 'bg-white hover:bg-teal-50 text-teal-800 border-teal-300'
                            }`}
                          >
                            <span>
                              {togglingPublicPortal
                                ? 'در حال تغییر...'
                                : publicSchema.showInBeneficiaryPortal
                                ? 'فعال ✓'
                                : 'فعال‌سازی در پروفایل مددجو'}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Shareable URL */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-slate-600 dir-ltr truncate select-all">
                          {publicFormUrl}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={copyPublicFormUrl}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              copiedPublicForm
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-400 hover:bg-amber-300 text-slate-900'
                            }`}
                          >
                            {copiedPublicForm ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedPublicForm ? 'کپی شد' : 'کپی لینک'}</span>
                          </button>

                          <a
                            href="/form"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-semibold transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>مشاهده</span>
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>فیلدها: {toPersianDigits(activeBuiltinCount + customCount)}</span>
                        <span>•</span>
                        <span>اصلی: {toPersianDigits(activeBuiltinCount)}</span>
                        {customCount > 0 && (
                          <>
                            <span>•</span>
                            <span>سفارشی: {toPersianDigits(customCount)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <HardDrive className="w-3 h-3 text-slate-400" />
                          سقف فایل: {toPersianDigits(publicSchema.maxFileSizeMB || 5)} مگابایت
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      {canManageForms && (
                        <button
                          type="button"
                          onClick={() => setEditingPublicForm(true)}
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>طراحی فیلدها</span>
                        </button>
                      )}
                      {canManageForms && (
                        <button
                          type="button"
                          onClick={openCreateFromPublicTemplate}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>ساخت فرم مشابه</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {forms.map((f) => {
                  const sharePath = `/forms/${f.slug}`;
                  const fullUrl =
                    typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : sharePath;

            return (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                          {f.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            f.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {f.isActive ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                      {f.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {f.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canManageForms && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditForm(f)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="ویرایش فرم و فیلدها"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteForm(f)}
                            className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="حذف فرم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Direct 1-Click Beneficiary Portal Toggle */}
                  <div
                    className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 transition ${
                      f.showInBeneficiaryPortal
                        ? 'bg-teal-50/80 border-teal-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <UserCheck
                        className={`w-4 h-4 shrink-0 ${
                          f.showInBeneficiaryPortal ? 'text-teal-700' : 'text-slate-400'
                        }`}
                      />
                      <span
                        className={
                          f.showInBeneficiaryPortal ? 'text-teal-900' : 'text-slate-600'
                        }
                      >
                        {f.showInBeneficiaryPortal
                          ? 'فعال در پروفایل مددجو'
                          : 'نمایش در پروفایل مددجو غیرفعال است'}
                      </span>
                    </div>

                    {canManageForms && (
                      <button
                        type="button"
                        disabled={togglingFormPortalId === f.id}
                        onClick={() => handleToggleCustomFormPortal(f)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-50 shrink-0 ${
                          f.showInBeneficiaryPortal
                            ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700'
                            : 'bg-white hover:bg-teal-50 text-teal-800 border-teal-300'
                        }`}
                      >
                        <span>
                          {togglingFormPortalId === f.id
                            ? 'در حال تغییر...'
                            : f.showInBeneficiaryPortal
                            ? 'فعال ✓'
                            : 'فعال‌سازی در پروفایل مددجو'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Shareable URL */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-600 dir-ltr truncate select-all">
                      {fullUrl}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyShareUrl(f.slug)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          copiedSlug === f.slug
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-900'
                        }`}
                      >
                        {copiedSlug === f.slug ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedSlug === f.slug ? 'کپی شد' : 'کپی لینک'}</span>
                      </button>

                      <a
                        href={sharePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-semibold transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>مشاهده</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>فیلدها: {toPersianDigits(f.fields?.length || 0)}</span>
                    <span>•</span>
                    <span>
                      پاسخ‌ها: {toPersianDigits(f.submissionsCount || 0)}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <HardDrive className="w-3 h-3 text-slate-400" />
                      سقف فایل: {toPersianDigits(f.maxFileSizeMB || 5)} مگابایت
                    </span>
                    {Array.isArray(f.smsRules) && f.smsRules.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                        <MessageSquare className="w-3 h-3" />
                        {toPersianDigits(f.smsRules.length)} قانون پیامک
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  {canManageForms && (
                    <button
                      type="button"
                      onClick={() => openEditForm(f)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>طراحی فیلدها</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openSubmissions(f)}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>پاسخ‌ها ({toPersianDigits(f.submissionsCount || 0)})</span>
                  </button>
                </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Builder Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingFormId ? 'ویرایش فرم و فیلدهای صفحه اختصاصی' : 'ساخت فرم و صفحه جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditor(false);
                  resetEditor();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-5 text-xs">
              {/* General Info */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  ۱. مشخصات صفحه و لینک اشتراک‌گذاری
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      عنوان صفحه و فرم <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: فرم ثبت‌نام داوطلبین جهادی"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      شناسه لینک اختصاصی / Slug (انگلیسی - اختیاری)
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="مثال: volunteer-form (یا خالی بگذارید)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    توضیحات بالای فرم (اختیاری)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="توضیح مختصر درباره هدف این فرم..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نشان هدر</label>
                    <input
                      type="text"
                      value={heroBadge}
                      onChange={(e) => setHeroBadge(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">متن دکمه ثبت</label>
                    <input
                      type="text"
                      value={submitButtonText}
                      onChange={(e) => setSubmitButtonText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رنگ صفحه</label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none"
                    >
                      {THEME_OPTIONS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    پیام موفقیت پس از ثبت فرم
                  </label>
                  <input
                    type="text"
                    value={successMessage}
                    onChange={(e) => setSuccessMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>فرم فعال و قابل دسترس از طریق لینک باشد</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={showTracking}
                        onChange={(e) => setShowTracking(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>نمایش بخش استعلام با کد پیگیری در صفحه فرم</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-teal-900 font-bold bg-teal-50 border border-teal-200 px-3 py-2 rounded-xl">
                      <input
                        type="checkbox"
                        checked={showInBeneficiaryPortal}
                        onChange={(e) => setShowInBeneficiaryPortal(e.target.checked)}
                        className="rounded text-teal-600"
                      />
                      <span>نمایش و تکمیل/ویرایش در پروفایل مددجو</span>
                    </label>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-center space-y-1.5">
                    <label className="font-bold text-slate-800 block">
                      حداکثر حجم مجاز فایل آپلودی برای این فرم (مگابایت):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={maxFileSizeMB}
                        onChange={(e) =>
                          setMaxFileSizeMB(Math.min(25, Math.max(1, Number(e.target.value) || 5)))
                        }
                        className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 text-center font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-600 font-semibold">مگابایت (مستقل برای این فرم)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fields Designer */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    ۲. طراحی فیلدهای فرم (بخش‌بندی، کد ملی، تاریخ، مبلغ، موبایل، فایل، سلکت‌باکس و موجودیتی)
                  </h4>
                  <button
                    type="button"
                    onClick={applyPublicTemplateToCurrentEditor}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold transition cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>افزودن الگوی کامل فرم درخواست عمومی</span>
                  </button>
                </div>
                <FormFieldsEditor
                  fields={fields}
                  entities={entities}
                  onChange={setFields}
                  onNavigateToEntities={() => {
                    setShowEditor(false);
                    setSubTab('entities');
                  }}
                  emptyText="هنوز فیلدی برای این فرم اضافه نشده است. از فرم بالا فیلدهای مورد نظر خود را اضافه کنید یا روی «افزودن الگوی کامل فرم درخواست عمومی» کلیک نمایید."
                />
              </div>

              {/* Dynamic Per-Form SMS Rules */}
              <FormSmsRulesSection
                fields={fields}
                rules={smsRules}
                onChange={setSmsRules}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditor(false);
                    resetEditor();
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingForm ? 'در حال ذخیره...' : 'ذخیره فرم اختصاصی'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Viewer Modal */}
      {viewingForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  پاسخ‌های ثبت‌شده: {viewingForm.title}
                </h3>
                <p className="text-xs text-slate-500">
                  تعداد کل: {toPersianDigits(submissions.length)} مورد
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportSubmissionsCsv}
                  disabled={submissions.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>خروجی اکسل</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewingForm(null);
                    setSelectedSub(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {subsLoading ? (
              <div className="py-10 text-center text-xs text-slate-500">در حال دریافت پاسخ‌ها...</div>
            ) : submissions.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                هنوز هیچ پاسخی برای این فرم ثبت نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* List */}
                <div className="lg:col-span-2 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {submissions.map((sub) => {
                    const previewItem = (sub.data || []).find((d) => d.value && d.type !== 'entity_list');
                    return (
                      <div
                        key={sub.id}
                        onClick={() => openSubmissionDetail(sub)}
                        className={`p-3 rounded-xl border cursor-pointer transition text-xs space-y-1.5 ${
                          selectedSub?.id === sub.id
                            ? 'border-emerald-500 bg-emerald-50/70'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-slate-800">
                            {sub.trackingCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'APPROVED' || sub.status === 'REVIEWED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'NEEDS_INFO'
                                ? 'bg-blue-100 text-blue-800'
                                : sub.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : sub.status === 'IN_REVIEW'
                                ? 'bg-indigo-100 text-indigo-800'
                                : sub.status === 'ARCHIVED'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {CUSTOM_FORM_STATUS_LABELS[sub.status] || sub.status}
                          </span>
                        </div>
                        {sub.beneficiary && (
                          <div className="text-[11px] text-teal-800 font-semibold flex items-center gap-1">
                            <UserCheck className="w-3 h-3 shrink-0" />
                            <span>
                              {sub.beneficiary.fullName?.trim()
                                ? `${sub.beneficiary.fullName} (${toPersianDigits(sub.beneficiary.phone)})`
                                : toPersianDigits(sub.beneficiary.phone)}
                            </span>
                          </div>
                        )}
                        {previewItem && (
                          <p className="text-[11px] text-slate-600 truncate">
                            {previewItem.label}: {previewItem.value}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Detail */}
                <div className="lg:col-span-3">
                  {!selectedSub ? (
                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl text-xs text-slate-400 p-6 text-center">
                      <Eye className="w-7 h-7 mb-2 text-slate-300" />
                      <span>برای مشاهده جزئیات کامل، فایل‌های پیوست و ارسال پیغام به مددجو، یکی از پاسخ‌ها را انتخاب کنید.</span>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-4 text-xs bg-slate-50/50">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
                        <div className="space-y-0.5">
                          <span className="font-mono font-black text-sm text-slate-900">
                            {selectedSub.trackingCode}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            تاریخ ثبت: {new Date(selectedSub.createdAt).toLocaleString('fa-IR')}
                          </span>
                          {selectedSub.beneficiary && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 text-[11px] font-bold">
                              <UserCheck className="w-3 h-3" />
                              پروفایل مددجو:{' '}
                              {selectedSub.beneficiary.fullName?.trim()
                                ? `${selectedSub.beneficiary.fullName} — `
                                : ''}
                              <span className="font-mono dir-ltr">{selectedSub.beneficiary.phone}</span>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubmission(selectedSub.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          title="حذف این پاسخ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                        {(selectedSub.data || []).map((item, idx) => {
                          const isImgFile =
                            item.type === 'file' &&
                            Boolean(
                              item.mimeType?.startsWith('image/') ||
                                /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileName || item.value || '')
                            );
                          return (
                            <div
                              key={`${item.id}-${idx}`}
                              className="bg-white p-3 rounded-xl border border-slate-200"
                            >
                              <span className="text-[11px] text-slate-500 block mb-1">
                                {item.label}:
                              </span>
                              {item.type === 'entity_list' && Array.isArray(item.items) ? (
                                item.items.length === 0 ? (
                                  <span className="text-slate-400">موردی ثبت نشده</span>
                                ) : (
                                  <div className="space-y-2 mt-1.5">
                                    {item.items.map((row, rIdx) => (
                                      <div
                                        key={rIdx}
                                        className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-2"
                                      >
                                        {Object.entries(row).map(([k, v]) => (
                                          <div key={k}>
                                            <span className="text-[10px] text-slate-500 block">
                                              {k}:
                                            </span>
                                            <span className="font-bold text-slate-900">{v || '-'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                )
                              ) : item.type === 'file' && item.fileUrl ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-lg bg-indigo-50/60 border border-indigo-200">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {isImgFile ? (
                                      <img
                                        src={item.fileUrl}
                                        alt={item.fileName || item.label}
                                        className="w-12 h-12 rounded-lg object-cover border border-indigo-200 bg-white shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5" />
                                      </div>
                                    )}
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
                          );
                        })}
                      </div>

                      {subFeedback && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5 font-semibold">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{subFeedback}</span>
                        </div>
                      )}

                      {/* Review Status & Expert Message Controls */}
                      <div className="pt-3 border-t border-slate-200 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">وضعیت بررسی</label>
                            <select
                              value={subStatusInput}
                              onChange={(e) =>
                                setSubStatusInput(e.target.value as CustomFormSubmissionStatus)
                              }
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none"
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
                              یادداشت کوتاه وضعیت (نمایش در استعلام)
                            </label>
                            <input
                              type="text"
                              value={subNoteInput}
                              onChange={(e) => setSubNoteInput(e.target.value)}
                              placeholder="یادداشت اختیاری..."
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <label className="font-bold text-amber-950 flex items-center gap-1.5">
                              <Bell className="w-3.5 h-3.5 text-amber-600" />
                              <span>پیغام کارشناس برای مددجو (نقص مدارک / اطلاع‌رسانی):</span>
                            </label>
                            {selectedSub.expertMessageAt && (
                              <span className="text-[10px] text-amber-800">
                                آخرین ثبت توسط {selectedSub.expertMessageBy || 'کارشناس'}
                              </span>
                            )}
                          </div>
                          <textarea
                            rows={2}
                            value={subExpertMsgInput}
                            onChange={(e) => setSubExpertMsgInput(e.target.value)}
                            placeholder="مثال: مدارک شما ناقص است و نیاز به بارگذاری تصویر شناسنامه دارید..."
                            className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white outline-none focus:ring-2 focus:ring-amber-500"
                          />

                          {/* Multi-channel delivery toggles */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            {canSendBell && (
                              <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-amber-200 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-800">
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
                              <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-amber-200 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-800">
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
                              <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-amber-200 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-800">
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

                          {/* Strict Approved SMS Template Selector */}
                          {canSendSms && subSendDirectSms && (
                            <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-2">
                              <label className="block text-[11px] font-bold text-emerald-950">
                                انتخاب متن مجاز پیامک (ثبت‌شده توسط مدیر کل):
                              </label>
                              {smsTemplates.length === 0 ? (
                                <p className="text-[11px] text-rose-700 font-semibold">
                                  هنوز هیچ متن پیامک مجازی در پنل پیامک ثبت نشده است.
                                </p>
                              ) : (
                                <>
                                  <select
                                    value={subSmsTemplateId}
                                    onChange={(e) =>
                                      setSubSmsTemplateId(e.target.value ? Number(e.target.value) : '')
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-[11px] font-semibold text-slate-800 outline-none"
                                  >
                                    <option value="">-- یک متن مجاز را انتخاب کنید --</option>
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
                                      <div className="p-2 rounded-lg bg-white border border-emerald-200/80 text-[11px] text-slate-700 leading-relaxed">
                                        <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">
                                          پیش‌نمایش متن پیامک ارسالی (غیرقابل ویرایش دستی):
                                        </span>
                                        {renderSmsTemplatePreview(chosen.body, {
                                          name: selectedSub.beneficiary?.fullName || 'مددجوی گرامی',
                                          trackingCode: selectedSub.trackingCode,
                                          formTitle: viewingForm?.title,
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

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                            <input
                              type="checkbox"
                              checked={subSendSms}
                              onChange={(e) => setSubSendSms(e.target.checked)}
                              className="rounded text-emerald-600"
                            />
                            <span>اجرای قوانین پیامک متصل به رویداد (در صورت تعریف)</span>
                          </label>

                          <button
                            type="button"
                            disabled={savingSub}
                            onClick={handleUpdateSubmission}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                          >
                            {subStatusInput === 'APPROVED' || subStatusInput === 'REVIEWED' ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ) : subStatusInput === 'ARCHIVED' ? (
                              <Archive className="w-3.5 h-3.5 text-slate-300" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>{savingSub ? 'در حال ثبت و ارسال...' : 'ذخیره وضعیت و ارسال پیام'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
