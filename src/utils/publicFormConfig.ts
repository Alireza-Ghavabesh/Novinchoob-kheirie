export type ScalarFieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox';

export type CustomFieldType =
  | ScalarFieldType
  | 'entity_list'
  | 'entity_select';

export interface EntitySubField {
  id: string;
  label: string;
  type: ScalarFieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
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
  required?: boolean;
  options?: string[];
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
  entityId?: string;
  entityName?: string;
  items?: Array<Record<string, string>>;
}

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'متن کوتاه (Text)',
  textarea: 'متن بلند / توضیحات (Textarea)',
  number: 'عددی (Number)',
  select: 'سلکت‌باکس (Select)',
  checkbox: 'چک‌باکس بله/خیر (Checkbox)',
  entity_list: 'فیلد موجودیتی / افزودن چندتایی (Entity List)',
  entity_select: 'سلکت‌باکس از موجودیت‌ها (Entity Select)',
};

export const SCALAR_FIELD_TYPE_LABELS: Record<ScalarFieldType, string> = {
  text: 'متن کوتاه',
  textarea: 'متن بلند',
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
  'text',
  'textarea',
  'number',
  'select',
  'checkbox',
  'entity_list',
  'entity_select',
];

const VALID_SCALAR_TYPES: ScalarFieldType[] = [
  'text',
  'textarea',
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
      required: Boolean(f.required),
      options: Array.isArray(f.options)
        ? f.options.map((o: any) => String(o).trim()).filter(Boolean)
        : [],
      entityId: f.entityId ? String(f.entityId) : undefined,
      entitySelectSource:
        f.entitySelectSource === 'catalog' || f.entitySelectSource === 'form_rows'
          ? f.entitySelectSource
          : 'both',
      enabled: f.enabled !== false,
    }));
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
    }));
}

export function parsePublicFormSchema(raw?: string | null): PublicFormSchema {
  if (!raw || !raw.trim()) {
    return {
      builtin: { ...DEFAULT_PUBLIC_FORM_SCHEMA.builtin },
      guardianOptions: [...DEFAULT_GUARDIAN_OPTIONS],
      housingOptions: [...DEFAULT_HOUSING_OPTIONS],
      customFields: [],
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
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
      builtin: { ...DEFAULT_PUBLIC_FORM_SCHEMA.builtin },
      guardianOptions: [...DEFAULT_GUARDIAN_OPTIONS],
      housingOptions: [...DEFAULT_HOUSING_OPTIONS],
      customFields: [],
    };
  }
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
