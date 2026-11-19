import React from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import {
  CustomFormField,
  EntityDefinition,
  EntitySubField,
  SubmittedCustomFieldValue,
  formatEntityRowSummary,
} from '../utils/publicFormConfig';
import { toPersianDigits } from '../utils/persian';

export type DynamicFormValuesMap = Record<string, any>;

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

    if (field.type === 'checkbox') {
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
    } else if (field.type === 'entity_select') {
      const options = resolveEntitySelectOptions(field, fields, values, entities);
      const val = String(rawVal ?? options[0] ?? '').trim();
      if (field.required && !val) {
        return { error: `لطفاً یک مورد برای «${field.label}» انتخاب نمایید.`, values: [] };
      }
      if (val) {
        const entity = entities.find((e) => e.id === field.entityId);
        result.push({
          id: field.id,
          label: field.label,
          type: field.type,
          value: val,
          entityId: field.entityId,
          entityName: entity?.name,
        });
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
              const sVal = String(subRaw ?? sub.options?.[0] ?? '').trim();
              if (sub.required && !sVal) {
                return {
                  error: `در ردیف ${toPersianDigits(rIdx + 1)} از «${field.label}»، انتخاب «${sub.label}» الزامی است.`,
                  values: [],
                };
              }
              labeledRow[sub.label] = sVal;
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
              ? String(row[sub.id] ?? sub.options?.[0] ?? '')
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
      row[sub.id] = sub.options?.[0] || '';
    } else if (sub.type === 'checkbox') {
      row[sub.id] = false;
    } else {
      row[sub.id] = '';
    }
  }
  return row;
}

interface DynamicFieldRendererProps {
  fields: CustomFormField[];
  values: DynamicFormValuesMap;
  entities: EntityDefinition[];
  onChange: (nextValues: DynamicFormValuesMap) => void;
  compact?: boolean;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  fields,
  values,
  entities,
  onChange,
  compact = false,
}) => {
  const activeFields = fields.filter((f) => f.enabled !== false);
  if (activeFields.length === 0) return null;

  const setFieldValue = (fieldId: string, val: any) => {
    onChange({ ...values, [fieldId]: val });
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
            type={sub.type === 'number' ? 'number' : 'text'}
            required={Boolean(sub.required)}
            placeholder={sub.placeholder || ''}
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

        return (
          <div key={field.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {field.label}
              {field.required && <span className="text-rose-500 mr-1">*</span>}
            </label>
            {field.type === 'select' ? (
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
                type={field.type === 'number' ? 'number' : 'text'}
                required={Boolean(field.required)}
                placeholder={field.placeholder || ''}
                value={String(values[field.id] ?? '')}
                onChange={(e) => setFieldValue(field.id, e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
