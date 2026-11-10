import {
  AppConfig,
  BeneficiaryRequest,
  Category,
  FinanceSummary,
  PasswordResetRecord,
  Program,
  StaffUser,
  SmsConfig,
  SmsRule,
  SmsLog,
} from '../types';

export const api = {
  // Config
  getConfig: async (): Promise<AppConfig> => {
    const res = await fetch('/api/config');
    return res.json();
  },
  updateConfig: async (config: Partial<AppConfig>): Promise<AppConfig> => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  // Categories
  getCategories: async (): Promise<{ needCategories: Category[]; programCategories: Category[] }> => {
    const res = await fetch('/api/categories');
    return res.json();
  },
  addNeedCategory: async (name: string): Promise<Category> => {
    const res = await fetch('/api/categories/need', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add need category');
    }
    return res.json();
  },
  deleteNeedCategory: async (id: number): Promise<void> => {
    await fetch(`/api/categories/need/${id}`, { method: 'DELETE' });
  },
  addProgramCategory: async (name: string): Promise<Category> => {
    const res = await fetch('/api/categories/program', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add program category');
    }
    return res.json();
  },
  deleteProgramCategory: async (id: number): Promise<void> => {
    await fetch(`/api/categories/program/${id}`, { method: 'DELETE' });
  },

  // Auth
  login: async (username: string, password: string): Promise<{ user: StaffUser }> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'ورود ناموفق بود');
    }
    return res.json();
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
    const res = await fetch('/api/auth/password-resets');
    return res.json();
  },
  resolvePasswordReset: async (id: number, status: 'RESOLVED' | 'PENDING'): Promise<void> => {
    await fetch(`/api/auth/password-resets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  // Users
  getUsers: async (): Promise<StaffUser[]> => {
    const res = await fetch('/api/users');
    return res.json();
  },
  createUser: async (user: any): Promise<StaffUser> => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ثبت کاربر جدید');
    }
    return res.json();
  },
  updateUser: async (id: string, data: any): Promise<StaffUser> => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteUser: async (id: string): Promise<void> => {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در حذف کاربر');
    }
  },

  // Requests
  getRequests: async (filters?: { search?: string; status?: string; cat?: string }): Promise<BeneficiaryRequest[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.cat) params.set('cat', filters.cat);
    const res = await fetch(`/api/requests?${params.toString()}`);
    return res.json();
  },
  trackRequest: async (code: string): Promise<Partial<BeneficiaryRequest>> => {
    const res = await fetch(`/api/requests/track/${encodeURIComponent(code)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'پرونده‌ای یافت نشد');
    }
    return res.json();
  },
  createRequest: async (data: any): Promise<BeneficiaryRequest> => {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ثبت درخواست');
    }
    return res.json();
  },
  updateRequest: async (id: number, data: Partial<BeneficiaryRequest>): Promise<BeneficiaryRequest> => {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('خطا در به‌روزرسانی پرونده');
    return res.json();
  },
  deleteRequest: async (id: number): Promise<void> => {
    await fetch(`/api/requests/${id}`, { method: 'DELETE' });
  },

  // Programs
  getPrograms: async (): Promise<Program[]> => {
    const res = await fetch('/api/programs');
    return res.json();
  },
  createProgram: async (data: any): Promise<Program> => {
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('خطا در ثبت طرح');
    return res.json();
  },
  updateProgram: async (id: number, data: any): Promise<Program> => {
    const res = await fetch(`/api/programs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('خطا در به‌روزرسانی طرح');
    return res.json();
  },
  addProgramLog: async (id: number, note: string, date?: string): Promise<any> => {
    const res = await fetch(`/api/programs/${id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, date }),
    });
    return res.json();
  },
  deleteProgram: async (id: number): Promise<void> => {
    await fetch(`/api/programs/${id}`, { method: 'DELETE' });
  },

  // Finance
  getFinanceStats: async (): Promise<FinanceSummary> => {
    const res = await fetch('/api/finance/stats');
    return res.json();
  },

  // Backup & Restore
  exportBackupUrl: '/api/backup',
  restoreBackup: async (backupData: any): Promise<void> => {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در بازیابی نسخه پشتیبان');
    }
  },

  // SMS Panel (Ghasedak)
  getSmsConfig: async (): Promise<SmsConfig> => {
    const res = await fetch('/api/sms/config');
    return res.json();
  },
  updateSmsConfig: async (data: Partial<SmsConfig>): Promise<SmsConfig> => {
    const res = await fetch('/api/sms/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('خطا در ذخیره تنظیمات پیامک');
    return res.json();
  },
  getSmsRules: async (): Promise<SmsRule[]> => {
    const res = await fetch('/api/sms/rules');
    return res.json();
  },
  createSmsRule: async (rule: Partial<SmsRule>): Promise<SmsRule> => {
    const res = await fetch('/api/sms/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ایجاد شرط پیامک');
    }
    return res.json();
  },
  updateSmsRule: async (id: number, rule: Partial<SmsRule>): Promise<SmsRule> => {
    const res = await fetch(`/api/sms/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    if (!res.ok) throw new Error('خطا در به‌روزرسانی شرط پیامک');
    return res.json();
  },
  deleteSmsRule: async (id: number): Promise<void> => {
    const res = await fetch(`/api/sms/rules/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('خطا در حذف شرط پیامک');
  },
  getSmsLogs: async (): Promise<SmsLog[]> => {
    const res = await fetch('/api/sms/logs');
    return res.json();
  },
  clearSmsLogs: async (): Promise<void> => {
    await fetch('/api/sms/logs', { method: 'DELETE' });
  },
  testSms: async (receptor: string, message: string): Promise<any> => {
    const res = await fetch('/api/sms/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receptor, message }),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error || 'ارسال ناموفق بود');
    }
    return data;
  },

  // Web Push
  getPushPublicKey: async (): Promise<string> => {
    const res = await fetch('/api/push/key');
    const data = await res.json();
    return data.publicKey || '';
  },
  savePushSubscription: async (subscription: any, username: string): Promise<any> => {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, username }),
    });
    return res.json();
  },
  unsubscribePush: async (endpoint: string): Promise<void> => {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  },
  testPush: async (title: string, body: string, username?: string): Promise<any> => {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, username }),
    });
    return res.json();
  },
  getPushDevices: async (): Promise<any[]> => {
    const res = await fetch('/api/push/devices');
    return res.json();
  },
};

