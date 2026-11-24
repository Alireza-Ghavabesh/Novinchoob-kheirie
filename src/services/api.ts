import {
  AppConfig,
  BeneficiaryAccount,
  BeneficiaryNotification,
  BeneficiaryNotifyResult,
  BeneficiaryPortalFormItem,
  BeneficiaryRequest,
  Category,
  CustomForm,
  CustomFormSubmission,
  FinanceSummary,
  PasswordResetRecord,
  Program,
  StaffUser,
  SmsConfig,
  SmsRule,
  SmsLog,
  SmsTemplate,
} from '../types';
import { EntityDefinition, SubmittedCustomFieldValue } from '../utils/publicFormConfig';

const AUTH_TOKEN_KEY = 'OM_CHARITY_AUTH_TOKEN';
export const BENEFICIARY_TOKEN_KEY = 'OM_CHARITY_BENEFICIARY_TOKEN';

let unauthorizedHandler: (() => void) | null = null;
let beneficiaryUnauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  status?: number;
  code?: string;
  hint?: string;
  details?: string;

  constructor(
    message: string,
    opts?: { status?: number; code?: string; hint?: string; details?: string }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.code = opts?.code;
    this.hint = opts?.hint;
    this.details = opts?.details;
  }
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr: any) {
    throw new ApiError(
      `عدم امکان ارتباط با سرور (${url}). لطفاً اتصال شبکه و روشن بودن سرور را بررسی کنید.`,
      {
        code: 'NETWORK_ERROR',
        details: networkErr?.message || String(networkErr),
      }
    );
  }
  if (res.status === 401) {
    unauthorizedHandler?.();
  }
  return res;
}

async function beneficiaryAuthFetch(
  url: string,
  options: RequestInit = {},
  explicitToken?: string
): Promise<Response> {
  const token =
    explicitToken ||
    (typeof window !== 'undefined' ? localStorage.getItem(BENEFICIARY_TOKEN_KEY) : null);
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr: any) {
    throw new ApiError(
      `عدم امکان ارتباط با سرور (${url}). لطفاً اتصال اینترنت خود را بررسی کنید.`,
      {
        code: 'NETWORK_ERROR',
        details: networkErr?.message || String(networkErr),
      }
    );
  }
  if (res.status === 401 && !explicitToken) {
    beneficiaryUnauthorizedHandler?.();
  }
  return res;
}

async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const baseMsg =
      data?.error ||
      (text && !data
        ? `${fallbackMessage} (کد وضعیت HTTP ${res.status})`
        : fallbackMessage);
    const hint = typeof data?.hint === 'string' && data.hint.trim() ? data.hint.trim() : undefined;
    const rawDetails =
      typeof data?.details === 'string' && data.details.trim()
        ? data.details.trim()
        : !data && text
          ? text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 260)
          : undefined;
    const code = typeof data?.code === 'string' && data.code.trim() ? data.code.trim() : `HTTP_${res.status}`;

    const parts: string[] = [baseMsg];
    if (hint) {
      parts.push(`راهکار: ${hint}`);
    }
    if (rawDetails && !baseMsg.includes(rawDetails)) {
      parts.push(`جزئیات فنی [${code}]: ${rawDetails}`);
    }

    throw new ApiError(parts.join('\n'), {
      status: res.status,
      code,
      hint,
      details: rawDetails,
    });
  }
  return data as T;
}

export const api = {
  setUnauthorizedHandler: (handler: (() => void) | null) => {
    unauthorizedHandler = handler;
  },
  setBeneficiaryUnauthorizedHandler: (handler: (() => void) | null) => {
    beneficiaryUnauthorizedHandler = handler;
  },

  // Config
  getConfig: async (): Promise<AppConfig> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch('/api/config', { headers });
    return parseJsonOrThrow<AppConfig>(res, 'خطا در دریافت تنظیمات سامانه');
  },
  checkAdminRoute: async (slug: string): Promise<{ isAdminRoute: boolean }> => {
    const res = await fetch(`/api/auth/check-admin-route?slug=${encodeURIComponent(slug)}`);
    return parseJsonOrThrow<{ isAdminRoute: boolean }>(res, 'خطا در بررسی مسیر');
  },
  updateConfig: async (config: Partial<AppConfig>): Promise<AppConfig> => {
    const res = await authFetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return parseJsonOrThrow<AppConfig>(res, 'خطا در ذخیره تنظیمات');
  },

  // Categories
  getCategories: async (): Promise<{ needCategories: Category[]; programCategories: Category[] }> => {
    const res = await fetch('/api/categories');
    return parseJsonOrThrow<{ needCategories: Category[]; programCategories: Category[] }>(
      res,
      'خطا در دریافت دسته‌بندی‌ها'
    );
  },
  addNeedCategory: async (name: string): Promise<Category> => {
    const res = await authFetch('/api/categories/need', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return parseJsonOrThrow<Category>(res, 'خطا در ثبت دسته نیاز');
  },
  updateNeedCategory: async (id: number, name: string): Promise<Category> => {
    const res = await authFetch(`/api/categories/need/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return parseJsonOrThrow<Category>(res, 'خطا در ویرایش دسته نیاز');
  },
  deleteNeedCategory: async (id: number): Promise<void> => {
    const res = await authFetch(`/api/categories/need/${id}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف دسته‌بندی');
  },
  addProgramCategory: async (name: string): Promise<Category> => {
    const res = await authFetch('/api/categories/program', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return parseJsonOrThrow<Category>(res, 'خطا در ثبت دسته طرح');
  },
  updateProgramCategory: async (id: number, name: string): Promise<Category> => {
    const res = await authFetch(`/api/categories/program/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return parseJsonOrThrow<Category>(res, 'خطا در ویرایش دسته طرح');
  },
  deleteProgramCategory: async (id: number): Promise<void> => {
    const res = await authFetch(`/api/categories/program/${id}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف دسته‌بندی');
  },

  // Auth
  login: async (username: string, password: string): Promise<{ user: StaffUser; token?: string }> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return parseJsonOrThrow<{ user: StaffUser; token?: string }>(res, 'ورود ناموفق بود');
  },
  getMe: async (token: string): Promise<{ user: StaffUser }> => {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseJsonOrThrow<{ user: StaffUser }>(res, 'نشست کاربری نامعتبر است');
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean }> => {
    const res = await authFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return parseJsonOrThrow<{ success: boolean }>(res, 'خطا در تغییر رمز عبور');
  },
  sendLoginOtp: async (phone: string): Promise<{ success: boolean; expiresIn: number; maskedPhone: string }> => {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return parseJsonOrThrow<{ success: boolean; expiresIn: number; maskedPhone: string }>(
      res,
      'خطا در ارسال کد تایید'
    );
  },
  verifyLoginOtp: async (phone: string, code: string): Promise<{ user: StaffUser; token?: string }> => {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    return parseJsonOrThrow<{ user: StaffUser; token?: string }>(res, 'کد تایید نادرست است');
  },
  requestPasswordReset: async (username: string, note?: string): Promise<void> => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, note }),
    });
    if (!res.ok) throw new Error('خطا در ثبت درخواست بازیابی');
  },
  getPasswordResets: async (): Promise<PasswordResetRecord[]> => {
    const res = await authFetch('/api/auth/password-resets');
    return parseJsonOrThrow<PasswordResetRecord[]>(res, 'خطا در دریافت درخواست‌های بازیابی');
  },
  resolvePasswordReset: async (id: number, status: 'RESOLVED' | 'PENDING'): Promise<void> => {
    const res = await authFetch(`/api/auth/password-resets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await parseJsonOrThrow(res, 'خطا در به‌روزرسانی وضعیت درخواست');
  },

  // Users
  getUsers: async (): Promise<StaffUser[]> => {
    const res = await authFetch('/api/users');
    return parseJsonOrThrow<StaffUser[]>(res, 'خطا در دریافت لیست کاربران');
  },
  createUser: async (user: any): Promise<StaffUser> => {
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return parseJsonOrThrow<StaffUser>(res, 'خطا در ثبت کاربر جدید');
  },
  updateUser: async (id: string, data: any): Promise<StaffUser> => {
    const res = await authFetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<StaffUser>(res, 'خطا در به‌روزرسانی کاربر');
  },
  deleteUser: async (id: string): Promise<void> => {
    const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف کاربر');
  },

  // Requests
  getRequests: async (filters?: { search?: string; status?: string; cat?: string }): Promise<BeneficiaryRequest[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.cat) params.set('cat', filters.cat);
    const res = await authFetch(`/api/requests?${params.toString()}`);
    return parseJsonOrThrow<BeneficiaryRequest[]>(res, 'خطا در دریافت لیست درخواست‌ها');
  },
  trackRequest: async (code: string): Promise<Partial<BeneficiaryRequest>> => {
    const res = await fetch(`/api/requests/track/${encodeURIComponent(code)}`);
    return parseJsonOrThrow<Partial<BeneficiaryRequest>>(res, 'پرونده‌ای یافت نشد');
  },
  createRequest: async (data: any): Promise<BeneficiaryRequest> => {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<BeneficiaryRequest>(res, 'خطا در ثبت درخواست');
  },
  updateRequest: async (id: number, data: Partial<BeneficiaryRequest>): Promise<BeneficiaryRequest> => {
    const res = await authFetch(`/api/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<BeneficiaryRequest>(res, 'خطا در به‌روزرسانی پرونده');
  },
  deleteRequest: async (id: number): Promise<void> => {
    const res = await authFetch(`/api/requests/${id}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف پرونده');
  },

  // Programs
  getPrograms: async (): Promise<Program[]> => {
    const res = await authFetch('/api/programs');
    return parseJsonOrThrow<Program[]>(res, 'خطا در دریافت لیست طرح‌ها');
  },
  createProgram: async (data: any): Promise<Program> => {
    const res = await authFetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<Program>(res, 'خطا در ثبت طرح');
  },
  updateProgram: async (id: number, data: any): Promise<Program> => {
    const res = await authFetch(`/api/programs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<Program>(res, 'خطا در به‌روزرسانی طرح');
  },
  addProgramLog: async (id: number, note: string, date?: string): Promise<any> => {
    const res = await authFetch(`/api/programs/${id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, date }),
    });
    return parseJsonOrThrow<any>(res, 'خطا در ثبت گزارش پیشرفت');
  },
  deleteProgram: async (id: number): Promise<void> => {
    const res = await authFetch(`/api/programs/${id}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف طرح');
  },

  // Finance
  getFinanceStats: async (): Promise<FinanceSummary> => {
    const res = await authFetch('/api/finance/stats');
    return parseJsonOrThrow<FinanceSummary>(res, 'خطا در دریافت گزارشات مالی');
  },

  // Backup & Restore
  downloadBackup: async (): Promise<void> => {
    const res = await authFetch('/api/backup');
    if (!res.ok) {
      let msg = 'خطا در دریافت نسخه پشتیبان';
      try {
        const err = await res.json();
        if (err?.error) msg = err.error;
      } catch {
        // ignore parse error
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charity-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  restoreBackup: async (backupData: any): Promise<void> => {
    const res = await authFetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
    await parseJsonOrThrow(res, 'خطا در بازیابی نسخه پشتیبان');
  },

  // SMS Panel (Ghasedak)
  getSmsConfig: async (): Promise<SmsConfig> => {
    const res = await authFetch('/api/sms/config');
    return parseJsonOrThrow<SmsConfig>(res, 'خطا در دریافت تنظیمات پیامک');
  },
  updateSmsConfig: async (data: Partial<SmsConfig>): Promise<SmsConfig> => {
    const res = await authFetch('/api/sms/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<SmsConfig>(res, 'خطا در ذخیره تنظیمات پیامک');
  },
  getSmsRules: async (): Promise<SmsRule[]> => {
    const res = await authFetch('/api/sms/rules');
    return parseJsonOrThrow<SmsRule[]>(res, 'خطا در دریافت قوانین پیامک');
  },
  createSmsRule: async (rule: Partial<SmsRule>): Promise<SmsRule> => {
    const res = await authFetch('/api/sms/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    return parseJsonOrThrow<SmsRule>(res, 'خطا در ایجاد شرط پیامک');
  },
  updateSmsRule: async (id: number, rule: Partial<SmsRule>): Promise<SmsRule> => {
    const res = await authFetch(`/api/sms/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    return parseJsonOrThrow<SmsRule>(res, 'خطا در به‌روزرسانی شرط پیامک');
  },
  deleteSmsRule: async (id: number): Promise<void> => {
    const res = await authFetch(`/api/sms/rules/${id}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف شرط پیامک');
  },
  getSmsTemplates: async (includeAll = false): Promise<SmsTemplate[]> => {
    const res = await authFetch(`/api/sms/templates${includeAll ? '?all=true' : ''}`);
    return parseJsonOrThrow<SmsTemplate[]>(res, 'خطا در دریافت لیست متن‌های مجاز پیامک');
  },
  createSmsTemplate: async (data: Partial<SmsTemplate>): Promise<SmsTemplate> => {
    const res = await authFetch('/api/sms/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<SmsTemplate>(res, 'خطا در ثبت متن مجاز پیامک');
  },
  updateSmsTemplate: async (id: number, data: Partial<SmsTemplate>): Promise<SmsTemplate> => {
    const res = await authFetch(`/api/sms/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<SmsTemplate>(res, 'خطا در ویرایش متن مجاز پیامک');
  },
  deleteSmsTemplate: async (id: number): Promise<void> => {
    const res = await authFetch(`/api/sms/templates/${id}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف متن مجاز پیامک');
  },
  getSmsLogs: async (): Promise<SmsLog[]> => {
    const res = await authFetch('/api/sms/logs');
    return parseJsonOrThrow<SmsLog[]>(res, 'خطا در دریافت گزارش پیامک‌ها');
  },
  clearSmsLogs: async (): Promise<void> => {
    const res = await authFetch('/api/sms/logs', { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در پاکسازی گزارش پیامک‌ها');
  },
  testSms: async (receptor: string, smsTemplateId: number): Promise<any> => {
    const res = await authFetch('/api/sms/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receptor, smsTemplateId }),
    });
    const data = await parseJsonOrThrow<any>(res, 'ارسال ناموفق بود');
    if (data.success === false) {
      throw new Error(data.error || 'ارسال ناموفق بود');
    }
    return data;
  },
  testOtpSms: async (payload: {
    phone: string;
    apiKey?: string;
    senderLine?: string;
    loginOtpTemplate?: string;
    loginOtpMessage?: string;
    appDomain?: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    mode?: string;
    maskedPhone?: string;
    previewMessage?: string;
  }> => {
    const res = await authFetch('/api/sms/test-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonOrThrow<any>(res, 'خطا در ارسال پیامک تست OTP');
    if (data.success === false) {
      throw new Error(data.error || 'ارسال ناموفق بود');
    }
    return data;
  },

  // Web Push
  getPushPublicKey: async (): Promise<string> => {
    const res = await authFetch('/api/push/key');
    const data = await parseJsonOrThrow<{ publicKey?: string }>(res, 'خطا در دریافت کلید اعلان');
    return data.publicKey || '';
  },
  savePushSubscription: async (subscription: any, username: string): Promise<any> => {
    const res = await authFetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, username }),
    });
    return parseJsonOrThrow<any>(res, 'خطا در ذخیره اشتراک اعلان');
  },
  unsubscribePush: async (endpoint: string): Promise<void> => {
    const res = await authFetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    await parseJsonOrThrow(res, 'خطا در لغو اشتراک اعلان');
  },
  testPush: async (title: string, body: string, username?: string): Promise<any> => {
    const res = await authFetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, username }),
    });
    return parseJsonOrThrow<any>(res, 'خطا در ارسال اعلان آزمایشی');
  },
  getPushDevices: async (): Promise<any[]> => {
    const res = await authFetch('/api/push/devices');
    return parseJsonOrThrow<any[]>(res, 'خطا در دریافت لیست دستگاه‌ها');
  },

  // Entities Registry
  getEntities: async (): Promise<EntityDefinition[]> => {
    const res = await fetch('/api/entities');
    return parseJsonOrThrow<EntityDefinition[]>(res, 'خطا در دریافت لیست موجودیت‌ها');
  },
  createEntity: async (data: Partial<EntityDefinition>): Promise<EntityDefinition> => {
    const res = await authFetch('/api/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<EntityDefinition>(res, 'خطا در ثبت موجودیت جدید');
  },
  updateEntity: async (id: string, data: Partial<EntityDefinition>): Promise<EntityDefinition> => {
    const res = await authFetch(`/api/entities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<EntityDefinition>(res, 'خطا در ویرایش موجودیت');
  },
  deleteEntity: async (id: string): Promise<void> => {
    const res = await authFetch(`/api/entities/${id}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف موجودیت');
  },

  // Custom Form Builder & Submissions
  getForms: async (): Promise<CustomForm[]> => {
    const res = await authFetch('/api/forms');
    return parseJsonOrThrow<CustomForm[]>(res, 'خطا در دریافت لیست فرم‌ها');
  },
  getPublicForm: async (slug: string): Promise<CustomForm> => {
    const res = await fetch(`/api/forms/public/${encodeURIComponent(slug)}`);
    return parseJsonOrThrow<CustomForm>(res, 'فرم مورد نظر یافت نشد');
  },
  createForm: async (data: Partial<CustomForm>): Promise<CustomForm> => {
    const res = await authFetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<CustomForm>(res, 'خطا در ایجاد فرم جدید');
  },
  updateForm: async (id: string, data: Partial<CustomForm>): Promise<CustomForm> => {
    const res = await authFetch(`/api/forms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<CustomForm>(res, 'خطا در ذخیره فرم');
  },
  deleteForm: async (id: string): Promise<void> => {
    const res = await authFetch(`/api/forms/${id}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف فرم');
  },
  submitPublicForm: async (
    slug: string,
    data: SubmittedCustomFieldValue[]
  ): Promise<{ id: number; trackingCode: string; status: string; createdAt: string }> => {
    const res = await fetch(`/api/forms/public/${encodeURIComponent(slug)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return parseJsonOrThrow(res, 'خطا در ثبت فرم');
  },
  trackFormSubmission: async (
    slug: string,
    code: string
  ): Promise<{
    trackingCode: string;
    status: string;
    note?: string | null;
    expertMessage?: string | null;
    expertMessageAt?: string | null;
    expertMessageBy?: string | null;
    createdAt: string;
  }> => {
    const res = await fetch(
      `/api/forms/public/${encodeURIComponent(slug)}/track/${encodeURIComponent(code)}`
    );
    return parseJsonOrThrow(res, 'رکوردی با این کد پیگیری یافت نشد');
  },
  getFormSubmissions: async (formId: string): Promise<CustomFormSubmission[]> => {
    const res = await authFetch(`/api/forms/${encodeURIComponent(formId)}/submissions`);
    return parseJsonOrThrow<CustomFormSubmission[]>(res, 'خطا در دریافت پاسخ‌های فرم');
  },
  updateFormSubmission: async (
    submissionId: number,
    data: {
      status?: string;
      note?: string | null;
      expertMessage?: string | null;
      sendSms?: boolean;
      sendInApp?: boolean;
      sendDirectSms?: boolean;
      smsTemplateId?: number | null;
      sendPush?: boolean;
    }
  ): Promise<CustomFormSubmission> => {
    const res = await authFetch(`/api/forms/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<CustomFormSubmission>(res, 'خطا در به‌روزرسانی پاسخ');
  },
  sendBeneficiaryNotification: async (data: {
    requestId?: number;
    beneficiaryId?: string | null;
    beneficiaryName?: string | null;
    phone?: string | null;
    title?: string;
    message: string;
    formId?: string | null;
    formTitle?: string | null;
    trackingCode?: string | null;
    sendInApp?: boolean;
    sendSms?: boolean;
    smsTemplateId?: number | null;
    sendPush?: boolean;
    alsoSaveNote?: boolean;
    nextRequestStatus?: string;
  }): Promise<{ success: boolean; result: BeneficiaryNotifyResult }> => {
    const res = await authFetch('/api/admin/beneficiary-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow(res, 'خطا در ارسال پیام به مددجو');
  },
  deleteFormSubmission: async (submissionId: number): Promise<void> => {
    const res = await authFetch(`/api/forms/submissions/${submissionId}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف پاسخ');
  },

  // File Upload
  uploadFile: async (
    file: File,
    context?: { formId?: string; formSlug?: string; source?: string }
  ): Promise<{ url: string; name: string; size: number; mimeType: string }> => {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('خطا در خواندن فایل انتخاب‌شده'));
      reader.readAsDataURL(file);
    });
    const res = await fetch('/api/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataBase64,
        formId: context?.formId,
        formSlug: context?.formSlug,
        source: context?.source,
      }),
    });
    return parseJsonOrThrow(res, 'خطا در بارگذاری فایل');
  },

  // Beneficiary OTP Auth & Profile Portal
  sendBeneficiaryOtp: async (data: {
    phone: string;
  }): Promise<{
    success: boolean;
    expiresIn: number;
    maskedPhone: string;
    simulated?: boolean;
    previewCode?: string;
  }> => {
    const res = await fetch('/api/beneficiary/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow(res, 'خطا در ارسال کد تایید');
  },
  verifyBeneficiaryOtp: async (data: {
    phone: string;
    code: string;
  }): Promise<{ beneficiary: BeneficiaryAccount; token: string }> => {
    const res = await fetch('/api/beneficiary/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow(res, 'کد تایید نادرست است');
  },
  getBeneficiaryMe: async (token?: string): Promise<{ beneficiary: BeneficiaryAccount }> => {
    const res = await beneficiaryAuthFetch('/api/beneficiary/auth/me', {}, token);
    return parseJsonOrThrow(res, 'نشست کاربری مددجو منقضی شده است');
  },
  getBeneficiaryPortal: async (): Promise<{
    beneficiary: BeneficiaryAccount;
    items: BeneficiaryPortalFormItem[];
    publicFormEnabled?: boolean;
    publicRequest?: BeneficiaryRequest | null;
    notifications?: BeneficiaryNotification[];
    unreadNotificationsCount?: number;
    pushSubscribedCount?: number;
  }> => {
    const res = await beneficiaryAuthFetch('/api/beneficiary/portal');
    return parseJsonOrThrow(res, 'خطا در دریافت اطلاعات پروفایل مددجو');
  },
  getBeneficiaryNotifications: async (): Promise<{
    notifications: BeneficiaryNotification[];
    unreadCount: number;
  }> => {
    const res = await beneficiaryAuthFetch('/api/beneficiary/notifications');
    return parseJsonOrThrow(res, 'خطا در دریافت اعلانات مددجو');
  },
  markBeneficiaryNotificationRead: async (id: number): Promise<void> => {
    const res = await beneficiaryAuthFetch(`/api/beneficiary/notifications/${id}/read`, {
      method: 'PATCH',
    });
    await parseJsonOrThrow(res, 'خطا در خواندن اعلان');
  },
  markAllBeneficiaryNotificationsRead: async (): Promise<void> => {
    const res = await beneficiaryAuthFetch('/api/beneficiary/notifications/read-all', {
      method: 'POST',
    });
    await parseJsonOrThrow(res, 'خطا در خواندن همه اعلانات');
  },
  deleteBeneficiaryNotification: async (id: number): Promise<void> => {
    const res = await beneficiaryAuthFetch(`/api/beneficiary/notifications/${id}`, {
      method: 'DELETE',
    });
    await parseJsonOrThrow(res, 'خطا در حذف اعلان');
  },
  getBeneficiaryPushKey: async (): Promise<string> => {
    const res = await beneficiaryAuthFetch('/api/beneficiary/push/key');
    const data = await parseJsonOrThrow<{ publicKey: string }>(
      res,
      'خطا در دریافت کلید پوش نوتیفیکیشن'
    );
    return data.publicKey || '';
  },
  subscribeBeneficiaryPush: async (subscription: PushSubscriptionJSON): Promise<void> => {
    const res = await beneficiaryAuthFetch('/api/beneficiary/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });
    await parseJsonOrThrow(res, 'خطا در فعال‌سازی پوش نوتیفیکیشن');
  },
  unsubscribeBeneficiaryPush: async (endpoint: string): Promise<void> => {
    const res = await beneficiaryAuthFetch('/api/beneficiary/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    await parseJsonOrThrow(res, 'خطا در غیرفعال‌سازی پوش نوتیفیکیشن');
  },
  submitBeneficiaryPublicRequest: async (
    data: any,
    isEdit = false
  ): Promise<BeneficiaryRequest> => {
    const res = await beneficiaryAuthFetch('/api/beneficiary/public-request', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow(res, 'خطا در ثبت فرم درخواست عمومی');
  },
  submitBeneficiaryForm: async (
    formId: string,
    data: SubmittedCustomFieldValue[],
    isEdit = false
  ): Promise<CustomFormSubmission> => {
    const res = await beneficiaryAuthFetch(
      `/api/beneficiary/forms/${encodeURIComponent(formId)}/submit`,
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      }
    );
    return parseJsonOrThrow(res, 'خطا در ثبت اطلاعات فرم مددجو');
  },
};


