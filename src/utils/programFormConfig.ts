import { CustomFormField, parseCustomFormFieldsList } from './publicFormConfig';

export interface ProgramBuiltinFieldsConfig {
  showTitle: boolean;
  requiredTitle: boolean;
  titleLabel: string;
  titlePlaceholder: string;

  showCat: boolean;
  requiredCat: boolean;
  catLabel: string;

  showRequestedBudget: boolean;
  requiredRequestedBudget: boolean;
  requestedBudgetLabel: string;
  requestedBudgetPlaceholder: string;

  showVolunteers: boolean;
  requiredVolunteers: boolean;
  volunteersLabel: string;
  volunteersPlaceholder: string;

  showRoles: boolean;
  requiredRoles: boolean;
  rolesLabel: string;
  rolesPlaceholder: string;

  showStartDate: boolean;
  requiredStartDate: boolean;
  startDateLabel: string;
  startDatePlaceholder: string;

  showEndDate: boolean;
  requiredEndDate: boolean;
  endDateLabel: string;
  endDatePlaceholder: string;

  showDesc: boolean;
  requiredDesc: boolean;
  descLabel: string;
  descPlaceholder: string;
}

export interface ProgramFormSchema {
  formTitle: string;
  submitButtonText: string;
  maxFileSizeMB: number;
  builtin: ProgramBuiltinFieldsConfig;
  customFields: CustomFormField[];
}

export const DEFAULT_PROGRAM_FORM_SCHEMA: ProgramFormSchema = {
  formTitle: 'تعریف طرح / پروژه اجرایی جدید',
  submitButtonText: 'ثبت طرح و آغاز فاز ۱',
  maxFileSizeMB: 5,
  builtin: {
    showTitle: true,
    requiredTitle: true,
    titleLabel: 'عنوان کامل طرح / پروژه',
    titlePlaceholder: 'مثال: کاروان سلامت و درمان رایگان روستایی',

    showCat: true,
    requiredCat: true,
    catLabel: 'دسته‌بندی طرح',

    showRequestedBudget: true,
    requiredRequestedBudget: false,
    requestedBudgetLabel: 'برآورد بودجه اولیه (تومان)',
    requestedBudgetPlaceholder: 'مثال: 50000000',

    showVolunteers: true,
    requiredVolunteers: false,
    volunteersLabel: 'تعداد داوطلب مورد نیاز',
    volunteersPlaceholder: 'مثلاً 5',

    showRoles: true,
    requiredRoles: false,
    rolesLabel: 'نقش‌ها و تخصص‌ها',
    rolesPlaceholder: 'مثال: ۲ پزشک، ۳ مددکار',

    showStartDate: true,
    requiredStartDate: false,
    startDateLabel: 'تاریخ شروع (شمسی)',
    startDatePlaceholder: 'انتخاب تاریخ شروع...',

    showEndDate: true,
    requiredEndDate: false,
    endDateLabel: 'تاریخ پایان (شمسی)',
    endDatePlaceholder: 'انتخاب تاریخ پایان...',

    showDesc: true,
    requiredDesc: true,
    descLabel: 'اهداف و شرح پروژه',
    descPlaceholder: 'جامعه هدف، تعداد ذینفعان و محل اجرای طرح...',
  },
  customFields: [],
};

export function parseProgramFormSchema(raw?: string | null): ProgramFormSchema {
  if (!raw || !raw.trim()) {
    return {
      ...DEFAULT_PROGRAM_FORM_SCHEMA,
      builtin: { ...DEFAULT_PROGRAM_FORM_SCHEMA.builtin },
      customFields: [],
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      formTitle:
        typeof parsed?.formTitle === 'string' && parsed.formTitle.trim()
          ? parsed.formTitle.trim()
          : DEFAULT_PROGRAM_FORM_SCHEMA.formTitle,
      submitButtonText:
        typeof parsed?.submitButtonText === 'string' && parsed.submitButtonText.trim()
          ? parsed.submitButtonText.trim()
          : DEFAULT_PROGRAM_FORM_SCHEMA.submitButtonText,
      maxFileSizeMB:
        typeof parsed?.maxFileSizeMB === 'number' && parsed.maxFileSizeMB > 0
          ? Math.min(25, Math.max(1, Math.round(parsed.maxFileSizeMB)))
          : 5,
      builtin: {
        ...DEFAULT_PROGRAM_FORM_SCHEMA.builtin,
        ...(parsed?.builtin || {}),
        showTitle: true,
        requiredTitle: true,
      },
      customFields: parseCustomFormFieldsList(parsed?.customFields),
    };
  } catch {
    return {
      ...DEFAULT_PROGRAM_FORM_SCHEMA,
      builtin: { ...DEFAULT_PROGRAM_FORM_SCHEMA.builtin },
      customFields: [],
    };
  }
}

export interface ProgramInstanceFieldConfig {
  hideBuiltinFields?: boolean;
  fields: CustomFormField[];
}

/**
 * Parses per-project fieldSchema column. Supports both legacy plain CustomFormField[] and structured { hideBuiltinFields, fields }.
 */
export function parseProgramInstanceFieldSchema(raw?: string | null): ProgramInstanceFieldConfig {
  if (!raw || !raw.trim()) {
    return { hideBuiltinFields: false, fields: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        hideBuiltinFields: false,
        fields: parseCustomFormFieldsList(parsed),
      };
    }
    if (parsed && typeof parsed === 'object') {
      return {
        hideBuiltinFields: Boolean(parsed.hideBuiltinFields),
        fields: parseCustomFormFieldsList(parsed.fields),
      };
    }
    return { hideBuiltinFields: false, fields: [] };
  } catch {
    return { hideBuiltinFields: false, fields: [] };
  }
}
