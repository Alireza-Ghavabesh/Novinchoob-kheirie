import { SubmittedCustomFieldValue } from './publicFormConfig';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty';

export type ConditionSource = 'status' | 'field' | 'form' | 'phone' | 'has_expert_message';

export interface ParticipantCondition {
  id: string;
  source: ConditionSource;
  fieldKey?: string; // label or id of submitted form field
  operator: ConditionOperator;
  value: string;
}

export type ProjectRuleEvent =
  | 'PARTICIPANT_REGISTERED'
  | 'PARTICIPANT_UPDATED'
  | 'PARTICIPANT_STATUS_CHANGED';

export interface ProjectNotificationRule {
  id: string;
  title: string;
  isActive: boolean;
  eventType: ProjectRuleEvent;
  conditionLogic: 'AND' | 'OR';
  conditions: ParticipantCondition[];
  sendInApp: boolean;
  sendPush: boolean;
  sendSms: boolean;
  smsTemplateId?: number | null;
  notificationTitle: string;
  notificationMessage: string;
}

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'برابر باشد با',
  not_equals: 'برابر نباشد با',
  contains: 'شامل باشد',
  not_contains: 'شامل نباشد',
  starts_with: 'شروع شود با',
  gt: 'بزرگتر از (عددی)',
  gte: 'بزرگتر یا مساوی (عددی)',
  lt: 'کوچکتر از (عددی)',
  lte: 'کوچکتر یا مساوی (عددی)',
  is_empty: 'خالی باشد',
  is_not_empty: 'خالی نباشد (پر شده باشد)',
};

export const PROJECT_RULE_EVENT_LABELS: Record<ProjectRuleEvent, string> = {
  PARTICIPANT_REGISTERED: 'هنگام ثبت‌نام جدید شرکت‌کننده در پروژه',
  PARTICIPANT_UPDATED: 'هنگام ویرایش فرم توسط شرکت‌کننده',
  PARTICIPANT_STATUS_CHANGED: 'هنگام تغییر وضعیت شرکت‌کننده توسط کارشناس',
};

function normalizeDigitsForCompare(str: string): string {
  return String(str ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim();
}

function extractNumeric(val: string): number | null {
  const clean = normalizeDigitsForCompare(val).replace(/[,،\sتومانریال]/g, '');
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export interface EvaluatableParticipant {
  status: string;
  formId: string;
  formTitle?: string;
  phone?: string | null;
  expertMessage?: string | null;
  data: SubmittedCustomFieldValue[];
}

function getParticipantFieldValue(p: EvaluatableParticipant, cond: ParticipantCondition): string {
  if (cond.source === 'status') {
    return String(p.status || '').trim();
  }
  if (cond.source === 'form') {
    return String(p.formId || '').trim();
  }
  if (cond.source === 'phone') {
    return normalizeDigitsForCompare(String(p.phone || ''));
  }
  if (cond.source === 'has_expert_message') {
    return String(p.expertMessage || '').trim() ? 'YES' : 'NO';
  }
  // source === 'field'
  const key = String(cond.fieldKey || '').trim();
  if (!key) return '';
  const match = (p.data || []).find(
    (d) => d && (d.id === key || d.label === key)
  );
  if (!match) return '';
  if (match.type === 'entity_list' && Array.isArray(match.items)) {
    return match.items
      .map((row) => Object.values(row || {}).join(' '))
      .join(' | ');
  }
  if (match.type === 'file') {
    return match.fileName || match.fileUrl || match.value || '';
  }
  return String(match.value ?? '').trim();
}

export function evaluateSingleCondition(
  p: EvaluatableParticipant,
  cond: ParticipantCondition
): boolean {
  const rawActual = getParticipantFieldValue(p, cond);
  const actualNorm = normalizeDigitsForCompare(rawActual).toLowerCase();
  const targetNorm = normalizeDigitsForCompare(cond.value || '').toLowerCase();

  switch (cond.operator) {
    case 'is_empty':
      return actualNorm === '';
    case 'is_not_empty':
      return actualNorm !== '';
    case 'equals':
      return actualNorm === targetNorm;
    case 'not_equals':
      return actualNorm !== targetNorm;
    case 'contains':
      return targetNorm === '' ? true : actualNorm.includes(targetNorm);
    case 'not_contains':
      return targetNorm === '' ? true : !actualNorm.includes(targetNorm);
    case 'starts_with':
      return targetNorm === '' ? true : actualNorm.startsWith(targetNorm);
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const aNum = extractNumeric(rawActual);
      const tNum = extractNumeric(cond.value || '');
      if (aNum === null || tNum === null) return false;
      if (cond.operator === 'gt') return aNum > tNum;
      if (cond.operator === 'gte') return aNum >= tNum;
      if (cond.operator === 'lt') return aNum < tNum;
      return aNum <= tNum;
    }
    default:
      return true;
  }
}

export function evaluateParticipantConditions(
  p: EvaluatableParticipant,
  conditions: ParticipantCondition[],
  logic: 'AND' | 'OR' = 'AND'
): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  if (logic === 'OR') {
    return conditions.some((c) => evaluateSingleCondition(p, c));
  }
  return conditions.every((c) => evaluateSingleCondition(p, c));
}

export function parseProjectNotificationRules(raw: any): ProjectNotificationRule[] {
  let list = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const validEvents: ProjectRuleEvent[] = [
    'PARTICIPANT_REGISTERED',
    'PARTICIPANT_UPDATED',
    'PARTICIPANT_STATUS_CHANGED',
  ];
  return list
    .filter((r: any) => r && r.id && r.title)
    .map((r: any) => ({
      id: String(r.id),
      title: String(r.title),
      isActive: r.isActive !== false,
      eventType: (validEvents.includes(r.eventType)
        ? r.eventType
        : 'PARTICIPANT_REGISTERED') as ProjectRuleEvent,
      conditionLogic: r.conditionLogic === 'OR' ? 'OR' : 'AND',
      conditions: Array.isArray(r.conditions)
        ? r.conditions.map((c: any, idx: number) => ({
            id: String(c?.id || `cond_${idx}`),
            source: (['status', 'field', 'form', 'phone', 'has_expert_message'].includes(c?.source)
              ? c.source
              : 'status') as ConditionSource,
            fieldKey: c?.fieldKey ? String(c.fieldKey) : undefined,
            operator: (c?.operator || 'equals') as ConditionOperator,
            value: String(c?.value ?? ''),
          }))
        : [],
      sendInApp: Boolean(r.sendInApp),
      sendPush: Boolean(r.sendPush),
      sendSms: Boolean(r.sendSms),
      smsTemplateId: r.smsTemplateId ? Number(r.smsTemplateId) : null,
      notificationTitle: String(r.notificationTitle || ''),
      notificationMessage: String(r.notificationMessage || ''),
    }));
}

export function parseRegistrationFormIds(raw: any): string[] {
  let list = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.map((id) => String(id).trim()).filter(Boolean)));
}
