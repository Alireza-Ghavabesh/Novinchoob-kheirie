import {
  AppConfig,
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
} from '../types';
import { EntityDefinition, SubmittedCustomFieldValue } from '../utils/publicFormConfig';

const AUTH_TOKEN_KEY = 'OM_CHARITY_AUTH_TOKEN';

let unauthorizedHandler: (() => void) | null = null;

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    unauthorizedHandler?.();
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
    throw new Error(data?.error || fallbackMessage);
  }
  return data as T;
}

export const api = {
  setUnauthorizedHandler: (handler: (() => void) | null) => {
    unauthorizedHandler = handler;
  },

  // Config
  getConfig: async (): Promise<AppConfig> => {
    const res = await fetch('/api/config');
    return parseJsonOrThrow<AppConfig>(res, 'خطا در دریافت تنظیمات سامانه');
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
  getSmsLogs: async (): Promise<SmsLog[]> => {
    const res = await authFetch('/api/sms/logs');
    return parseJsonOrThrow<SmsLog[]>(res, 'خطا در دریافت گزارش پیامک‌ها');
  },
  clearSmsLogs: async (): Promise<void> => {
    const res = await authFetch('/api/sms/logs', { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در پاکسازی گزارش پیامک‌ها');
  },
  testSms: async (receptor: string, message: string): Promise<any> => {
    const res = await authFetch('/api/sms/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receptor, message }),
    });
    const data = await parseJsonOrThrow<any>(res, 'ارسال ناموفق بود');
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
  ): Promise<{ trackingCode: string; status: string; note?: string | null; createdAt: string }> => {
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
    data: { status?: string; note?: string | null }
  ): Promise<CustomFormSubmission> => {
    const res = await authFetch(`/api/forms/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonOrThrow<CustomFormSubmission>(res, 'خطا در به‌روزرسانی پاسخ');
  },
  deleteFormSubmission: async (submissionId: number): Promise<void> => {
    const res = await authFetch(`/api/forms/submissions/${submissionId}`, { method: 'DELETE' });
    await parseJsonOrThrow(res, 'خطا در حذف پاسخ');
  },
};


