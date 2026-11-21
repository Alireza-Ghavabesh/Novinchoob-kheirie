export type ScalarFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'phone'
  | 'national_id'
  | 'date'
  | 'currency'
  | 'select'
  | 'checkbox';

export type CustomFieldType =
  | ScalarFieldType
  | 'section'
  | 'file'
  | 'entity_list'
  | 'entity_select';

export interface EntitySubField {
  id: string;
  label: string;
  type: ScalarFieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  multiple?: boolean;
}

export interface EntityDefinition {
  id: string;
  name: string;
  singularLabel?: string;
  description?: string;
  fields: EntitySubField[];
  catalogItems: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomFormField {
  id: string;
  label: string;
  type: CustomFieldType;
  placeholder?: string;
  helpText?: string;
  width?: 'half' | 'full';
  required?: boolean;
  options?: string[];
  multiple?: boolean;
  entityId?: string;
  entitySelectSource?: 'both' | 'catalog' | 'form_rows';
  enabled?: boolean;
}

export interface BuiltinFieldsConfig {
  showBirthDate: boolean;
  showGuardian: boolean;
  showDependents: boolean;
  showHousing: boolean;
  showRequestedAmount: boolean;
  showDesc: boolean;
  showAddress: boolean;
  guardianLabel: string;
  housingLabel: string;
  catLabel: string;
  descLabel: string;
  addressLabel: string;
}

export interface PublicFormSchema {
  title: string;
  description: string;
  heroBadge: string;
  submitButtonText: string;
  successMessage: string;
  showTracking: boolean;
  maxFileSizeMB?: number;
  builtin: BuiltinFieldsConfig;
  guardianOptions: string[];
  housingOptions: string[];
  customFields: CustomFormField[];
}

export interface SubmittedCustomFieldValue {
  id: string;
  label: string;
  type: CustomFieldType;
  value: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  entityId?: string;
  entityName?: string;
  items?: Array<Record<string, string>>;
}

export type FormSmsEventType =
  | 'FORM_SUBMITTED'
  | 'FORM_UPDATED'
  | 'EXPERT_MESSAGE_ADDED'
  | 'FORM_STATUS_CHANGED';

export interface CustomFormSmsRule {
  id: string;
  title: string;
  isActive: boolean;
  eventType: FormSmsEventType;
  triggerStatus?: string;
  useAccountPhone: boolean;
  useFormPhoneFields: boolean;
  formPhoneFieldIds: string[];
  useAdmins: boolean;
  customNumbers: string;
  templateType: 'SIMPLE' | 'OTP';
  templateName?: string;
  templateParam1?: string;
  templateParam2?: string;
  templateParam3?: string;
  messageBody: string;
}

export const CUSTOM_FORM_STATUS_LABELS: Record<string, string> = {
  NEW: 'جدید / در صف بررسی',
  IN_REVIEW: 'در حال بررسی',
  NEEDS_INFO: 'نقص مدارک / نیازمند اصلاح',
  APPROVED: 'تأیید و تصویب شد',
  REJECTED: 'رد شده',
  REVIEWED: 'بررسی و تأیید شده',
  ARCHIVED: 'بایگانی شده',
};

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  section: 'تیتر بخش / جداکننده (Section Header)',
  text: 'متن کوتاه (Text)',
  textarea: 'متن بلند / توضیحات (Textarea)',
  national_id: 'کد ملی ۱۰ رقمی (National ID)',
  phone: 'شماره موبایل (Phone)',
  date: 'تاریخ شمسی (Date)',
  currency: 'مبلغ به تومان (Currency)',
  number: 'عددی (Number)',
  select: 'سلکت‌باکس (Select)',
  checkbox: 'چک‌باکس بله/خیر (Checkbox)',
  file: 'آپلود فایل / مدرک (File)',
  entity_list: 'فیلد موجودیتی / افزودن چندتایی (Entity List)',
  entity_select: 'سلکت‌باکس از موجودیت‌ها (Entity Select)',
};

export const SCALAR_FIELD_TYPE_LABELS: Record<ScalarFieldType, string> = {
  text: 'متن کوتاه',
  textarea: 'متن بلند',
  national_id: 'کد ملی ۱۰ رقمی',
  phone: 'شماره موبایل',
  date: 'تاریخ شمسی',
  currency: 'مبلغ (تومان)',
  number: 'عددی',
  select: 'سلکت‌باکس',
  checkbox: 'چک‌باکس بله/خیر',
};

export const DEFAULT_GUARDIAN_OPTIONS: string[] = [
  'زن سرپرست خانوار',
  'سرپرست مرد - ازکارافتاده',
  'سرپرست مرد - کارگر فصلی',
  'بدسرپرست',
  'بی‌سرپرست / یتیم',
  'تحت تکفل',
];

export const DEFAULT_HOUSING_OPTIONS: string[] = [
  'استیجاری',
  'سکونت با اقوام',
  'رهن کامل',
  'ملکی فرسوده',
  'بی‌سرپناه / اضطراری',
];

export const DEFAULT_PUBLIC_FORM_SCHEMA: PublicFormSchema = {
  title: 'فرم عمومی پذیرش و نیازسنجی نیازمندان',
  description:
    'مراجعین گرامی، این فرم با حفظ کامل کرامت انسانی و محرمانگی هویت شما جهت بررسی در کمیسیون مددکاری مؤسسه خیریه طراحی شده است.',
  heroBadge: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  submitButtonText: 'ثبت نهایی و دریافت کد رهگیری',
  successMessage: 'درخواست شما با موفقیت در سیستم ثبت گردید',
  showTracking: true,
  builtin: {
    showBirthDate: true,
    showGuardian: true,
    showDependents: true,
    showHousing: true,
    showRequestedAmount: true,
    showDesc: true,
    showAddress: true,
    guardianLabel: 'وضعیت سرپرستی خانوار',
    housingLabel: 'وضعیت محل سکونت',
    catLabel: 'دسته‌بندی موضوع نیاز',
    descLabel: 'شرح تفصیلی مشکل و وضعیت اضطرار',
    addressLabel: 'آدرس دقیق محل سکونت',
  },
  guardianOptions: [...DEFAULT_GUARDIAN_OPTIONS],
  housingOptions: [...DEFAULT_HOUSING_OPTIONS],
  customFields: [],
};

const VALID_FIELD_TYPES: CustomFieldType[] = [
  'section',
  'text',
  'textarea',
  'national_id',
  'phone',
  'date',
  'currency',
  'number',
  'select',
  'checkbox',
  'file',
  'entity_list',
  'entity_select',
];

const VALID_SCALAR_TYPES: ScalarFieldType[] = [
  'text',
  'textarea',
  'national_id',
  'phone',
  'date',
  'currency',
  'number',
  'select',
  'checkbox',
];

export function parseCustomFormFieldsList(raw: any): CustomFormField[] {
  let list: any = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((f: any) => f && f.id && f.label)
    .map((f: any) => ({
      id: String(f.id),
      label: String(f.label),
      type: (VALID_FIELD_TYPES.includes(f.type) ? f.type : 'text') as CustomFieldType,
      placeholder: f.placeholder ? String(f.placeholder) : '',
      helpText: f.helpText ? String(f.helpText) : '',
      width: f.width === 'full' || f.width === 'half' ? f.width : undefined,
      required: f.type === 'section' ? false : Boolean(f.required),
      options: Array.isArray(f.options)
        ? f.options.map((o: any) => String(o).trim()).filter(Boolean)
        : [],
      multiple: Boolean(f.multiple),
      entityId: f.entityId ? String(f.entityId) : undefined,
      entitySelectSource:
        f.entitySelectSource === 'catalog' || f.entitySelectSource === 'form_rows'
          ? f.entitySelectSource
          : 'both',
      enabled: f.enabled !== false,
    }));
}

export function createPublicRequestFormTemplateFields(needCategoryNames?: string[]): CustomFormField[] {
  const ts = Date.now();
  const catOptions =
    needCategoryNames && needCategoryNames.length > 0
      ? needCategoryNames
      : [
          'درمان و هزینه‌های پزشکی و جراحی',
          'ودیعه و اجاره‌بهای مسکن',
          'بسته‌های معیشتی و سبد غذایی',
          'جهیزیه و ازدواج آسان',
          'تحصیل و لوازم‌التحریر دانش‌آموزی',
          'اشتغال‌زایی و کارآفرینی خانگی',
        ];

  return [
    {
      id: `tpl_${ts}_sec1`,
      label: '۱. مشخصات هویتی متقاضی',
      type: 'section',
      helpText: 'تمامی اطلاعات هویتی با رعایت کامل محرمانگی نزد واحد مددکاری محفوظ می‌ماند.',
      width: 'full',
      required: false,
      enabled: true,
    },
    {
      id: `tpl_${ts}_name`,
      label: 'نام و نام خانوادگی متقاضی',
      type: 'text',
      placeholder: 'نام و نام خانوادگی کامل',
      width: 'half',
      required: true,
      enabled: true,
    },
    {
      id: `tpl_${ts}_nid`,
      label: 'کد ملی (۱۰ رقمی)',
      type: 'national_id',
      placeholder: '0012345678',
      width: 'half',
      required: true,
      enabled: true,
    },
    {
      id: `tpl_${ts}_phone`,
      label: 'شماره تماس همراه',
      type: 'phone',
      placeholder: '09123456789',
      width: 'half',
      required: true,
      enabled: true,
    },
    {
      id: `tpl_${ts}_birth`,
      label: 'تاریخ تولد (شمسی)',
      type: 'date',
      placeholder: '1365/05/12',
      width: 'half',
      required: false,
      enabled: true,
    },
    {
      id: `tpl_${ts}_sec2`,
      label: '۲. وضعیت خانوار و محل سکونت',
      type: 'section',
      width: 'full',
      required: false,
      enabled: true,
    },
    {
      id: `tpl_${ts}_guardian`,
      label: 'وضعیت سرپرستی خانوار',
      type: 'select',
      options: [...DEFAULT_GUARDIAN_OPTIONS],
      width: 'half',
      required: true,
      enabled: true,
    },
    {
      id: `tpl_${ts}_dependents`,
      label: 'تعداد افراد تحت تکفل',
      type: 'number',
      placeholder: 'مثلاً 3',
      width: 'half',
      required: false,
      enabled: true,
    },
    {
      id: `tpl_${ts}_housing`,
      label: 'وضعیت محل سکونت',
      type: 'select',
      options: [...DEFAULT_HOUSING_OPTIONS],
      width: 'full',
      required: true,
      enabled: true,
    },
    {
      id: `tpl_${ts}_sec3`,
      label: '۳. شرح نیاز، مبلغ تخمینی و مستندات',
      type: 'section',
      width: 'full',
      required: false,
      enabled: true,
    },
    {
      id: `tpl_${ts}_cat`,
      label: 'دسته‌بندی موضوع نیاز',
      type: 'select',
      options: catOptions,
      width: 'half',
      required: true,
      enabled: true,
    },
    {
      id: `tpl_${ts}_amount`,
      label: 'مبلغ کمک تخمینی مورد نیاز (تومان)',
      type: 'currency',
      placeholder: 'مثلاً 5000000',
      helpText: 'در صورت عدم اطلاع دقیق، می‌توانید این فیلد را خالی بگذارید.',
      width: 'half',
      required: false,
      enabled: true,
    },
    {
      id: `tpl_${ts}_desc`,
      label: 'شرح تفصیلی مشکل و وضعیت اضطرار',
      type: 'textarea',
      placeholder: 'لطفاً شرح وضعیت خانوار و نیاز خود را به صورت شفاف بنویسید...',
      width: 'full',
      required: true,
      enabled: true,
    },
    {
      id: `tpl_${ts}_address`,
      label: 'آدرس دقیق محل سکونت',
      type: 'textarea',
      placeholder: 'شهر، محله، خیابان، کوچه، پلاک و واحد',
      width: 'full',
      required: true,
      enabled: true,
    },
    {
      id: `tpl_${ts}_doc`,
      label: 'بارگذاری تصویر مدارک هویتی یا مستندات (اختیاری)',
      type: 'file',
      placeholder: 'تصویر کارت ملی، اجاره‌نامه یا نسخه پزشکی را بارگذاری نمایید',
      width: 'full',
      required: false,
      enabled: true,
    },
    {
      id: `tpl_${ts}_confirm`,
      label: 'صحت اطلاعات واردشده را تایید می‌نمایم و با بررسی میدانی کارشناسان مؤسسه موافقم',
      type: 'checkbox',
      width: 'full',
      required: true,
      enabled: true,
    },
  ];
}

export function parseEntitySubFieldsList(raw: any): EntitySubField[] {
  let list: any = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((f: any) => f && f.id && f.label)
    .map((f: any) => ({
      id: String(f.id),
      label: String(f.label),
      type: (VALID_SCALAR_TYPES.includes(f.type) ? f.type : 'text') as ScalarFieldType,
      placeholder: f.placeholder ? String(f.placeholder) : '',
      required: Boolean(f.required),
      options: Array.isArray(f.options)
        ? f.options.map((o: any) => String(o).trim()).filter(Boolean)
        : [],
      multiple: Boolean(f.multiple),
    }));
}

export function parsePublicFormSchema(raw?: string | null): PublicFormSchema {
  if (!raw || !raw.trim()) {
    return {
      ...DEFAULT_PUBLIC_FORM_SCHEMA,
      builtin: { ...DEFAULT_PUBLIC_FORM_SCHEMA.builtin },
      guardianOptions: [...DEFAULT_GUARDIAN_OPTIONS],
      housingOptions: [...DEFAULT_HOUSING_OPTIONS],
      customFields: [],
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      title:
        typeof parsed?.title === 'string' && parsed.title.trim()
          ? parsed.title.trim()
          : DEFAULT_PUBLIC_FORM_SCHEMA.title,
      description:
        typeof parsed?.description === 'string'
          ? parsed.description
          : DEFAULT_PUBLIC_FORM_SCHEMA.description,
      heroBadge:
        typeof parsed?.heroBadge === 'string'
          ? parsed.heroBadge
          : DEFAULT_PUBLIC_FORM_SCHEMA.heroBadge,
      submitButtonText:
        typeof parsed?.submitButtonText === 'string' && parsed.submitButtonText.trim()
          ? parsed.submitButtonText.trim()
          : DEFAULT_PUBLIC_FORM_SCHEMA.submitButtonText,
      successMessage:
        typeof parsed?.successMessage === 'string' && parsed.successMessage.trim()
          ? parsed.successMessage.trim()
          : DEFAULT_PUBLIC_FORM_SCHEMA.successMessage,
      showTracking: parsed?.showTracking !== false,
      maxFileSizeMB:
        typeof parsed?.maxFileSizeMB === 'number' && parsed.maxFileSizeMB > 0
          ? Math.min(25, Math.max(1, Math.round(parsed.maxFileSizeMB)))
          : 5,
      builtin: {
        ...DEFAULT_PUBLIC_FORM_SCHEMA.builtin,
        ...(parsed?.builtin || {}),
      },
      guardianOptions:
        Array.isArray(parsed?.guardianOptions) && parsed.guardianOptions.length > 0
          ? parsed.guardianOptions.map((o: any) => String(o).trim()).filter(Boolean)
          : [...DEFAULT_GUARDIAN_OPTIONS],
      housingOptions:
        Array.isArray(parsed?.housingOptions) && parsed.housingOptions.length > 0
          ? parsed.housingOptions.map((o: any) => String(o).trim()).filter(Boolean)
          : [...DEFAULT_HOUSING_OPTIONS],
      customFields: parseCustomFormFieldsList(parsed?.customFields),
    };
  } catch {
    return {
      ...DEFAULT_PUBLIC_FORM_SCHEMA,
      maxFileSizeMB: 5,
      builtin: { ...DEFAULT_PUBLIC_FORM_SCHEMA.builtin },
      guardianOptions: [...DEFAULT_GUARDIAN_OPTIONS],
      housingOptions: [...DEFAULT_HOUSING_OPTIONS],
      customFields: [],
    };
  }
}

export function parseCustomFormSmsRules(raw: any): CustomFormSmsRule[] {
  let list: any = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const validEvents: FormSmsEventType[] = [
    'FORM_SUBMITTED',
    'FORM_UPDATED',
    'EXPERT_MESSAGE_ADDED',
    'FORM_STATUS_CHANGED',
  ];
  return list
    .filter((r: any) => r && r.id && r.title)
    .map((r: any) => ({
      id: String(r.id),
      title: String(r.title),
      isActive: r.isActive !== false,
      eventType: (validEvents.includes(r.eventType) ? r.eventType : 'FORM_SUBMITTED') as FormSmsEventType,
      triggerStatus: r.triggerStatus ? String(r.triggerStatus) : 'ALL',
      useAccountPhone: Boolean(r.useAccountPhone),
      useFormPhoneFields: Boolean(r.useFormPhoneFields),
      formPhoneFieldIds: Array.isArray(r.formPhoneFieldIds)
        ? r.formPhoneFieldIds.map((x: any) => String(x)).filter(Boolean)
        : [],
      useAdmins: Boolean(r.useAdmins),
      customNumbers: r.customNumbers ? String(r.customNumbers) : '',
      templateType: r.templateType === 'OTP' ? 'OTP' : 'SIMPLE',
      templateName: r.templateName ? String(r.templateName) : '',
      templateParam1: r.templateParam1 ? String(r.templateParam1) : '',
      templateParam2: r.templateParam2 ? String(r.templateParam2) : '',
      templateParam3: r.templateParam3 ? String(r.templateParam3) : '',
      messageBody: r.messageBody ? String(r.messageBody) : '',
    }));
}

export function parseSubmittedCustomFields(raw?: string | null): SubmittedCustomFieldValue[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && item.label);
    }
    return [];
  } catch {
    return [];
  }
}

export function formatEntityRowSummary(row: Record<string, string>, idx?: number): string {
  const parts = Object.entries(row)
    .filter(([, v]) => String(v ?? '').trim() !== '')
    .map(([k, v]) => `${k}: ${v}`);
  const prefix = typeof idx === 'number' ? `ردیف ${idx + 1}: ` : '';
  return `${prefix}${parts.join(' | ')}`;
}

export function formatBytesCompact(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} مگابایت`;
}
