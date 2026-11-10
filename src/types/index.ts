export interface AppConfig {
  id: number;
  instName: string;
  automationTitle: string;
  logoDataUrl: string | null;
  phone: string;
  address: string;
  notice: string;
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
  logs: ProgramLog[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissions {
  viewInbox?: boolean;
  decideInbox?: boolean;
  viewProg?: boolean;
  createProg?: boolean;
  decideProg?: boolean;
  viewFin?: boolean;
  manageSettings?: boolean;
  manageSms?: boolean;
}

export interface SmsConfig {
  id: number;
  apiKey: string;
  senderLine: string;
  provider: 'GHASEDAK' | 'CUSTOM';
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
