import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  AlertTriangle,
  Upload,
  Smartphone,
} from 'lucide-react';
import {
  CustomFieldType,
  CustomFormField,
  EntityDefinition,
  FIELD_TYPE_LABELS,
} from '../../utils/publicFormConfig';

interface FormFieldsEditorProps {
  fields: CustomFormField[];
  entities: EntityDefinition[];
  onChange: (nextFields: CustomFormField[]) => void;
  onNavigateToEntities?: () => void;
  emptyText?: string;
}

export const FormFieldsEditor: React.FC<FormFieldsEditorProps> = ({
  fields,
  entities,
  onChange,
  onNavigateToEntities,
  emptyText = 'هنوز فیلدی اضافه نشده است.',
}) => {
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newFieldOptInput, setNewFieldOptInput] = useState('');
  const [newFieldMultiple, setNewFieldMultiple] = useState(false);
  const [newFieldEntityId, setNewFieldEntityId] = useState<string>(() => entities[0]?.id || '');
  const [newEntitySelectSource, setNewEntitySelectSource] = useState<'both' | 'catalog' | 'form_rows'>('both');
  const [inlineOptionInputs, setInlineOptionInputs] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState('');

  const effectiveEntityId = newFieldEntityId || entities[0]?.id || '';

  const addNewFieldOption = () => {
    const val = newFieldOptInput.trim();
    if (!val) return;
    if (!newFieldOptions.includes(val)) {
      setNewFieldOptions((prev) => [...prev, val]);
    }
    setNewFieldOptInput('');
  };

  const handleAddField = () => {
    setLocalError('');
    const label = newFieldLabel.trim();
    if (!label) {
      setLocalError('لطفاً عنوان فیلد جدید را وارد نمایید.');
      return;
    }
    if (newFieldType === 'select' && newFieldOptions.length === 0) {
      setLocalError('برای فیلد از نوع سلکت‌باکس، حداقل یک گزینه اضافه کنید.');
      return;
    }
    if ((newFieldType === 'entity_list' || newFieldType === 'entity_select') && !effectiveEntityId) {
      setLocalError('لطفاً ابتدا در بخش «بانک موجودیت‌ها» یک موجودیت تعریف کنید و آن را انتخاب نمایید.');
      return;
    }

    const field: CustomFormField = {
      id: `cf_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      label,
      type: newFieldType,
      placeholder: newFieldPlaceholder.trim(),
      required: newFieldRequired,
      options: newFieldType === 'select' ? [...newFieldOptions] : [],
      multiple:
        newFieldType === 'select' || newFieldType === 'entity_select'
          ? newFieldMultiple
          : undefined,
      entityId:
        newFieldType === 'entity_list' || newFieldType === 'entity_select'
          ? effectiveEntityId
          : undefined,
      entitySelectSource: newFieldType === 'entity_select' ? newEntitySelectSource : undefined,
      enabled: true,
    };

    onChange([...fields, field]);

    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldPlaceholder('');
    setNewFieldRequired(false);
    setNewFieldOptions([]);
    setNewFieldOptInput('');
    setNewFieldMultiple(false);
  };

  const updateField = (id: string, patch: Partial<CustomFormField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const deleteField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= fields.length) return;
    const list = [...fields];
    const [item] = list.splice(idx, 1);
    list.splice(nextIdx, 0, item);
    onChange(list);
  };

  const addOptionToExisting = (fieldId: string) => {
    const val = (inlineOptionInputs[fieldId] || '').trim();
    if (!val) return;
    onChange(
      fields.map((f) => {
        if (f.id !== fieldId) return f;
        const currentOpts = f.options || [];
        if (currentOpts.includes(val)) return f;
        return { ...f, options: [...currentOpts, val] };
      })
    );
    setInlineOptionInputs((prev) => ({ ...prev, [fieldId]: '' }));
  };

  const removeOptionFromExisting = (fieldId: string, optIdx: number) => {
    setLocalError('');
    onChange(
      fields.map((f) => {
        if (f.id !== fieldId) return f;
        const currentOpts = f.options || [];
        if (currentOpts.length <= 1) {
          setLocalError('فیلد سلکت‌باکس باید حداقل یک گزینه داشته باشد.');
          return f;
        }
        return { ...f, options: currentOpts.filter((_, i) => i !== optIdx) };
      })
    );
  };

  return (
    <div className="space-y-4">
      {localError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {/* Add New Field Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">عنوان فیلد جدید</label>
            <input
              type="text"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              placeholder="مثال: افراد تحت تکفل یا وضعیت بیمه"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">نوع فیلد</label>
            <select
              value={newFieldType}
              onChange={(e) => {
                const nextType = e.target.value as CustomFieldType;
                setNewFieldType(nextType);
                if (
                  (nextType === 'entity_list' || nextType === 'entity_select') &&
                  !newFieldLabel.trim() &&
                  entities[0]
                ) {
                  setNewFieldLabel(entities[0].name);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {Object.entries(FIELD_TYPE_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>

          {newFieldType !== 'checkbox' &&
            newFieldType !== 'entity_list' &&
            newFieldType !== 'entity_select' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  متن راهنما / Placeholder (اختیاری)
                </label>
                <input
                  type="text"
                  value={newFieldPlaceholder}
                  onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                  placeholder={
                    newFieldType === 'file'
                      ? 'مثال: تصویر شناسنامه یا مدارک خود را بارگذاری نمایید'
                      : newFieldType === 'phone'
                      ? 'مثال: 09123456789'
                      : 'مثال: انتخاب یا وارد کنید...'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

          {(newFieldType === 'entity_list' || newFieldType === 'entity_select') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">انتخاب موجودیت متصل</label>
                {onNavigateToEntities && (
                  <button
                    type="button"
                    onClick={onNavigateToEntities}
                    className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    مدیریت موجودیت‌ها
                  </button>
                )}
              </div>
              {entities.length === 0 ? (
                <div className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-[11px]">
                  هیچ موجودیتی تعریف نشده است.
                </div>
              ) : (
                <select
                  value={effectiveEntityId}
                  onChange={(e) => setNewFieldEntityId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                >
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Entity Select Source selector */}
        {newFieldType === 'entity_select' && (
          <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
            <label className="block font-bold text-teal-900 text-[11px]">
              منبع گزینه‌های سلکت‌باکس از موجودیت:
            </label>
            <select
              value={newEntitySelectSource}
              onChange={(e) =>
                setNewEntitySelectSource(e.target.value as 'both' | 'catalog' | 'form_rows')
              }
              className="w-full px-3 py-1.5 rounded-lg border border-teal-300 bg-white outline-none text-xs"
            >
              <option value="both">ترکیب مقادیر ثابت موجودیت + ردیف‌های افزوده‌شده در همین فرم</option>
              <option value="catalog">فقط مقادیر ثابت تعریف‌شده در بانک موجودیت‌ها</option>
              <option value="form_rows">فقط ردیف‌هایی که کاربر در فیلد موجودیتی همین فرم اضافه کرده</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer text-teal-900 font-semibold text-[11px] pt-0.5">
              <input
                type="checkbox"
                checked={newFieldMultiple}
                onChange={(e) => setNewFieldMultiple(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span>امکان انتخاب چند گزینه به صورت هم‌زمان (چندانتخابی / Multi-Select)</span>
            </label>
          </div>
        )}

        {/* Options builder if new field is SELECT */}
        {newFieldType === 'select' && (
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block font-bold text-emerald-900 text-[11px]">
                گزینه‌های این سلکت‌باکس را اضافه کنید:
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-emerald-900 font-semibold text-[11px]">
                <input
                  type="checkbox"
                  checked={newFieldMultiple}
                  onChange={(e) => setNewFieldMultiple(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>امکان انتخاب چند گزینه (چندانتخابی / Multi-Select)</span>
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFieldOptInput}
                onChange={(e) => setNewFieldOptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addNewFieldOption();
                  }
                }}
                placeholder="مثال: بیمه تأمین اجتماعی"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={addNewFieldOption}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن گزینه</span>
              </button>
            </div>

            {newFieldOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {newFieldOptions.map((opt, idx) => (
                  <span
                    key={`${opt}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-medium text-slate-800"
                  >
                    <span>{opt}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setNewFieldOptions((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-rose-500 hover:text-rose-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={newFieldRequired}
              onChange={(e) => setNewFieldRequired(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>پر کردن این فیلد در فرم اجباری باشد</span>
          </label>

          <button
            type="button"
            onClick={handleAddField}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>افزودن فیلد به فرم</span>
          </button>
        </div>
      </div>

      {/* List of Existing Fields */}
      {fields.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl bg-white/60">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, idx) => {
            const linkedEntity = entities.find((e) => e.id === field.entityId);
            return (
              <div
                key={field.id}
                className={`p-4 rounded-xl border bg-white space-y-3 text-xs ${
                  field.enabled === false ? 'opacity-65 border-slate-200' : 'border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold text-[11px] inline-flex items-center gap-1 ${
                        field.type === 'entity_list' || field.type === 'entity_select'
                          ? 'bg-emerald-100 text-emerald-800'
                          : field.type === 'file'
                          ? 'bg-indigo-100 text-indigo-800'
                          : field.type === 'phone'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {(field.type === 'entity_list' || field.type === 'entity_select') && (
                        <Layers className="w-3 h-3" />
                      )}
                      {field.type === 'file' && <Upload className="w-3 h-3" />}
                      {field.type === 'phone' && <Smartphone className="w-3 h-3" />}
                      {FIELD_TYPE_LABELS[field.type]}
                    </span>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(field.type === 'select' || field.type === 'entity_select') && (
                      <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 border border-teal-200 cursor-pointer text-[11px] text-teal-900 font-semibold">
                        <input
                          type="checkbox"
                          checked={Boolean(field.multiple)}
                          onChange={(e) =>
                            updateField(field.id, { multiple: e.target.checked })
                          }
                          className="rounded text-teal-600"
                        />
                        <span>چندانتخابی</span>
                      </label>
                    )}

                    <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) =>
                          updateField(field.id, { required: e.target.checked })
                        }
                        className="rounded text-emerald-600"
                      />
                      <span>اجباری</span>
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        updateField(field.id, { enabled: field.enabled === false })
                      }
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        field.enabled !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {field.enabled !== false ? 'فعال' : 'مخفی'}
                    </button>

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveField(idx, -1)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="انتقال به بالا"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === fields.length - 1}
                      onClick={() => moveField(idx, 1)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="انتقال به پایین"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteField(field.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="حذف کامل این فیلد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {(field.type === 'entity_list' || field.type === 'entity_select') && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center gap-2 justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-900">موجودیت متصل:</span>
                      <select
                        value={field.entityId || ''}
                        onChange={(e) => updateField(field.id, { entityId: e.target.value })}
                        className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-white font-semibold text-slate-800 outline-none"
                      >
                        {entities.map((ent) => (
                          <option key={ent.id} value={ent.id}>
                            {ent.name}
                          </option>
                        ))}
                      </select>
                      {linkedEntity && (
                        <span className="text-emerald-700">
                          ({linkedEntity.fields?.length || 0} زیرفیلد)
                        </span>
                      )}
                    </div>

                    {field.type === 'entity_select' && (
                      <select
                        value={field.entitySelectSource || 'both'}
                        onChange={(e) =>
                          updateField(field.id, {
                            entitySelectSource: e.target.value as 'both' | 'catalog' | 'form_rows',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg border border-teal-300 bg-white text-slate-700 outline-none"
                      >
                        <option value="both">مقادیر ثابت + ردیف‌های فرم</option>
                        <option value="catalog">فقط مقادیر ثابت موجودیت</option>
                        <option value="form_rows">فقط ردیف‌های افزوده‌شده در فرم</option>
                      </select>
                    )}
                  </div>
                )}

                {field.type !== 'checkbox' &&
                  field.type !== 'entity_list' &&
                  field.type !== 'entity_select' &&
                  field.type !== 'select' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 shrink-0">متن راهنما:</span>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) =>
                          updateField(field.id, { placeholder: e.target.value })
                        }
                        placeholder="متن راهنما داخل فیلد..."
                        className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-[11px]"
                      />
                    </div>
                  )}

                {field.type === 'select' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="block text-[11px] font-bold text-slate-700">
                      مدیریت گزینه‌های «{field.label}»:
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inlineOptionInputs[field.id] || ''}
                        onChange={(e) =>
                          setInlineOptionInputs((prev) => ({
                            ...prev,
                            [field.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addOptionToExisting(field.id);
                          }
                        }}
                        placeholder="افزودن گزینه جدید..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => addOptionToExisting(field.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] cursor-pointer"
                      >
                        افزودن
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(field.options || []).map((opt, oIdx) => (
                        <span
                          key={`${opt}-${oIdx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => removeOptionFromExisting(field.id, oIdx)}
                            className="text-rose-500 hover:text-rose-700 font-bold"
                            title="حذف گزینه"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
