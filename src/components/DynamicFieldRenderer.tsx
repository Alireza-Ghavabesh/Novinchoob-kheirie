import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Layers,
  ChevronDown,
  Check,
  Upload,
  FileText,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import {
  CustomFormField,
  EntityDefinition,
  EntitySubField,
  SubmittedCustomFieldValue,
  formatBytesCompact,
  formatEntityRowSummary,
} from '../utils/publicFormConfig';
import { toPersianDigits } from '../utils/persian';
import { api } from '../services/api';

export type DynamicFormValuesMap = Record<string, any>;

function normalizeMultiArray(rawVal: any): string[] {
  if (Array.isArray(rawVal)) {
    return rawVal.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof rawVal === 'string' && rawVal.trim()) {
    return [rawVal.trim()];
  }
  return [];
}

/**
 * Validates and extracts structured SubmittedCustomFieldValue[] from active form fields and state values.
 * Returns { error } if any required field or entity sub-field fails validation, or { values }.
 */
export function validateAndExtractCustomFields(
  fields: CustomFormField[],
  values: DynamicFormValuesMap,
  entities: EntityDefinition[]
): { error?: string; values: SubmittedCustomFieldValue[] } {
  const activeFields = fields.filter((f) => f.enabled !== false);
  const result: SubmittedCustomFieldValue[] = [];

  for (const field of activeFields) {
    const rawVal = values[field.id];

    if (field.type === 'file') {
      const fileObj =
        rawVal && typeof rawVal === 'object' && rawVal.fileUrl
          ? (rawVal as { fileUrl: string; fileName?: string; fileSize?: number; mimeType?: string })
          : null;
      if (field.required && !fileObj?.fileUrl) {
        return { error: `لطفاً فایل مربوط به «${field.label}» را بارگذاری نمایید.`, values: [] };
      }
      if (fileObj?.fileUrl) {
        result.push({
          id: field.id,
          label: field.label,
          type: 'file',
          value: fileObj.fileName || 'فایل پیوست‌شده',
          fileUrl: fileObj.fileUrl,
          fileName: fileObj.fileName,
          fileSize: fileObj.fileSize,
          mimeType: fileObj.mimeType,
        });
      }
    } else if (field.type === 'checkbox') {
      const checked = Boolean(rawVal);
      if (field.required && !checked) {
        return { error: `لطفاً گزینه «${field.label}» را تایید نمایید.`, values: [] };
      }
      result.push({
        id: field.id,
        label: field.label,
        type: field.type,
        value: checked ? 'بله' : 'خیر',
      });
    } else if (field.type === 'select') {
      if (field.multiple) {
        const selected = normalizeMultiArray(rawVal).filter((v) =>
          (field.options || []).includes(v)
        );
        if (field.required && selected.length === 0) {
          return {
            error: `لطفاً حداقل یک گزینه برای «${field.label}» انتخاب نمایید.`,
            values: [],
          };
        }
        if (selected.length > 0) {
          result.push({
            id: field.id,
            label: field.label,
            type: field.type,
            value: selected.join('، '),
          });
        }
      } else {
        const val = String(rawVal ?? field.options?.[0] ?? '').trim();
        if (field.required && !val) {
          return { error: `لطفاً «${field.label}» را انتخاب نمایید.`, values: [] };
        }
        if (val) {
          result.push({
            id: field.id,
            label: field.label,
            type: field.type,
            value: val,
          });
        }
      }
    } else if (field.type === 'entity_select') {
      const options = resolveEntitySelectOptions(field, fields, values, entities);
      const entity = entities.find((e) => e.id === field.entityId);
      if (field.multiple) {
        const selected = normalizeMultiArray(rawVal).filter((v) => options.includes(v));
        if (field.required && selected.length === 0) {
          return {
            error: `لطفاً حداقل یک مورد برای «${field.label}» انتخاب نمایید.`,
            values: [],
          };
        }
        if (selected.length > 0) {
          result.push({
            id: field.id,
            label: field.label,
            type: field.type,
            value: selected.join('، '),
            entityId: field.entityId,
            entityName: entity?.name,
          });
        }
      } else {
        const val = String(rawVal ?? options[0] ?? '').trim();
        if (field.required && !val) {
          return { error: `لطفاً یک مورد برای «${field.label}» انتخاب نمایید.`, values: [] };
        }
        if (val) {
          result.push({
            id: field.id,
            label: field.label,
            type: field.type,
            value: val,
            entityId: field.entityId,
            entityName: entity?.name,
          });
        }
      }
    } else if (field.type === 'entity_list') {
      const entity = entities.find((e) => e.id === field.entityId);
      const rows: Array<Record<string, any>> = Array.isArray(rawVal) ? rawVal : [];

      if (field.required && rows.length === 0) {
        return {
          error: `لطفاً حداقل یک مورد در بخش «${field.label}» اضافه نمایید.`,
          values: [],
        };
      }

      const formattedRows: Array<Record<string, string>> = [];
      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx] || {};
        const labeledRow: Record<string, string> = {};
        if (entity && entity.fields.length > 0) {
          for (const sub of entity.fields) {
            const subRaw = row[sub.id];
            if (sub.type === 'checkbox') {
              const checked = Boolean(subRaw);
              if (sub.required && !checked) {
                return {
                  error: `در ردیف ${toPersianDigits(rIdx + 1)} از «${field.label}»، تایید «${sub.label}» الزامی است.`,
                  values: [],
                };
              }
              labeledRow[sub.label] = checked ? 'بله' : 'خیر';
            } else if (sub.type === 'select') {
              if (sub.multiple) {
                const selectedSub = normalizeMultiArray(subRaw).filter((v) =>
                  (sub.options || []).includes(v)
                );
                if (sub.required && selectedSub.length === 0) {
                  return {
                    error: `در ردیف ${toPersianDigits(rIdx + 1)} از «${field.label}»، انتخاب حداقل یک گزینه برای «${sub.label}» الزامی است.`,
                    values: [],
                  };
                }
                labeledRow[sub.label] = selectedSub.join('، ');
              } else {
                const sVal = String(subRaw ?? sub.options?.[0] ?? '').trim();
                if (sub.required && !sVal) {
                  return {
                    error: `در ردیف ${toPersianDigits(rIdx + 1)} از «${field.label}»، انتخاب «${sub.label}» الزامی است.`,
                    values: [],
                  };
                }
                labeledRow[sub.label] = sVal;
              }
            } else {
              const sVal = String(subRaw ?? '').trim();
              if (sub.required && !sVal) {
                return {
                  error: `در ردیف ${toPersianDigits(rIdx + 1)} از «${field.label}»، تکمیل «${sub.label}» الزامی است.`,
                  values: [],
                };
              }
              labeledRow[sub.label] = sVal;
            }
          }
        } else {
          const fallbackVal = String(row._text ?? '').trim();
          if (field.required && !fallbackVal) {
            return {
              error: `ردیف ${toPersianDigits(rIdx + 1)} در بخش «${field.label}» خالی است.`,
              values: [],
            };
          }
          labeledRow['عنوان'] = fallbackVal;
        }
        formattedRows.push(labeledRow);
      }

      if (formattedRows.length > 0 || field.required) {
        result.push({
          id: field.id,
          label: field.label,
          type: 'entity_list',
          value:
            formattedRows.length > 0
              ? `${toPersianDigits(formattedRows.length)} مورد ثبت شده`
              : 'بدون مورد',
          entityId: field.entityId,
          entityName: entity?.name,
          items: formattedRows,
        });
      }
    } else {
      const val = String(rawVal ?? '').trim();
      if (field.required && !val) {
        return { error: `لطفاً فیلد «${field.label}» را تکمیل نمایید.`, values: [] };
      }
      if (val) {
        result.push({
          id: field.id,
          label: field.label,
          type: field.type,
          value: val,
        });
      }
    }
  }

  return { values: result };
}

/**
 * Hydrates DynamicFormValuesMap from an existing SubmittedCustomFieldValue[] array for editing.
 */
export function hydrateValuesFromSubmission(
  fields: CustomFormField[],
  submittedData: SubmittedCustomFieldValue[],
  entities: EntityDefinition[]
): DynamicFormValuesMap {
  const map: DynamicFormValuesMap = {};
  const byId = new Map<string, SubmittedCustomFieldValue>();
  for (const item of submittedData || []) {
    if (item?.id) byId.set(item.id, item);
  }

  for (const field of fields || []) {
    const saved = byId.get(field.id) || (submittedData || []).find((d) => d.label === field.label);
    if (!saved) continue;

    if (field.type === 'checkbox') {
      map[field.id] = saved.value === 'بله' || saved.value === 'true';
    } else if (field.type === 'file') {
      if (saved.fileUrl) {
        map[field.id] = {
          fileUrl: saved.fileUrl,
          fileName: saved.fileName || saved.value,
          fileSize: saved.fileSize,
          mimeType: saved.mimeType,
        };
      }
    } else if (field.type === 'select' || field.type === 'entity_select') {
      if (field.multiple) {
        map[field.id] = String(saved.value || '')
          .split('،')
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        map[field.id] = String(saved.value || '');
      }
    } else if (field.type === 'entity_list') {
      const entity = entities.find((e) => e.id === field.entityId);
      const savedRows = Array.isArray(saved.items) ? saved.items : [];
      map[field.id] = savedRows.map((labeledRow) => {
        const rowObj: Record<string, any> = {};
        if (entity && entity.fields.length > 0) {
          for (const sub of entity.fields) {
            const rawSubVal = labeledRow[sub.label];
            if (sub.type === 'checkbox') {
              rowObj[sub.id] = rawSubVal === 'بله' || rawSubVal === 'true';
            } else if (sub.type === 'select' && sub.multiple) {
              rowObj[sub.id] = String(rawSubVal || '')
                .split('،')
                .map((s) => s.trim())
                .filter(Boolean);
            } else {
              rowObj[sub.id] = String(rawSubVal ?? '');
            }
          }
        } else {
          rowObj._text = String(labeledRow['عنوان'] ?? Object.values(labeledRow)[0] ?? '');
        }
        return rowObj;
      });
    } else {
      map[field.id] = String(saved.value ?? '');
    }
  }
  return map;
}

export function resolveEntitySelectOptions(
  field: CustomFormField,
  allFields: CustomFormField[],
  values: DynamicFormValuesMap,
  entities: EntityDefinition[]
): string[] {
  const entity = entities.find((e) => e.id === field.entityId);
  if (!entity) return [];

  const source = field.entitySelectSource || 'both';
  const options: string[] = [];

  if (source === 'catalog' || source === 'both') {
    for (const item of entity.catalogItems || []) {
      if (item && !options.includes(item)) options.push(item);
    }
  }

  if (source === 'form_rows' || source === 'both') {
    const matchingListFields = allFields.filter(
      (f) => f.enabled !== false && f.type === 'entity_list' && f.entityId === entity.id
    );
    for (const listField of matchingListFields) {
      const rows: Array<Record<string, any>> = Array.isArray(values[listField.id])
        ? values[listField.id]
        : [];
      rows.forEach((row, idx) => {
        const labeled: Record<string, string> = {};
        entity.fields.forEach((sub) => {
          const val =
            sub.type === 'checkbox'
              ? row[sub.id]
                ? 'بله'
                : 'خیر'
              : sub.type === 'select'
              ? sub.multiple
                ? normalizeMultiArray(row[sub.id]).join('، ')
                : String(row[sub.id] ?? sub.options?.[0] ?? '')
              : String(row[sub.id] ?? '');
          if (val.trim()) labeled[sub.label] = val;
        });
        const label =
          Object.keys(labeled).length > 0
            ? formatEntityRowSummary(labeled, idx)
            : `${entity.singularLabel || entity.name} ${toPersianDigits(idx + 1)}`;
        if (!options.includes(label)) options.push(label);
      });
    }
  }

  return options;
}

function buildDefaultEntityRow(entity?: EntityDefinition): Record<string, any> {
  const row: Record<string, any> = {};
  if (!entity) return row;
  for (const sub of entity.fields) {
    if (sub.type === 'select') {
      row[sub.id] = sub.multiple ? [] : sub.options?.[0] || '';
    } else if (sub.type === 'checkbox') {
      row[sub.id] = false;
    } else {
      row[sub.id] = '';
    }
  }
  return row;
}

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (nextSelected: string[]) => void;
  placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'انتخاب یک یا چند گزینه...',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs bg-white text-right flex items-center justify-between gap-2 transition cursor-pointer ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold text-[11px]"
              >
                <span>{item}</span>
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {selected.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
              {toPersianDigits(selected.length)}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180 text-emerald-600' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-52 overflow-y-auto p-1.5 space-y-1">
          {options.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleOption(opt)}
                className={`w-full px-2.5 py-2 rounded-lg text-xs text-right flex items-center justify-between gap-2 transition cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-50 text-emerald-900 font-bold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="truncate">{opt}</span>
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition ${
                    isChecked
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface DynamicFieldRendererProps {
  fields: CustomFormField[];
  values: DynamicFormValuesMap;
  entities: EntityDefinition[];
  onChange: (nextValues: DynamicFormValuesMap) => void;
  compact?: boolean;
  maxFileSizeMB?: number;
  uploadContext?: { formId?: string; formSlug?: string; source?: string };
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  fields,
  values,
  entities,
  onChange,
  compact = false,
  maxFileSizeMB = 5,
  uploadContext,
}) => {
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [fileUploadErrors, setFileUploadErrors] = useState<Record<string, string>>({});

  const activeFields = fields.filter((f) => f.enabled !== false);
  if (activeFields.length === 0) return null;

  const setFieldValue = (fieldId: string, val: any) => {
    onChange({ ...values, [fieldId]: val });
  };

  const handleFileSelect = async (fieldId: string, file?: File | null) => {
    if (!file) return;
    setFileUploadErrors((prev) => ({ ...prev, [fieldId]: '' }));
    const limitMb = maxFileSizeMB > 0 ? maxFileSizeMB : 5;
    const maxBytes = limitMb * 1024 * 1024;
    if (file.size > maxBytes) {
      const actualMb = (file.size / (1024 * 1024)).toFixed(2);
      setFileUploadErrors((prev) => ({
        ...prev,
        [fieldId]: `حجم فایل انتخاب‌شده (${toPersianDigits(actualMb)} مگابایت) بیشتر از سقف مجاز این فرم (${toPersianDigits(limitMb)} مگابایت) است.`,
      }));
      return;
    }

    setUploadingFieldId(fieldId);
    try {
      const uploaded = await api.uploadFile(file, uploadContext);
      setFieldValue(fieldId, {
        fileUrl: uploaded.url,
        fileName: uploaded.name,
        fileSize: uploaded.size,
        mimeType: uploaded.mimeType,
      });
    } catch (err: any) {
      setFileUploadErrors((prev) => ({
        ...prev,
        [fieldId]: err.message || 'خطا در آپلود فایل',
      }));
    } finally {
      setUploadingFieldId(null);
    }
  };

  const renderSubFieldInput = (
    listFieldId: string,
    rowIdx: number,
    sub: EntitySubField,
    row: Record<string, any>,
    allRows: Array<Record<string, any>>
  ) => {
    const val = row[sub.id];
    const updateSubVal = (nextVal: any) => {
      const nextRows = allRows.map((r, i) => (i === rowIdx ? { ...r, [sub.id]: nextVal } : r));
      setFieldValue(listFieldId, nextRows);
    };

    if (sub.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer text-xs font-semibold text-slate-700 mt-5">
          <input
            type="checkbox"
            checked={Boolean(val)}
            onChange={(e) => updateSubVal(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            {sub.label}
            {sub.required && <span className="text-rose-500 mr-1">*</span>}
          </span>
        </label>
      );
    }

    return (
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          {sub.label}
          {sub.required && <span className="text-rose-500 mr-1">*</span>}
        </label>
        {sub.type === 'select' ? (
          sub.multiple ? (
            <MultiSelectDropdown
              options={sub.options || []}
              selected={normalizeMultiArray(val)}
              onChange={(nextSelected) => updateSubVal(nextSelected)}
            />
          ) : (
            <select
              required={Boolean(sub.required)}
              value={String(val ?? sub.options?.[0] ?? '')}
              onChange={(e) => updateSubVal(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              {(sub.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )
        ) : sub.type === 'textarea' ? (
          <textarea
            rows={2}
            required={Boolean(sub.required)}
            placeholder={sub.placeholder || ''}
            value={String(val ?? '')}
            onChange={(e) => updateSubVal(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          />
        ) : (
          <input
            type={sub.type === 'number' ? 'number' : sub.type === 'phone' ? 'tel' : 'text'}
            dir={sub.type === 'phone' ? 'ltr' : undefined}
            required={Boolean(sub.required)}
            placeholder={sub.placeholder || (sub.type === 'phone' ? '09123456789' : '')}
            value={String(val ?? '')}
            onChange={(e) => updateSubVal(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          />
        )}
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 ${compact ? 'gap-3' : 'sm:grid-cols-2 gap-4'}`}>
      {activeFields.map((field) => {
        const isFullWidth =
          compact ||
          field.type === 'textarea' ||
          field.type === 'checkbox' ||
          field.type === 'file' ||
          field.type === 'entity_list';

        if (field.type === 'entity_list') {
          const entity = entities.find((e) => e.id === field.entityId);
          const rows: Array<Record<string, any>> = Array.isArray(values[field.id])
            ? values[field.id]
            : [];
          const singular = entity?.singularLabel || entity?.name || 'آیتم';

          return (
            <div
              key={field.id}
              className={`${isFullWidth ? 'sm:col-span-2' : ''} rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {field.label}
                      {field.required && <span className="text-rose-500 mr-1">*</span>}
                    </span>
                    {entity?.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{entity.description}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFieldValue(field.id, [...rows, buildDefaultEntityRow(entity)])
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن {singular}</span>
                </button>
              </div>

              {!entity ? (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                  موجودیت متصل به این فیلد یافت نشد یا حذف شده است.
                </p>
              ) : rows.length === 0 ? (
                <div className="text-center py-4 px-3 rounded-xl border border-dashed border-emerald-300 bg-white/80 text-xs text-slate-500">
                  هنوز هیچ «{singular}» اضافه نشده است. برای افزودن، روی دکمه «افزودن {singular}» کلیک کنید.
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((row, rIdx) => (
                    <div
                      key={`${field.id}-row-${rIdx}`}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-emerald-800">
                          {singular} شماره {toPersianDigits(rIdx + 1)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setFieldValue(
                              field.id,
                              rows.filter((_, idx) => idx !== rIdx)
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>

                      {entity.fields.length === 0 ? (
                        <input
                          type="text"
                          placeholder={`مشخصات ${singular}...`}
                          value={String(row._text ?? '')}
                          onChange={(e) => {
                            const nextRows = rows.map((r, i) =>
                              i === rIdx ? { ...r, _text: e.target.value } : r
                            );
                            setFieldValue(field.id, nextRows);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {entity.fields.map((sub) => (
                            <div
                              key={sub.id}
                              className={sub.type === 'textarea' ? 'sm:col-span-3' : ''}
                            >
                              {renderSubFieldInput(field.id, rIdx, sub, row, rows)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        if (field.type === 'entity_select') {
          const entityOptions = resolveEntitySelectOptions(field, fields, values, entities);
          const selectedVal = String(values[field.id] ?? entityOptions[0] ?? '');

          return (
            <div key={field.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {field.label}
                {field.required && <span className="text-rose-500 mr-1">*</span>}
              </label>
              {entityOptions.length === 0 ? (
                <div className="px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-[11px] text-amber-800">
                  هنوز گزینه‌ای برای این موجودیت در دسترس نیست (ابتدا در جدول موجودیت مرتبط یا تنظیمات موجودیت موردی اضافه کنید).
                </div>
              ) : field.multiple ? (
                <MultiSelectDropdown
                  options={entityOptions}
                  selected={normalizeMultiArray(values[field.id]).filter((v) =>
                    entityOptions.includes(v)
                  )}
                  onChange={(nextSelected) => setFieldValue(field.id, nextSelected)}
                />
              ) : (
                <select
                  required={Boolean(field.required)}
                  value={selectedVal}
                  onChange={(e) => setFieldValue(field.id, e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  {entityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        }

        if (field.type === 'checkbox') {
          return (
            <div key={field.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.id])}
                  onChange={(e) => setFieldValue(field.id, e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  {field.label}
                  {field.required && <span className="text-rose-500 mr-1">*</span>}
                </span>
              </label>
            </div>
          );
        }

        if (field.type === 'file') {
          const uploadedVal =
            values[field.id] && typeof values[field.id] === 'object' && values[field.id].fileUrl
              ? (values[field.id] as {
                  fileUrl: string;
                  fileName?: string;
                  fileSize?: number;
                  mimeType?: string;
                })
              : null;
          const isUploading = uploadingFieldId === field.id;
          const uploadErr = fileUploadErrors[field.id];
          const isImage = Boolean(
            uploadedVal?.mimeType?.startsWith('image/') ||
              /\.(jpg|jpeg|png|gif|webp)$/i.test(uploadedVal?.fileName || '')
          );

          return (
            <div key={field.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {field.label}
                  {field.required && <span className="text-rose-500 mr-1">*</span>}
                </label>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  حداکثر حجم مجاز: {toPersianDigits(maxFileSizeMB || 5)} مگابایت
                </span>
              </div>

              {uploadedVal ? (
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {isImage ? (
                      <img
                        src={uploadedVal.fileUrl}
                        alt={uploadedVal.fileName || field.label}
                        className="w-12 h-12 rounded-lg object-cover border border-emerald-200 shrink-0 bg-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {uploadedVal.fileName || 'فایل بارگذاری‌شده'}
                      </p>
                      {uploadedVal.fileSize && (
                        <p className="text-[11px] text-slate-500">
                          حجم: {formatBytesCompact(uploadedVal.fileSize)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={uploadedVal.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>مشاهده / دانلود</span>
                    </a>
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>تغییر فایل</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          handleFileSelect(field.id, f);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setFieldValue(field.id, null)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="حذف فایل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed transition cursor-pointer ${
                    isUploading
                      ? 'border-emerald-400 bg-emerald-50/40 opacity-80'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold text-emerald-700">
                        در حال بارگذاری فایل...
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        {field.placeholder || 'برای انتخاب و بارگذاری فایل یا تصویر مدارک کلیک کنید'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        فرمت‌های مجاز: تصویر (JPG, PNG)، PDF، Word و اسناد (حداکثر {toPersianDigits(maxFileSizeMB || 5)} مگابایت)
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    disabled={isUploading}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      handleFileSelect(field.id, f);
                    }}
                  />
                </label>
              )}

              {uploadErr && (
                <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadErr}</span>
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={field.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {field.label}
              {field.required && <span className="text-rose-500 mr-1">*</span>}
            </label>
            {field.type === 'select' ? (
              field.multiple ? (
                <MultiSelectDropdown
                  options={field.options || []}
                  selected={normalizeMultiArray(values[field.id])}
                  onChange={(nextSelected) => setFieldValue(field.id, nextSelected)}
                  placeholder={field.placeholder || 'انتخاب یک یا چند گزینه...'}
                />
              ) : (
                <select
                  required={Boolean(field.required)}
                  value={String(values[field.id] ?? field.options?.[0] ?? '')}
                  onChange={(e) => setFieldValue(field.id, e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )
            ) : field.type === 'textarea' ? (
              <textarea
                rows={2}
                required={Boolean(field.required)}
                placeholder={field.placeholder || ''}
                value={String(values[field.id] ?? '')}
                onChange={(e) => setFieldValue(field.id, e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'phone' ? 'tel' : 'text'}
                dir={field.type === 'phone' ? 'ltr' : undefined}
                required={Boolean(field.required)}
                placeholder={field.placeholder || (field.type === 'phone' ? '09123456789' : '')}
                value={String(values[field.id] ?? '')}
                onChange={(e) => setFieldValue(field.id, e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition ${
                  field.type === 'phone' ? 'font-mono text-left' : ''
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
