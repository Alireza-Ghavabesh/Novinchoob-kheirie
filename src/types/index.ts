export interface AppConfig {
  id: number;
  instName: string;
  automationTitle: string;
  logoDataUrl: string | null;
  phone: string;
  address: string;
  notice: string;
  loginTitle?: string;
  loginSubtitle?: string;
  loginWelcomeNote?: string;
  loginFooterText?: string;
  loginTheme?: 'emerald' | 'teal' | 'slate' | 'amber' | 'indigo' | string;
  loginBgDataUrl?: string | null;
  loginShowLogo?: boolean;
  loginAllowPassword?: boolean;
  loginAllowOtp?: boolean;
  loginShowBackLink?: boolean;
  appDomain?: string;
  publicFormConfig?: string;
  adminLoginSlug?: string;
  beneficiaryLoginSlug?: string;
  hideAdminLoginButton?: boolean;
  beneficiaryLoginConfig?: string;
  programFormConfig?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface BeneficiaryRequest {
  id: number;
  trackingCode: string;
  name: string;
  nid: string;
  phone: string;
  birthDate: string;
  guardian: string;
  dependents: number;
  housing: string;
  cat: string;
  requestedAmount: number;
  approvedAmount: number;
  desc: string;
  address: string;
  status: 'PENDING' | 'APPROVED' | 'NEEDS_INFO' | 'REJECTED';
  note?: string | null;
  approvedDate?: string | null;
  approvedBy?: string | null;
  customFields?: string | null;
  beneficiaryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramLog {
  id: number;
  programId: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface Program {
  id: number;
  title: string;
  cat: string;
  requestedBudget: number;
  approvedBudget: number;
  volunteers: number;
  roles?: string | null;
  desc: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';
  pipelineStage: number; // 1: تدوین، 2: تصویب، 3: اجرا، 4: بهره‌برداری
  progressPercent: number; // 0 to 100
  approvedDate?: string | null;
  approvedBy?: string | null;
  customFields?: string | null;
  fieldSchema?: string | null;
  logs: ProgramLog[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissions {
  // متقاضیان و کارتابل
  viewInbox?: boolean;
  createRequest?: boolean;
  decideInbox?: boolean;
  deleteInbox?: boolean;
  exportInbox?: boolean;
  // ارتباط با مددجو و اعلانات
  sendBeneficiaryBell?: boolean;
  sendBeneficiarySms?: boolean;
  sendBeneficiaryPush?: boolean;
  // فرم‌ساز و موجودیت‌ها
  viewForms?: boolean;
  manageForms?: boolean;
  // طرح‌ها و برنامه‌ها
  viewProg?: boolean;
  createProg?: boolean;
  decideProg?: boolean;
  // مالی و تقویم
  viewFin?: boolean;
  viewCalendar?: boolean;
  // پیامک و قالب‌های مجاز
  manageSms?: boolean;
  manageSmsTemplates?: boolean;
  // کاربران و تنظیمات
  manageUsers?: boolean;
  manageSettings?: boolean;
}

export interface SmsTemplate {
  id: number;
  title: string;
  body: string;
  category: string;
  isActive: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmsConfig {
  id: number;
  apiKey: string;
  senderLine: string;
  provider: 'GHASEDAK' | 'CUSTOM';
  loginOtpTemplate?: string;
  loginOtpMessage?: string;
  isEnabled: boolean;
  updatedAt?: string;
}

export type SmsEventType = 
  | 'REQUEST_CREATED'
  | 'REQUEST_STATUS_CHANGED'
  | 'PROGRAM_CREATED'
  | 'PROGRAM_STATUS_CHANGED'
  | 'USER_LOGIN'
  | 'PASSWORD_RESET';

export type SmsTargetType =
  | 'BENEFICIARY'
  | 'ADMINS'
  | 'SPECIFIC_NUMBERS'
  | 'PROGRAM_OWNER';

export interface SmsRule {
  id: number;
  title: string;
  eventType: SmsEventType;
  triggerStatus?: string | null; // e.g. PENDING, APPROVED, NEEDS_INFO, REJECTED, ALL
  userFilter?: string | null; // username or 'ALL'
  targetType: SmsTargetType;
  customNumbers?: string | null;
  templateType: 'SIMPLE' | 'OTP';
  templateName?: string | null;
  templateParam1?: string | null;
  templateParam2?: string | null;
  templateParam3?: string | null;
  messageBody: string;
  sendPush?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PushDevice {
  id: number;
  username: string;
  userAgent?: string;
  createdAt: string;
}

export interface SmsLog {
  id: number;
  ruleTitle?: string | null;
  eventType: string;
  receptor: string;
  message: string;
  status: 'SUCCESS' | 'FAILED' | 'SIMULATED';
  providerMsgId?: string | null;
  cost?: number | null;
  errorDetails?: string | null;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  username: string;
  name: string;
  phone?: string | null;
  role: string;
  perms: UserPermissions;
  isActive?: boolean;
  createdAt?: string;
}

export interface PasswordResetRecord {
  id: number;
  username: string;
  name?: string | null;
  status: 'PENDING' | 'RESOLVED';
  requestDate: string;
  note?: string | null;
  createdAt: string;
}

export interface FinanceSummary {
  summary: {
    totalReqCount: number;
    approvedReqCount: number;
    pendingReqCount: number;
    needsInfoReqCount: number;
    rejectedReqCount: number;
    totalReqRequestedAmount: number;
    totalReqApprovedAmount: number;
    totalProgCount: number;
    approvedProgCount: number;
    totalProgRequestedBudget: number;
    totalProgApprovedBudget: number;
    grandTotalApprovedExpenditure: number;
  };
  reqCategoryBreakdown: Record<string, { count: number; approvedCount: number; approvedAmount: number }>;
  progCategoryBreakdown: Record<string, { count: number; approvedCount: number; approvedBudget: number }>;
}

export type CustomFormSubmissionStatus =
  | 'NEW'
  | 'IN_REVIEW'
  | 'NEEDS_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVIEWED'
  | 'ARCHIVED';

export interface BeneficiaryAccount {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface CustomForm {
  id: string;
  slug: string;
  title: string;
  description: string;
  heroBadge: string;
  theme: string;
  submitButtonText: string;
  successMessage: string;
  isActive: boolean;
  showTracking: boolean;
  showInBeneficiaryPortal: boolean;
  maxFileSizeMB: number;
  smsRules: import('../utils/publicFormConfig').CustomFormSmsRule[];
  fields: import('../utils/publicFormConfig').CustomFormField[];
  submissionsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomFormSubmission {
  id: number;
  trackingCode: string;
  formId: string;
  beneficiaryId?: string | null;
  beneficiary?: BeneficiaryAccount | null;
  data: import('../utils/publicFormConfig').SubmittedCustomFieldValue[];
  status: CustomFormSubmissionStatus;
  note?: string | null;
  expertMessage?: string | null;
  expertMessageAt?: string | null;
  expertMessageBy?: string | null;
  dispatchedSmsCount?: number;
  notificationResult?: BeneficiaryNotifyResult;
  createdAt: string;
  updatedAt?: string;
}

export interface BeneficiaryNotification {
  id: number;
  beneficiaryId?: string | null;
  phone?: string | null;
  title: string;
  message: string;
  type: string;
  formId?: string | null;
  formTitle?: string | null;
  trackingCode?: string | null;
  senderName?: string | null;
  isRead: boolean;
  sentSms: boolean;
  sentPush: boolean;
  createdAt: string;
}

export interface BeneficiaryNotifyResult {
  inApp: { attempted: boolean; created: boolean; notificationId?: number };
  sms: { attempted: boolean; sent: boolean; receptor?: string; error?: string };
  push: { attempted: boolean; sentCount: number; failedCount: number; error?: string };
}

export interface BeneficiaryPortalFormItem {
  form: CustomForm;
  submission: CustomFormSubmission | null;
}

