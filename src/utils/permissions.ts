import { StaffUser, UserPermissions } from '../types';

export type PermissionKey = keyof UserPermissions;

export interface PermissionItemDef {
  key: PermissionKey;
  label: string;
  description: string;
  adminBadge?: boolean;
}

export interface PermissionGroupDef {
  id: string;
  title: string;
  subtitle: string;
  color: 'emerald' | 'teal' | 'indigo' | 'blue' | 'amber' | 'rose' | 'slate';
  items: PermissionItemDef[];
}

export const PERMISSION_GROUPS: PermissionGroupDef[] = [
  {
    id: 'inbox',
    title: 'متقاضیان و پرونده‌ها',
    subtitle: 'مدیریت فهرست درخواست‌های عمومی و فرم‌های ساخته‌شده',
    color: 'emerald',
    items: [
      {
        key: 'viewInbox',
        label: 'مشاهده فهرست متقاضیان و فرم‌ها',
        description: 'دسترسی به تب متقاضیان، مشاهده جزئیات پرونده‌ها و فهرست هر فرم',
      },
      {
        key: 'createRequest',
        label: 'ثبت دستی پرونده متقاضی',
        description: 'امکان ثبت درخواست جدید برای مددجو از داخل پنل مدیریت',
      },
      {
        key: 'decideInbox',
        label: 'بررسی، تغییر وضعیت و تصویب پرونده',
        description: 'تأیید، رد، ثبت نقص مدارک و تعیین مبلغ مصوب برای متقاضیان',
      },
      {
        key: 'deleteInbox',
        label: 'حذف پرونده یا پاسخ فرم',
        description: 'مجوز حذف دائمی پرونده‌های ثبت‌شده در کارتابل متقاضیان',
      },
      {
        key: 'exportInbox',
        label: 'خروجی اکسل / CSV',
        description: 'دریافت فایل خروجی از لیست متقاضیان و پاسخ‌های هر فرم',
      },
    ],
  },
  {
    id: 'beneficiary_notify',
    title: 'ارتباط با مددجویان و اعلانات',
    subtitle: 'تعیین دقیق کانال‌های مجاز پیام‌رسانی به مددجو',
    color: 'teal',
    items: [
      {
        key: 'sendBeneficiaryBell',
        label: 'ارسال اعلان زنگوله پروفایل مددجو',
        description: 'ثبت پیام در بخش اعلانات (زنگوله) داخل پروفایل مددجو',
      },
      {
        key: 'sendBeneficiarySms',
        label: 'ارسال پیامک (فقط از متن‌های مجاز)',
        description: 'ارسال پیامک به مددجو صرفاً از میان متن‌های از پیش ثبت‌شده توسط ادمین',
      },
      {
        key: 'sendBeneficiaryPush',
        label: 'ارسال پوش نوتیفیکیشن گوشی',
        description: 'ارسال اعلان لحظه‌ای روی مرورگر/گوشی مددجویانی که پوش را فعال کرده‌اند',
      },
    ],
  },
  {
    id: 'forms',
    title: 'فرم‌ساز و موجودیت‌ها',
    subtitle: 'ساخت فرم‌های اختصاصی و تنظیم نمایش در پروفایل مددجو',
    color: 'indigo',
    items: [
      {
        key: 'viewForms',
        label: 'مشاهده فهرست فرم‌ساز',
        description: 'دسترسی به تب فرم‌ساز و مشاهده فرم‌ها و پاسخ‌ها',
      },
      {
        key: 'manageForms',
        label: 'ایجاد، ویرایش، حذف و فعال‌سازی فرم‌ها',
        description: 'طراحی فرم جدید، ویرایش فرم عمومی، تغییر نمایش در پروفایل مددجو و مدیریت موجودیت‌ها',
      },
    ],
  },
  {
    id: 'programs',
    title: 'طرح‌ها و برنامه‌ها',
    subtitle: 'مدیریت طرح‌های حمایتی، پویش‌ها و گزارش پیشرفت',
    color: 'blue',
    items: [
      {
        key: 'viewProg',
        label: 'مشاهده طرح‌ها و برنامه‌ها',
        description: 'مشاهده فهرست و پیشرفت طرح‌های خیریه',
      },
      {
        key: 'createProg',
        label: 'ثبت و ویرایش طرح جدید',
        description: 'پیشنهاد طرح جدید و ثبت گزارش پیشرفت مراحل',
      },
      {
        key: 'decideProg',
        label: 'تصویب، رد و حذف طرح‌ها',
        description: 'تعیین بودجه مصوب و تغییر وضعیت نهایی طرح‌ها',
      },
    ],
  },
  {
    id: 'finance_calendar',
    title: 'مالی و تقویم اجرایی',
    subtitle: 'گزارش‌های مالی، اعتبارات و تقویم فعالیت‌ها',
    color: 'amber',
    items: [
      {
        key: 'viewFin',
        label: 'مشاهده گزارشات مالی و اعتبارات',
        description: 'دسترسی به تب مالی و نمودار مصارف خیریه',
      },
      {
        key: 'viewCalendar',
        label: 'مشاهده تقویم اجرایی',
        description: 'دسترسی به تب تقویم و رویدادهای طرح‌ها',
      },
    ],
  },
  {
    id: 'sms',
    title: 'پیامک و متن‌های مجاز',
    subtitle: 'تنظیمات قاصدک، قوانین خودکار و بانک متن‌های مجاز پیامک',
    color: 'rose',
    items: [
      {
        key: 'manageSms',
        label: 'تنظیمات سامانه پیامک، قوانین خودکار و گزارشات',
        description: 'دسترسی به تب پیامک، مشاهده تاریخچه و تنظیم شروط خودکار',
      },
      {
        key: 'manageSmsTemplates',
        label: 'ثبت و ویرایش بانک متن‌های مجاز پیامک',
        description: 'اختصاصی ادمین: تعریف، ویرایش و حذف متن‌های مجاز برای ارسال پیامک به مددجویان',
        adminBadge: true,
      },
    ],
  },
  {
    id: 'admin',
    title: 'تنظیمات سامانه و مدیریت کاربران',
    subtitle: 'پیکربندی کل سامانه، لینک‌های ورود و مدیریت دسترسی کادر',
    color: 'slate',
    items: [
      {
        key: 'manageUsers',
        label: 'مدیریت کاربران و تعیین دسترسی‌ها',
        description: 'ایجاد، ویرایش، غیرفعال‌سازی کاربران و تنظیم سطح دسترسی‌ها',
      },
      {
        key: 'manageSettings',
        label: 'تنظیمات کل سامانه، هویت و پشتیبان‌گیری',
        description: 'تغییر نام مؤسسه، دسته‌بندی‌ها، لینک‌های ورود و تهیه نسخه پشتیبان',
      },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key)
);

export const EMPTY_PERMISSIONS: UserPermissions = ALL_PERMISSION_KEYS.reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {} as UserPermissions);

export interface RolePreset {
  id: string;
  label: string;
  roleTitle: string;
  perms: UserPermissions;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'caseworker',
    label: 'کارشناس مددکاری',
    roleTitle: 'کارشناس مددکاری',
    perms: {
      ...EMPTY_PERMISSIONS,
      viewInbox: true,
      createRequest: true,
      decideInbox: true,
      exportInbox: true,
      sendBeneficiaryBell: true,
      sendBeneficiarySms: true,
      sendBeneficiaryPush: true,
      viewCalendar: true,
    },
  },
  {
    id: 'reviewer_readonly',
    label: 'بازرس / مشاهده‌گر پرونده',
    roleTitle: 'بازرس پرونده‌ها',
    perms: {
      ...EMPTY_PERMISSIONS,
      viewInbox: true,
      sendBeneficiaryBell: true,
      viewForms: true,
      viewProg: true,
      viewCalendar: true,
    },
  },
  {
    id: 'forms_manager',
    label: 'مسئول فرم‌ساز و پذیرش',
    roleTitle: 'کارشناس فرم‌ساز و پذیرش',
    perms: {
      ...EMPTY_PERMISSIONS,
      viewInbox: true,
      decideInbox: true,
      exportInbox: true,
      sendBeneficiaryBell: true,
      sendBeneficiarySms: true,
      sendBeneficiaryPush: true,
      viewForms: true,
      manageForms: true,
      viewCalendar: true,
    },
  },
  {
    id: 'finance_officer',
    label: 'مسئول مالی و طرح‌ها',
    roleTitle: 'مسئول مالی',
    perms: {
      ...EMPTY_PERMISSIONS,
      viewInbox: true,
      exportInbox: true,
      viewProg: true,
      createProg: true,
      decideProg: true,
      viewFin: true,
      viewCalendar: true,
    },
  },
  {
    id: 'executive_manager',
    label: 'مدیر اجرایی (بدون ثبت متن پیامک)',
    roleTitle: 'مدیر اجرایی',
    perms: {
      ...EMPTY_PERMISSIONS,
      viewInbox: true,
      createRequest: true,
      decideInbox: true,
      deleteInbox: true,
      exportInbox: true,
      sendBeneficiaryBell: true,
      sendBeneficiarySms: true,
      sendBeneficiaryPush: true,
      viewForms: true,
      manageForms: true,
      viewProg: true,
      createProg: true,
      decideProg: true,
      viewFin: true,
      viewCalendar: true,
      manageSms: true,
      manageSmsTemplates: false,
      manageUsers: true,
      manageSettings: true,
    },
  },
];

export function isMainAdmin(user?: StaffUser | null): boolean {
  return Boolean(user && user.username === 'admin');
}

/**
 * Checks if a staff user has a specific granular permission.
 * Preserves backwards compatibility for legacy users whose stored perms JSON
 * was created before granular keys were added (when a new key is `undefined`),
 * while strictly restricting `manageSmsTemplates` to admin or explicit grant.
 */
export function hasPermission(user: StaffUser | null | undefined, key: PermissionKey): boolean {
  if (!user) return false;
  if (user.username === 'admin') return true;
  const p = user.perms || {};

  // Strictly admin-only unless explicitly granted
  if (key === 'manageSmsTemplates') {
    return p.manageSmsTemplates === true;
  }

  if (typeof p[key] === 'boolean') {
    return Boolean(p[key]);
  }

  // Backwards-compatibility fallbacks ONLY when the granular key is undefined
  switch (key) {
    case 'createRequest':
    case 'exportInbox':
      return Boolean(p.viewInbox || p.decideInbox);
    case 'deleteInbox':
      return Boolean(p.decideInbox);
    case 'sendBeneficiaryBell':
    case 'sendBeneficiarySms':
    case 'sendBeneficiaryPush':
      return Boolean(p.decideInbox || p.viewInbox);
    case 'viewForms':
    case 'manageForms':
    case 'manageUsers':
    case 'manageSms':
      return Boolean(p.manageSettings);
    case 'viewCalendar':
      return true;
    default:
      return false;
  }
}

export function normalizePermissionsForEdit(perms?: UserPermissions | null, isAdminUser = false): UserPermissions {
  if (isAdminUser) {
    return ALL_PERMISSION_KEYS.reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {} as UserPermissions);
  }
  const fakeUser: StaffUser = {
    id: 'tmp',
    username: 'tmp',
    name: 'tmp',
    role: 'tmp',
    perms: perms || {},
  };
  return ALL_PERMISSION_KEYS.reduce((acc, k) => {
    acc[k] = hasPermission(fakeUser, k);
    return acc;
  }, {} as UserPermissions);
}

export function getPermissionLabel(key: PermissionKey): string {
  for (const g of PERMISSION_GROUPS) {
    const found = g.items.find((i) => i.key === key);
    if (found) return found.label;
  }
  return key;
}

export function renderSmsTemplatePreview(
  body: string,
  vars?: {
    name?: string | null;
    trackingCode?: string | null;
    instName?: string | null;
    formTitle?: string | null;
  }
): string {
  return String(body || '')
    .replace(/\{name\}/g, vars?.name?.trim() || 'مددجوی گرامی')
    .replace(/\{trackingCode\}/g, vars?.trackingCode?.trim() || '---')
    .replace(/\{instName\}/g, vars?.instName?.trim() || 'مؤسسه خیریه')
    .replace(/\{formTitle\}/g, vars?.formTitle?.trim() || 'فرم پرونده');
}
