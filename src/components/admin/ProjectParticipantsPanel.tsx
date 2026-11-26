import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowRight,
  Users,
  Search,
  Download,
  RefreshCw,
  Eye,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Bell,
  Smartphone,
  Send,
  Filter,
  Plus,
  Sparkles,
  Zap,
  Save,
  Copy,
  Check,
  ExternalLink,
  Paperclip,
  Power,
} from 'lucide-react';
import {
  CustomForm,
  CustomFormSubmission,
  LoginPortal,
  Program,
  SmsTemplate,
  StaffUser,
} from '../../types';
import { api } from '../../services/api';
import { CUSTOM_FORM_STATUS_LABELS, SubmittedCustomFieldValue } from '../../utils/publicFormConfig';
import {
  CONDITION_OPERATOR_LABELS,
  ConditionOperator,
  evaluateParticipantConditions,
  ParticipantCondition,
  parseProjectNotificationRules,
  PROJECT_RULE_EVENT_LABELS,
  ProjectNotificationRule,
  ProjectRuleEvent,
} from '../../utils/projectConditions';
import { toPersianDigits } from '../../utils/persian';
import { hasPermission } from '../../utils/permissions';

interface ProjectParticipantsPanelProps {
  program: Program;
  currentUser: StaffUser;
  smsTemplates: SmsTemplate[];
  onBack: () => void;
  onProgramUpdated?: (updated: Program) => void;
}

type SubTab = 'list' | 'bulk' | 'rules';

const STATUS_BADGES: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-800 border-amber-200',
  IN_REVIEW: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  NEEDS_INFO: 'bg-blue-100 text-blue-800 border-blue-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REVIEWED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
};

const OPERATORS_WITHOUT_VALUE: ConditionOperator[] = ['is_empty', 'is_not_empty'];

function extractParticipantName(sub: CustomFormSubmission): string {
  if (sub.beneficiary?.fullName?.trim()) return sub.beneficiary.fullName.trim();
  const field = (sub.data || []).find(
    (f) => /نام|متقاضی|شرکت‌کننده|نام خانوادگی/i.test(String(f.label || '')) && String(f.value || '').trim()
  );
  return field ? String(field.value).trim() : 'بدون نام';
}

function extractParticipantPhone(sub: CustomFormSubmission): string {
  if (sub.beneficiary?.phone?.trim()) return sub.beneficiary.phone.trim();
  const field = (sub.data || []).find(
    (f) =>
      (f.type === 'phone' || /موبایل|تلفن|همراه/i.test(String(f.label || ''))) &&
      String(f.value || '').trim()
  );
  return field ? String(field.value).trim() : '—';
}

function makeEmptyCondition(): ParticipantCondition {
  return {
    id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source: 'status',
    operator: 'equals',
    value: 'APPROVED',
  };
}

export const ProjectParticipantsPanel: React.FC<ProjectParticipantsPanelProps> = ({
  program,
  currentUser,
  smsTemplates,
  onBack,
  onProgramUpdated,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portal, setPortal] = useState<LoginPortal | null>(null);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [participants, setParticipants] = useState<CustomFormSubmission[]>([]);
  const [currentProgram, setCurrentProgram] = useState<Program>(program);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);

  // List filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formFilter, setFormFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Detail & Review Modal
  const [detailSub, setDetailSub] = useState<CustomFormSubmission | null>(null);
  const [editStatus, setEditStatus] = useState('NEW');
  const [editNote, setEditNote] = useState('');
  const [editExpertMsg, setEditExpertMsg] = useState('');
  const [detailSendInApp, setDetailSendInApp] = useState(true);
  const [detailSendSms, setDetailSendSms] = useState(false);
  const [detailSmsTemplateId, setDetailSmsTemplateId] = useState<number | ''>('');
  const [detailSendPush, setDetailSendPush] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState('');

  // Bulk Conditional Notification State
  const [bulkLogic, setBulkLogic] = useState<'AND' | 'OR'>('AND');
  const [bulkConditions, setBulkConditions] = useState<ParticipantCondition[]>([]);
  const [bulkOnlySelected, setBulkOnlySelected] = useState(false);
  const [bulkSendInApp, setBulkSendInApp] = useState(true);
  const [bulkSendSms, setBulkSendSms] = useState(true);
  const [bulkSmsTemplateId, setBulkSmsTemplateId] = useState<number | ''>('');
  const [bulkSendPush, setBulkSendPush] = useState(false);
  const [bulkTitle, setBulkTitle] = useState(`اطلاع‌رسانی پروژه «${program.title}»`);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    matchedCount: number;
    sentInApp: number;
    sentSms: number;
    failedSms: number;
    sentPush: number;
    errors: string[];
  } | null>(null);

  // Automatic Conditional Rules State
  const [rules, setRules] = useState<ProjectNotificationRule[]>(() =>
    parseProjectNotificationRules(program.notificationRules)
  );
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState<ProjectNotificationRule | null>(null);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesFeedback, setRulesFeedback] = useState('');

  const canBell = hasPermission(currentUser, 'sendBeneficiaryBell');
  const canSms = hasPermission(currentUser, 'sendBeneficiarySms');
  const canPush = hasPermission(currentUser, 'sendBeneficiaryPush');

  const activeSmsTemplates = useMemo(
    () => smsTemplates.filter((t) => t.isActive),
    [smsTemplates]
  );

  // Collect all unique form fields across the project's forms & existing submissions
  const availableFormFields = useMemo(() => {
    const map = new Map<string, { id: string; label: string; options?: string[] }>();
    for (const f of forms) {
      for (const fld of f.fields || []) {
        if (!map.has(fld.id)) {
          map.set(fld.id, {
            id: fld.id,
            label: `${fld.label}${forms.length > 1 ? ` (${f.title})` : ''}`,
            options: fld.options,
          });
        }
      }
    }
    for (const p of participants) {
      for (const d of p.data || []) {
        if (d.id && !map.has(d.id)) {
          map.set(d.id, { id: d.id, label: d.label || d.id });
        }
      }
    }
    return Array.from(map.values());
  }, [forms, participants]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getProgramParticipants(program.id);
      setCurrentProgram(res.program);
      setPortal(res.portal || null);
      setForms(res.forms || []);
      setParticipants(res.participants || []);
      setRules(parseProjectNotificationRules(res.program.notificationRules));
    } catch (err: any) {
      setError(err.message || 'خطا در دریافت اطلاعات شرکت‌کنندگان پروژه');
    } finally {
      setLoading(false);
    }
  }, [program.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered participants for List tab
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (formFilter !== 'ALL' && p.formId !== formFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = extractParticipantName(p).toLowerCase();
        const phone = extractParticipantPhone(p).toLowerCase();
        const code = (p.trackingCode || '').toLowerCase();
        const answersText = (p.data || [])
          .map((d) => `${d.label} ${d.value}`)
          .join(' ')
          .toLowerCase();
        if (
          !name.includes(q) &&
          !phone.includes(q) &&
          !code.includes(q) &&
          !answersText.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [participants, statusFilter, formFilter, search]);

  // Live matched participants for Bulk Conditional Send tab
  const bulkMatchedParticipants = useMemo(() => {
    const idSet = bulkOnlySelected && selectedIds.length > 0 ? new Set(selectedIds) : null;
    return participants.filter((p) => {
      if (idSet && !idSet.has(p.id)) return false;
      return evaluateParticipantConditions(p, bulkConditions, bulkLogic);
    });
  }, [participants, bulkConditions, bulkLogic, bulkOnlySelected, selectedIds]);

  const stats = useMemo(() => {
    const total = participants.length;
    const pending = participants.filter((p) => p.status === 'NEW' || p.status === 'IN_REVIEW').length;
    const approved = participants.filter((p) => p.status === 'APPROVED' || p.status === 'REVIEWED').length;
    const needsInfo = participants.filter((p) => p.status === 'NEEDS_INFO').length;
    const rejected = participants.filter((p) => p.status === 'REJECTED').length;
    return { total, pending, approved, needsInfo, rejected };
  }, [participants]);

  const openDetail = (sub: CustomFormSubmission) => {
    setDetailSub(sub);
    setEditStatus(sub.status || 'NEW');
    setEditNote(sub.note || '');
    setEditExpertMsg(sub.expertMessage || '');
    setDetailSendInApp(canBell);
    setDetailSendSms(false);
    setDetailSmsTemplateId(activeSmsTemplates[0]?.id || '');
    setDetailSendPush(false);
    setDetailFeedback('');
  };

  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailSub) return;
    if (detailSendSms && !detailSmsTemplateId) {
      setDetailFeedback('برای ارسال پیامک لطفاً یکی از متن‌های از پیش تعریف‌شده را انتخاب کنید.');
      return;
    }
    setDetailSaving(true);
    setDetailFeedback('');
    try {
      const updated = await api.updateFormSubmission(detailSub.id, {
        status: editStatus,
        note: editNote,
        expertMessage: editExpertMsg,
        sendInApp: detailSendInApp && Boolean(editExpertMsg.trim()),
        sendDirectSms: detailSendSms,
        smsTemplateId: detailSendSms ? Number(detailSmsTemplateId) : null,
        sendPush: detailSendPush && Boolean(editExpertMsg.trim()),
      });
      setParticipants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setDetailSub(updated);
      setDetailFeedback('تغییرات با موفقیت ذخیره و ارسال شد.');
    } catch (err: any) {
      setDetailFeedback(err.message || 'خطا در ذخیره تغییرات');
    } finally {
      setDetailSaving(false);
    }
  };

  const handleDeleteParticipant = async (sub: CustomFormSubmission) => {
    if (!window.confirm(`آیا از حذف ثبت‌نام «${extractParticipantName(sub)}» (${sub.trackingCode}) مطمئن هستید؟`)) {
      return;
    }
    try {
      await api.deleteFormSubmission(sub.id);
      setParticipants((prev) => prev.filter((p) => p.id !== sub.id));
      setSelectedIds((prev) => prev.filter((id) => id !== sub.id));
      if (detailSub?.id === sub.id) setDetailSub(null);
    } catch (err: any) {
      setError(err.message || 'خطا در حذف شرکت‌کننده');
    }
  };

  const handleExportCsv = () => {
    const fieldHeaders = availableFormFields.map((f) => f.label);
    const headers = ['کد پیگیری', 'نام شرکت‌کننده', 'شماره موبایل', 'فرم', 'وضعیت', 'تاریخ ثبت', ...fieldHeaders];
    const rows = filteredParticipants.map((p) => {
      const valById = new Map<string, string>();
      for (const d of p.data || []) {
        valById.set(d.id, String(d.value || ''));
      }
      return [
        p.trackingCode,
        extractParticipantName(p),
        extractParticipantPhone(p),
        p.formTitle || '',
        CUSTOM_FORM_STATUS_LABELS[p.status] || p.status,
        new Date(p.createdAt).toLocaleDateString('fa-IR'),
        ...availableFormFields.map((f) => valById.get(f.id) || ''),
      ];
    });
    const escapeCell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants-project-${program.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkResult(null);
    setError('');

    if (bulkMatchedParticipants.length === 0) {
      setError('هیچ شرکت‌کننده‌ای با شروط فعلی مطابقت ندارد.');
      return;
    }
    if (!bulkSendInApp && !bulkSendSms && !bulkSendPush) {
      setError('لطفاً حداقل یکی از کانال‌های ارسال (اعلان کارتابل، پیامک یا پوش نوتیفیکیشن) را فعال کنید.');
      return;
    }
    if (bulkSendSms && !bulkSmsTemplateId) {
      setError('برای ارسال پیامک، انتخاب یکی از قالب‌های پیامکی از پیش تعریف‌شده الزامی است.');
      return;
    }
    if ((bulkSendInApp || bulkSendPush) && !bulkMessage.trim() && !bulkSendSms) {
      setError('لطفاً متن اعلان / پوش نوتیفیکیشن را وارد نمایید.');
      return;
    }

    if (
      !window.confirm(
        `آیا از ارسال پیام به ${toPersianDigits(bulkMatchedParticipants.length)} شرکت‌کننده منطبق با شروط مطمئن هستید؟`
      )
    ) {
      return;
    }

    setBulkSending(true);
    try {
      const res = await api.bulkNotifyProgramParticipants(program.id, {
        conditions: bulkConditions,
        logic: bulkLogic,
        submissionIds: bulkOnlySelected && selectedIds.length > 0 ? selectedIds : undefined,
        sendInApp: bulkSendInApp && canBell,
        sendSms: bulkSendSms && canSms,
        smsTemplateId: bulkSendSms ? Number(bulkSmsTemplateId) : null,
        sendPush: bulkSendPush && canPush,
        title: bulkTitle.trim() || `اطلاع‌رسانی پروژه «${currentProgram.title}»`,
        message: bulkMessage.trim(),
      });
      setBulkResult(res);
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال گروهی');
    } finally {
      setBulkSending(false);
    }
  };

  // Automatic Rules Handlers
  const openAddRule = () => {
    setRuleDraft({
      id: `rule-${Date.now()}`,
      title: '',
      isActive: true,
      eventType: 'PARTICIPANT_REGISTERED',
      conditionLogic: 'AND',
      conditions: [],
      sendInApp: true,
      sendSms: true,
      smsTemplateId: activeSmsTemplates[0]?.id || null,
      sendPush: false,
      notificationTitle: `اطلاع‌رسانی ${currentProgram.title}`,
      notificationMessage: '',
    });
    setRuleModalOpen(true);
  };

  const openEditRule = (rule: ProjectNotificationRule) => {
    setRuleDraft({ ...rule, conditions: rule.conditions.map((c) => ({ ...c })) });
    setRuleModalOpen(true);
  };

  const persistRules = async (nextRules: ProjectNotificationRule[]) => {
    setRulesSaving(true);
    setRulesFeedback('');
    try {
      const updated = await api.updateProgram(program.id, {
        notificationRules: nextRules,
      });
      setRules(nextRules);
      setCurrentProgram(updated);
      onProgramUpdated?.(updated);
      setRulesFeedback('قوانین هوشمند پروژه با موفقیت ذخیره شد.');
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره قوانین پروژه');
    } finally {
      setRulesSaving(false);
    }
  };

  const handleSaveRuleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleDraft) return;
    if (!ruleDraft.title.trim()) {
      setError('عنوان قانون الزامی است.');
      return;
    }
    if (ruleDraft.sendSms && !ruleDraft.smsTemplateId) {
      setError('برای قانون پیامکی باید یک قالب پیامک از پیش تعریف‌شده انتخاب کنید.');
      return;
    }
    const exists = rules.some((r) => r.id === ruleDraft.id);
    const nextRules = exists
      ? rules.map((r) => (r.id === ruleDraft.id ? ruleDraft : r))
      : [ruleDraft, ...rules];
    await persistRules(nextRules);
    setRuleModalOpen(false);
    setRuleDraft(null);
  };

  const handleToggleRule = async (ruleId: string) => {
    const nextRules = rules.map((r) => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r));
    await persistRules(nextRules);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('آیا از حذف این قانون خودکار مطمئن هستید؟')) return;
    const nextRules = rules.filter((r) => r.id !== ruleId);
    await persistRules(nextRules);
  };

  const renderConditionEditor = (
    conditions: ParticipantCondition[],
    onChange: (next: ParticipantCondition[]) => void
  ) => (
    <div className="space-y-2.5">
      {conditions.length === 0 ? (
        <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-500 text-center">
          بدون شرط (شامل همه شرکت‌کنندگان این پروژه می‌شود). برای فیلتر کردن بر اساس وضعیت یا پاسخ هر فیلد فرم، دکمه «افزودن شرط» را بزنید.
        </div>
      ) : (
        conditions.map((cond, idx) => {
          const selectedFormField = availableFormFields.find((f) => f.id === cond.fieldKey);
          const needsValue = !OPERATORS_WITHOUT_VALUE.includes(cond.operator);

          return (
            <div
              key={cond.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
            >
              {/* Source */}
              <div className="md:col-span-3">
                <select
                  value={cond.source}
                  onChange={(e) => {
                    const nextSource = e.target.value as ParticipantCondition['source'];
                    const next = [...conditions];
                    next[idx] = {
                      ...cond,
                      source: nextSource,
                      fieldKey:
                        nextSource === 'field'
                          ? availableFormFields[0]?.id || ''
                          : undefined,
                      value:
                        nextSource === 'status'
                          ? 'APPROVED'
                          : nextSource === 'has_expert_message'
                          ? 'YES'
                          : '',
                    };
                    onChange(next);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold outline-none"
                >
                  <option value="status">وضعیت ثبت‌نام</option>
                  <option value="field">پاسخ فیلد فرم</option>
                  <option value="form">نوع فرم ثبت‌شده</option>
                  <option value="phone">شماره موبایل</option>
                  <option value="has_expert_message">وضعیت پیغام کارشناس</option>
                </select>
              </div>

              {/* Field selector when source === field */}
              {cond.source === 'field' && (
                <div className="md:col-span-3">
                  <select
                    value={cond.fieldKey || ''}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = {
                        ...cond,
                        fieldKey: e.target.value,
                      };
                      onChange(next);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                  >
                    <option value="">-- انتخاب فیلد فرم --</option>
                    {availableFormFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Operator */}
              <div className={cond.source === 'field' ? 'md:col-span-2' : 'md:col-span-4'}>
                <select
                  value={cond.operator}
                  onChange={(e) => {
                    const next = [...conditions];
                    next[idx] = { ...cond, operator: e.target.value as ConditionOperator };
                    onChange(next);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                >
                  {(Object.keys(CONDITION_OPERATOR_LABELS) as ConditionOperator[]).map((op) => (
                    <option key={op} value={op}>
                      {CONDITION_OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value */}
              <div className={cond.source === 'field' ? 'md:col-span-3' : 'md:col-span-4'}>
                {!needsValue ? (
                  <span className="text-[11px] text-slate-400 px-2">بدون نیاز به مقدار</span>
                ) : cond.source === 'status' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...cond, value: e.target.value };
                      onChange(next);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                  >
                    {Object.entries(CUSTOM_FORM_STATUS_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                ) : cond.source === 'has_expert_message' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...cond, value: e.target.value };
                      onChange(next);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                  >
                    <option value="YES">دارد</option>
                    <option value="NO">ندارد</option>
                  </select>
                ) : cond.source === 'form' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...cond, value: e.target.value };
                      onChange(next);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                  >
                    <option value="">-- انتخاب فرم --</option>
                    {forms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                ) : selectedFormField?.options && selectedFormField.options.length > 0 ? (
                  <select
                    value={cond.value}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...cond, value: e.target.value };
                      onChange(next);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                  >
                    <option value="">-- انتخاب گزینه --</option>
                    {selectedFormField.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...cond, value: e.target.value };
                      onChange(next);
                    }}
                    placeholder="مقدار مقایسه..."
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs outline-none"
                  />
                )}
              </div>

              {/* Remove condition */}
              <div className="md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => onChange(conditions.filter((c) => c.id !== cond.id))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="حذف شرط"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })
      )}

      <button
        type="button"
        onClick={() => onChange([...conditions, makeEmptyCondition()])}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>افزودن شرط جدید</span>
      </button>
    </div>
  );

  const selectedBulkTemplate = activeSmsTemplates.find((t) => t.id === Number(bulkSmsTemplateId));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به پروژه‌ها</span>
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>شرکت‌کنندگان پروژه: {currentProgram.title}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                مشاهده ثبت‌نام‌ها، بررسی وضعیت و ارسال پیامک از پیش تعریف‌شده، اعلان کارتابل و پوش نوتیفیکیشن با شروط دلخواه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {portal && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-900">لینک ورود:</span>
                <code className="font-mono text-emerald-700 dir-ltr">/p/{portal.slug}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${origin}/p/${portal.slug}`);
                    setCopiedPortalLink(true);
                    setTimeout(() => setCopiedPortalLink(false), 1800);
                  }}
                  className="p-1 rounded hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                  title="کپی لینک"
                >
                  {copiedPortalLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`${origin}/p/${portal.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-emerald-100 text-emerald-700"
                  title="باز کردن صفحه ورود اختصاصی"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSubTab('list')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'list'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>فهرست شرکت‌کنندگان ({toPersianDigits(participants.length)})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('bulk')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'bulk'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>ارسال گروهی و شرطی پیامک / اعلان / پوش</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('rules')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'rules'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>قوانین خودکار شرطی ({toPersianDigits(rules.length)})</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUBTAB 1: PARTICIPANTS LIST */}
      {subTab === 'list' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <span className="text-[11px] font-bold text-slate-500 block">کل شرکت‌کنندگان</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {toPersianDigits(stats.total)}
              </span>
            </div>
            <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-4">
              <span className="text-[11px] font-bold text-amber-800 block">جدید / در حال بررسی</span>
              <span className="text-xl font-black text-amber-900 mt-1 block">
                {toPersianDigits(stats.pending)}
              </span>
            </div>
            <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4">
              <span className="text-[11px] font-bold text-emerald-800 block">تأیید شده</span>
              <span className="text-xl font-black text-emerald-900 mt-1 block">
                {toPersianDigits(stats.approved)}
              </span>
            </div>
            <div className="bg-blue-50/70 rounded-2xl border border-blue-200 p-4">
              <span className="text-[11px] font-bold text-blue-800 block">نقص مدارک</span>
              <span className="text-xl font-black text-blue-900 mt-1 block">
                {toPersianDigits(stats.needsInfo)}
              </span>
            </div>
            <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-4">
              <span className="text-[11px] font-bold text-rose-800 block">رد شده</span>
              <span className="text-xl font-black text-rose-900 mt-1 block">
                {toPersianDigits(stats.rejected)}
              </span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[210px]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو در نام، موبایل، کد پیگیری یا پاسخ‌های فرم..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white outline-none"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                {Object.entries(CUSTOM_FORM_STATUS_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>

              {forms.length > 1 && (
                <select
                  value={formFilter}
                  onChange={(e) => setFormFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white outline-none"
                >
                  <option value="ALL">همه فرم‌های پروژه</option>
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBulkOnlySelected(true);
                    setSubTab('bulk');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال پیام به {toPersianDigits(selectedIds.length)} منتخب</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredParticipants.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>خروجی اکسل (CSV)</span>
              </button>
            </div>
          </div>

          {/* Participants Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">در حال بارگذاری شرکت‌کنندگان...</div>
            ) : filteredParticipants.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  {participants.length === 0
                    ? 'هنوز هیچ شرکت‌کننده‌ای در این پروژه ثبت‌نام نکرده است'
                    : 'شرکت‌کننده‌ای با فیلتر انتخاب‌شده یافت نشد'}
                </p>
                {!portal && participants.length === 0 && (
                  <p className="text-xs text-slate-500">
                    برای ثبت‌نام خودکار شرکت‌کنندگان، این پروژه را در بخش ویرایش به یک «صفحه ورود اختصاصی» و «فرم ثبت‌نام» متصل نمایید.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={
                            filteredParticipants.length > 0 &&
                            filteredParticipants.every((p) => selectedIds.includes(p.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(filteredParticipants.map((p) => p.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          className="rounded text-emerald-600"
                        />
                      </th>
                      <th className="p-3 font-bold">شرکت‌کننده</th>
                      <th className="p-3 font-bold">موبایل</th>
                      <th className="p-3 font-bold">کد پیگیری</th>
                      {forms.length > 1 && <th className="p-3 font-bold">فرم</th>}
                      <th className="p-3 font-bold">خلاصه پاسخ‌ها</th>
                      <th className="p-3 font-bold">وضعیت</th>
                      <th className="p-3 font-bold">تاریخ ثبت</th>
                      <th className="p-3 font-bold text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParticipants.map((sub) => {
                      const name = extractParticipantName(sub);
                      const phone = extractParticipantPhone(sub);
                      const previewFields = (sub.data || [])
                        .filter((d) => d.value && d.type !== 'file' && d.type !== 'entity_select')
                        .slice(0, 2);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(sub.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds((prev) => [...prev, sub.id]);
                                } else {
                                  setSelectedIds((prev) => prev.filter((id) => id !== sub.id));
                                }
                              }}
                              className="rounded text-emerald-600"
                            />
                          </td>
                          <td className="p-3 font-bold text-slate-900">{name}</td>
                          <td className="p-3 font-mono dir-ltr text-right text-slate-700">
                            {phone}
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                              {sub.trackingCode}
                            </span>
                          </td>
                          {forms.length > 1 && (
                            <td className="p-3 text-slate-600">{sub.formTitle || '—'}</td>
                          )}
                          <td className="p-3 max-w-[240px]">
                            <div className="space-y-0.5 text-[11px] text-slate-600 truncate">
                              {previewFields.length === 0 ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                previewFields.map((f, i) => (
                                  <div key={i} className="truncate">
                                    <span className="font-semibold text-slate-700">{f.label}: </span>
                                    <span>{f.value}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                                STATUS_BADGES[sub.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {CUSTOM_FORM_STATUS_LABELS[sub.status] || sub.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">
                            {new Date(sub.createdAt).toLocaleDateString('fa-IR')}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openDetail(sub)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>بررسی و پیام</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteParticipant(sub)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="حذف ثبت‌نام"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: CONDITIONAL BULK SMS / BELL / PUSH */}
      {subTab === 'bulk' && (
        <form onSubmit={handleBulkSend} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-5">
            {/* Condition Builder Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    ۱. تعریف شروط انتخاب شرکت‌کنندگان
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">منطق ترکیب شروط:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setBulkLogic('AND')}
                      className={`px-2.5 py-1 font-bold cursor-pointer ${
                        bulkLogic === 'AND' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      همه شروط (و)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkLogic('OR')}
                      className={`px-2.5 py-1 font-bold cursor-pointer ${
                        bulkLogic === 'OR' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      حداقل یک شرط (یا)
                    </button>
                  </div>
                </div>
              </div>

              {selectedIds.length > 0 && (
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkOnlySelected}
                    onChange={(e) => setBulkOnlySelected(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-bold text-indigo-900">
                    فقط در میان {toPersianDigits(selectedIds.length)} شرکت‌کننده انتخاب‌شده از جدول اعمال شود
                  </span>
                </label>
              )}

              {renderConditionEditor(bulkConditions, setBulkConditions)}
            </div>

            {/* Channels & Predefined SMS Template Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  ۲. کانال‌های ارسال و انتخاب پیامک از پیش تعریف‌شده
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition ${
                    bulkSendSms && canSms
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  } ${!canSms ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    disabled={!canSms}
                    checked={bulkSendSms && canSms}
                    onChange={(e) => setBulkSendSms(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>پیامک (قالب مجاز)</span>
                </label>

                <label
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition ${
                    bulkSendInApp && canBell
                      ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  } ${!canBell ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    disabled={!canBell}
                    checked={bulkSendInApp && canBell}
                    onChange={(e) => setBulkSendInApp(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>اعلان در زنگوله کارتابل</span>
                </label>

                <label
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition ${
                    bulkSendPush && canPush
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  } ${!canPush ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    disabled={!canPush}
                    checked={bulkSendPush && canPush}
                    onChange={(e) => setBulkSendPush(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>پوش نوتیفیکیشن</span>
                </label>
              </div>

              {bulkSendSms && canSms && (
                <div className="space-y-2 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <label className="block text-xs font-bold text-emerald-950">
                    انتخاب قالب پیامک از پیش تعریف‌شده (بانک متن‌های مجاز) *
                  </label>
                  <select
                    value={bulkSmsTemplateId}
                    onChange={(e) =>
                      setBulkSmsTemplateId(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-semibold outline-none"
                  >
                    <option value="">-- یک قالب پیامک مجاز انتخاب کنید --</option>
                    {activeSmsTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                  {selectedBulkTemplate && (
                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                      <span className="font-bold text-emerald-800 block mb-1">پیش‌نمایش متن قالب:</span>
                      {selectedBulkTemplate.body}
                    </div>
                  )}
                  {activeSmsTemplates.length === 0 && (
                    <p className="text-[11px] text-rose-700 font-semibold">
                      هیچ متن پیامک مجازی در تب «پیامک» تعریف نشده است؛ ابتدا در بخش مدیریت پیامک یک قالب مجاز بسازید.
                    </p>
                  )}
                </div>
              )}

              {(bulkSendInApp || bulkSendPush) && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      عنوان اعلان کارتابل / پوش نوتیفیکیشن
                    </label>
                    <input
                      type="text"
                      value={bulkTitle}
                      onChange={(e) => setBulkTitle(e.target.value)}
                      placeholder={`مثلاً: اطلاعیه مهم ${currentProgram.title}`}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      متن اعلان در زنگوله و پوش نوتیفیکیشن
                    </label>
                    <textarea
                      rows={3}
                      value={bulkMessage}
                      onChange={(e) => setBulkMessage(e.target.value)}
                      placeholder="متن اطلاعیه را بنویسید (اگر خالی باشد و پیامک انتخاب شده باشد، متن قالب پیامک در اعلان کارتابل نیز ثبت می‌شود)."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={bulkSending || bulkMatchedParticipants.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {bulkSending
                    ? 'در حال ارسال گروهی...'
                    : `ارسال برای ${toPersianDigits(bulkMatchedParticipants.length)} شرکت‌کننده منطبق`}
                </span>
              </button>

              {bulkResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs space-y-1.5">
                  <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>گزارش ارسال گروهی ({toPersianDigits(bulkResult.matchedCount)} مخاطب)</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-emerald-900 font-semibold">
                    <span>اعلان کارتابل: {toPersianDigits(bulkResult.sentInApp)}</span>
                    <span>پیامک موفق: {toPersianDigits(bulkResult.sentSms)}</span>
                    {bulkResult.failedSms > 0 && (
                      <span className="text-rose-700">
                        پیامک ناموفق: {toPersianDigits(bulkResult.failedSms)}
                      </span>
                    )}
                    <span>پوش نوتیفیکیشن: {toPersianDigits(bulkResult.sentPush)}</span>
                  </div>
                  {bulkResult.errors.length > 0 && (
                    <ul className="text-[11px] text-rose-700 list-disc pr-4 pt-1">
                      {bulkResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live Preview of Matched Participants (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 sticky top-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>پیش‌نمایش مخاطبان منطبق با شروط</span>
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                  {toPersianDigits(bulkMatchedParticipants.length)} نفر
                </span>
              </div>

              <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {bulkMatchedParticipants.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    هیچ شرکت‌کننده‌ای با شروط فعلی مطابقت ندارد.
                  </div>
                ) : (
                  bulkMatchedParticipants.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">
                          {extractParticipantName(p)}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dir-ltr inline-block">
                          {extractParticipantPhone(p)}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${
                          STATUS_BADGES[p.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {CUSTOM_FORM_STATUS_LABELS[p.status] || p.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SUBTAB 3: AUTOMATIC CONDITIONAL PROJECT RULES */}
      {subTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>قوانین ارسال خودکار پیامک، اعلان و پوش برای این پروژه</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                با تعریف قانون، به محض ثبت‌نام شرکت‌کننده، ویرایش فرم یا تغییر وضعیت او، در صورت برقراری شروط، پیامک از پیش تعریف‌شده و اعلان به‌صورت خودکار ارسال می‌شود.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddRule}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن قانون هوشمند</span>
            </button>
          </div>

          {rulesFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              {rulesFeedback}
            </div>
          )}

          {rules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
              <Zap className="w-9 h-9 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">هنوز قانون خودکاری تعریف نشده است</p>
              <p className="text-xs text-slate-500">
                مثلاً: «وقتی وضعیت شرکت‌کننده تأیید شد و رشته انتخابی حفظ قرآن بود، پیامک خوش‌آمدگویی ارسال شود».
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => {
                const tpl = smsTemplates.find((t) => t.id === rule.smsTemplateId);
                return (
                  <div
                    key={rule.id}
                    className={`bg-white rounded-2xl border p-4 shadow-sm space-y-3 ${
                      rule.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{rule.title}</h4>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 text-[11px] font-bold">
                          رویداد: {PROJECT_RULE_EVENT_LABELS[rule.eventType]}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={rulesSaving}
                        onClick={() => handleToggleRule(rule.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          rule.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{rule.isActive ? 'فعال' : 'غیرفعال'}</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div>
                        <span className="font-bold text-slate-700">تعداد شروط: </span>
                        {rule.conditions.length === 0
                          ? 'همه شرکت‌کنندگان'
                          : `${toPersianDigits(rule.conditions.length)} شرط (${rule.conditionLogic === 'OR' ? 'یا' : 'و'})`}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rule.sendSms && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                            پیامک: {tpl?.title || 'قالب انتخاب‌شده'}
                          </span>
                        )}
                        {rule.sendInApp && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold">
                            اعلان کارتابل
                          </span>
                        )}
                        {rule.sendPush && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold">
                            پوش نوتیفیکیشن
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditRule(rule)}
                        className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DETAIL & REVIEW MODAL */}
      {detailSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  پرونده شرکت‌کننده: {extractParticipantName(detailSub)}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {detailSub.trackingCode} — {extractParticipantPhone(detailSub)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailSub(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              {/* Submitted Answers */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-700">اطلاعات ثبت‌شده در فرم:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(detailSub.data || []).map((item: SubmittedCustomFieldValue, idx: number) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                    >
                      <span className="font-bold text-slate-500 block text-[11px]">
                        {item.label}
                      </span>
                      {item.fileUrl ? (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-700 font-bold hover:underline"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{item.fileName || 'مشاهده فایل پیوست'}</span>
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-900 whitespace-pre-wrap block">
                          {item.value || '—'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status & Direct Notification Form */}
              <form onSubmit={handleSaveDetail} className="space-y-4 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت ثبت‌نام</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none"
                    >
                      {Object.entries(CUSTOM_FORM_STATUS_LABELS).map(([k, lbl]) => (
                        <option key={k} value={k}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">یادداشت داخلی کارشناس</label>
                    <input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="یادداشت مدیریتی (اختیاری)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    پیام قابل نمایش برای شرکت‌کننده (در کارتابل / زنگوله / پوش)
                  </label>
                  <textarea
                    rows={3}
                    value={editExpertMsg}
                    onChange={(e) => setEditExpertMsg(e.target.value)}
                    placeholder="پیام یا راهنمایی برای شرکت‌کننده بنویسید..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap gap-3 text-xs">
                  <label className={`inline-flex items-center gap-1.5 cursor-pointer ${!canBell ? 'opacity-40' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={!canBell}
                      checked={detailSendInApp && canBell}
                      onChange={(e) => setDetailSendInApp(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span className="font-bold text-slate-700">ارسال به زنگوله کارتابل</span>
                  </label>
                  <label className={`inline-flex items-center gap-1.5 cursor-pointer ${!canSms ? 'opacity-40' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={!canSms}
                      checked={detailSendSms && canSms}
                      onChange={(e) => setDetailSendSms(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span className="font-bold text-slate-700">ارسال پیامک (از متن‌های مجاز)</span>
                  </label>
                  <label className={`inline-flex items-center gap-1.5 cursor-pointer ${!canPush ? 'opacity-40' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={!canPush}
                      checked={detailSendPush && canPush}
                      onChange={(e) => setDetailSendPush(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-bold text-slate-700">ارسال پوش نوتیفیکیشن</span>
                  </label>
                </div>

                {detailSendSms && canSms && (
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 mb-1">
                      انتخاب قالب پیامک از پیش تعریف‌شده
                    </label>
                    <select
                      value={detailSmsTemplateId}
                      onChange={(e) =>
                        setDetailSmsTemplateId(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/50 text-xs font-semibold outline-none"
                    >
                      <option value="">-- انتخاب قالب مجاز --</option>
                      {activeSmsTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {detailFeedback && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    {detailFeedback}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDetailSub(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    بستن
                  </button>
                  <button
                    type="submit"
                    disabled={detailSaving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{detailSaving ? 'در حال ذخیره...' : 'ذخیره وضعیت و ارسال'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RULE CREATE / EDIT MODAL */}
      {ruleModalOpen && ruleDraft && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>تنظیم قانون خودکار پیامک و اعلان پروژه</span>
              </h3>
              <button
                type="button"
                onClick={() => setRuleModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleDraft} className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان قانون *</label>
                  <input
                    type="text"
                    required
                    value={ruleDraft.title}
                    onChange={(e) => setRuleDraft({ ...ruleDraft, title: e.target.value })}
                    placeholder="مثلاً: پیامک تأیید ثبت‌نام دوره قرآن"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">زمان اجرا (رویداد)</label>
                  <select
                    value={ruleDraft.eventType}
                    onChange={(e) =>
                      setRuleDraft({ ...ruleDraft, eventType: e.target.value as ProjectRuleEvent })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white outline-none"
                  >
                    {(Object.keys(PROJECT_RULE_EVENT_LABELS) as ProjectRuleEvent[]).map((ev) => (
                      <option key={ev} value={ev}>
                        {PROJECT_RULE_EVENT_LABELS[ev]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">شروط اجرای قانون</span>
                  <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRuleDraft({ ...ruleDraft, conditionLogic: 'AND' })}
                      className={`px-2 py-1 font-bold cursor-pointer ${
                        ruleDraft.conditionLogic === 'AND' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      همه شروط (و)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleDraft({ ...ruleDraft, conditionLogic: 'OR' })}
                      className={`px-2 py-1 font-bold cursor-pointer ${
                        ruleDraft.conditionLogic === 'OR' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      حداقل یک شرط (یا)
                    </button>
                  </div>
                </div>
                {renderConditionEditor(ruleDraft.conditions, (nextConds) =>
                  setRuleDraft({ ...ruleDraft, conditions: nextConds })
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block">کانال‌های ارسال خودکار</span>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ruleDraft.sendSms}
                      onChange={(e) => setRuleDraft({ ...ruleDraft, sendSms: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span className="font-bold text-slate-700">ارسال پیامک (قالب مجاز)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ruleDraft.sendInApp}
                      onChange={(e) => setRuleDraft({ ...ruleDraft, sendInApp: e.target.checked })}
                      className="rounded text-amber-600"
                    />
                    <span className="font-bold text-slate-700">اعلان در زنگوله کارتابل</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ruleDraft.sendPush}
                      onChange={(e) => setRuleDraft({ ...ruleDraft, sendPush: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-bold text-slate-700">ارسال پوش نوتیفیکیشن</span>
                  </label>
                </div>

                {ruleDraft.sendSms && (
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 mb-1">
                      قالب پیامک از پیش تعریف‌شده *
                    </label>
                    <select
                      value={ruleDraft.smsTemplateId || ''}
                      onChange={(e) =>
                        setRuleDraft({
                          ...ruleDraft,
                          smsTemplateId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/40 text-xs outline-none"
                    >
                      <option value="">-- انتخاب قالب پیامک مجاز --</option>
                      {activeSmsTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(ruleDraft.sendInApp || ruleDraft.sendPush) && (
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      value={ruleDraft.notificationTitle}
                      onChange={(e) =>
                        setRuleDraft({ ...ruleDraft, notificationTitle: e.target.value })
                      }
                      placeholder="عنوان اعلان در زنگوله / پوش"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none"
                    />
                    <textarea
                      rows={2}
                      value={ruleDraft.notificationMessage}
                      onChange={(e) =>
                        setRuleDraft({ ...ruleDraft, notificationMessage: e.target.value })
                      }
                      placeholder="متن اعلان (می‌توانید از متغیرهای {name}، {trackingCode}، {programTitle} و {status} استفاده کنید)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={rulesSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{rulesSaving ? 'در حال ذخیره...' : 'ذخیره قانون'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
