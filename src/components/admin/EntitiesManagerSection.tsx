import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle,
  AlertTriangle,
  Edit3,
  ListChecks,
  X,
} from 'lucide-react';
import {
  EntityDefinition,
  EntitySubField,
  ScalarFieldType,
  SCALAR_FIELD_TYPE_LABELS,
} from '../../utils/publicFormConfig';
import { api } from '../../services/api';
import { toPersianDigits } from '../../utils/persian';

interface EntitiesManagerSectionProps {
  entities: EntityDefinition[];
  onRefreshEntities: () => void;
}

export const EntitiesManagerSection: React.FC<EntitiesManagerSectionProps> = ({
  entities,
  onRefreshEntities,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const [name, setName] = useState('');
  const [singularLabel, setSingularLabel] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<EntitySubField[]>([]);
  const [catalogItems, setCatalogItems] = useState<string[]>([]);

  // Sub-field creation inputs
  const [subLabel, setSubLabel] = useState('');
  const [subType, setSubType] = useState<ScalarFieldType>('text');
  const [subPlaceholder, setSubPlaceholder] = useState('');
  const [subRequired, setSubRequired] = useState(true);
  const [subOptions, setSubOptions] = useState<string[]>([]);
  const [subOptInput, setSubOptInput] = useState('');
  const [inlineSubOptInputs, setInlineSubOptInputs] = useState<Record<string, string>>({});

  // Catalog item input (for entity_select)
  const [newCatalogItem, setNewCatalogItem] = useState('');

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const resetEditor = () => {
    setEditingId(null);
    setName('');
    setSingularLabel('');
    setDescription('');
    setFields([]);
    setCatalogItems([]);
    setSubLabel('');
    setSubType('text');
    setSubPlaceholder('');
    setSubRequired(true);
    setSubOptions([]);
    setSubOptInput('');
    setNewCatalogItem('');
    setErrorMsg('');
  };

  const openNewEntity = () => {
    resetEditor();
    setShowEditor(true);
  };

  const openEditEntity = (ent: EntityDefinition) => {
    setEditingId(ent.id);
    setName(ent.name);
    setSingularLabel(ent.singularLabel || ent.name);
    setDescription(ent.description || '');
    setFields(Array.isArray(ent.fields) ? JSON.parse(JSON.stringify(ent.fields)) : []);
    setCatalogItems(Array.isArray(ent.catalogItems) ? [...ent.catalogItems] : []);
    setErrorMsg('');
    setShowEditor(true);
  };

  const handleAddSubOption = () => {
    const val = subOptInput.trim();
    if (!val) return;
    if (!subOptions.includes(val)) setSubOptions((prev) => [...prev, val]);
    setSubOptInput('');
  };

  const handleAddSubField = () => {
    setErrorMsg('');
    const lbl = subLabel.trim();
    if (!lbl) {
      setErrorMsg('عنوان زیرفیلد موجودیت را وارد کنید.');
      return;
    }
    if (subType === 'select' && subOptions.length === 0) {
      setErrorMsg('برای زیرفیلد سلکت‌باکس حداقل یک گزینه وارد کنید.');
      return;
    }
    const sub: EntitySubField = {
      id: `ef_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      label: lbl,
      type: subType,
      placeholder: subPlaceholder.trim(),
      required: subRequired,
      options: subType === 'select' ? [...subOptions] : [],
    };
    setFields((prev) => [...prev, sub]);
    setSubLabel('');
    setSubType('text');
    setSubPlaceholder('');
    setSubRequired(true);
    setSubOptions([]);
    setSubOptInput('');
  };

  const moveSubField = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= fields.length) return;
    setFields((prev) => {
      const list = [...prev];
      const [item] = list.splice(idx, 1);
      list.splice(nextIdx, 0, item);
      return list;
    });
  };

  const addCatalogItem = () => {
    const val = newCatalogItem.trim();
    if (!val) return;
    if (!catalogItems.includes(val)) {
      setCatalogItems((prev) => [...prev, val]);
    }
    setNewCatalogItem('');
  };

  const handleSaveEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('نام موجودیت الزامی است.');
      return;
    }
    if (fields.length === 0 && catalogItems.length === 0) {
      setErrorMsg('حداقل یک زیرفیلد (برای ثبت چندتایی) یا یک آیتم ثابت (برای سلکت‌باکس) اضافه کنید.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        singularLabel: singularLabel.trim() || name.trim(),
        description: description.trim(),
        fields,
        catalogItems,
      };
      if (editingId) {
        await api.updateEntity(editingId, payload);
        setStatusMsg('موجودیت با موفقیت به‌روزرسانی شد.');
      } else {
        await api.createEntity(payload);
        setStatusMsg('موجودیت جدید با موفقیت ثبت شد.');
      }
      setShowEditor(false);
      resetEditor();
      onRefreshEntities();
      setTimeout(() => setStatusMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ذخیره موجودیت');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntity = async (id: string, entName: string) => {
    if (!confirm(`آیا از حذف موجودیت «${entName}» اطمینان دارید؟`)) return;
    try {
      await api.deleteEntity(id);
      onRefreshEntities();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در حذف موجودیت');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              بانک موجودیت‌ها (Entities)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              موجودیت‌هایی مثل «فرد تحت تکفل» (شامل جنسیت، سن، تحصیلات) یا لیست‌های آماده بسازید تا در فرم درخواست عمومی و فرم‌ساز از آن‌ها استفاده کنید.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openNewEntity}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>تعریف موجودیت جدید</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && !showEditor && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Entities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entities.map((ent) => (
          <div
            key={ent.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{ent.name}</h4>
                  {ent.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{ent.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditEntity(ent)}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                    title="ویرایش موجودیت"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntity(ent.id, ent.name)}
                    className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="حذف موجودیت"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  فیلدهای ساختار موجودیت ({toPersianDigits(ent.fields?.length || 0)}):
                </span>
                {ent.fields && ent.fields.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {ent.fields.map((sf) => (
                      <span
                        key={sf.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 font-medium"
                      >
                        <span>{sf.label}</span>
                        <span className="text-[10px] text-emerald-700">
                          ({SCALAR_FIELD_TYPE_LABELS[sf.type]})
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">بدون زیرفیلد</span>
                )}
              </div>

              {ent.catalogItems && ent.catalogItems.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    مقادیر ثابت جهت سلکت‌باکس ({toPersianDigits(ent.catalogItems.length)}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {ent.catalogItems.map((it, idx) => (
                      <span
                        key={`${it}-${idx}`}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>عنوان هر آیتم: {ent.singularLabel || ent.name}</span>
              <button
                type="button"
                onClick={() => openEditEntity(ent)}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                ویرایش فیلدها و مقادیر
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Entity Create / Edit Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingId ? 'ویرایش موجودیت' : 'تعریف موجودیت جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditor(false);
                  resetEditor();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveEntity} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام موجودیت <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: فرد تحت تکفل یا مراکز درمانی"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    عنوان دکمه افزودن هر ردیف (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={singularLabel}
                    onChange={(e) => setSingularLabel(e.target.value)}
                    placeholder="مثال: فرد تحت تکفل"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  توضیحات راهنما (اختیاری)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحی که زیر عنوان در فرم نمایش داده شود..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Sub-fields section */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900">
                    ۱. فیلدهای داخلی موجودیت (برای افزودن چندتایی در فرم)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    مثلاً برای موجودیت «فرد تحت تکفل» می‌توانید فیلدهای «جنسیت»، «سن» و «میزان تحصیلات» را تعریف کنید.
                  </p>
                </div>

                {/* Add Sub-field Box */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">عنوان فیلد</label>
                      <input
                        type="text"
                        value={subLabel}
                        onChange={(e) => setSubLabel(e.target.value)}
                        placeholder="مثال: سن یا جنسیت"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">نوع فیلد</label>
                      <select
                        value={subType}
                        onChange={(e) => setSubType(e.target.value as ScalarFieldType)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {Object.entries(SCALAR_FIELD_TYPE_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </div>
                    {subType !== 'checkbox' && (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">راهنما (اختیاری)</label>
                        <input
                          type="text"
                          value={subPlaceholder}
                          onChange={(e) => setSubPlaceholder(e.target.value)}
                          placeholder="مثال: ۱۲"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {subType === 'select' && (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                      <span className="block font-bold text-emerald-900 text-[11px]">
                        گزینه‌های این سلکت‌باکس:
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={subOptInput}
                          onChange={(e) => setSubOptInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubOption();
                            }
                          }}
                          placeholder="مثال: دیپلم"
                          className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddSubOption}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-semibold cursor-pointer"
                        >
                          افزودن گزینه
                        </button>
                      </div>
                      {subOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {subOptions.map((o, idx) => (
                            <span
                              key={`${o}-${idx}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-300 rounded-md text-[11px]"
                            >
                              {o}
                              <button
                                type="button"
                                onClick={() =>
                                  setSubOptions((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-rose-500 font-bold"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={subRequired}
                        onChange={(e) => setSubRequired(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>اجباری در هر ردیف</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSubField}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>افزودن به ساختار موجودیت</span>
                    </button>
                  </div>
                </div>

                {/* Existing Sub-fields */}
                <div className="space-y-2">
                  {fields.map((sf, idx) => (
                    <div
                      key={sf.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {SCALAR_FIELD_TYPE_LABELS[sf.type]}
                          </span>
                          <input
                            type="text"
                            value={sf.label}
                            onChange={(e) =>
                              setFields((prev) =>
                                prev.map((item) =>
                                  item.id === sf.id ? { ...item, label: e.target.value } : item
                                )
                              )
                            }
                            className="px-2 py-1 rounded-lg border border-slate-300 font-bold text-slate-800 outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <label className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(sf.required)}
                              onChange={(e) =>
                                setFields((prev) =>
                                  prev.map((item) =>
                                    item.id === sf.id
                                      ? { ...item, required: e.target.checked }
                                      : item
                                  )
                                )
                              }
                            />
                            <span>اجباری</span>
                          </label>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSubField(idx, -1)}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === fields.length - 1}
                            onClick={() => moveSubField(idx, 1)}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFields((prev) => prev.filter((item) => item.id !== sf.id))
                            }
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {sf.type === 'select' && (
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={inlineSubOptInputs[sf.id] || ''}
                              onChange={(e) =>
                                setInlineSubOptInputs((prev) => ({
                                  ...prev,
                                  [sf.id]: e.target.value,
                                }))
                              }
                              placeholder="افزودن گزینه جدید..."
                              className="flex-1 px-2 py-1 rounded border border-slate-300 bg-white text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = (inlineSubOptInputs[sf.id] || '').trim();
                                if (!val) return;
                                setFields((prev) =>
                                  prev.map((item) =>
                                    item.id === sf.id
                                      ? {
                                          ...item,
                                          options: (item.options || []).includes(val)
                                            ? item.options
                                            : [...(item.options || []), val],
                                        }
                                      : item
                                  )
                                );
                                setInlineSubOptInputs((prev) => ({ ...prev, [sf.id]: '' }));
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold"
                            >
                              افزودن
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(sf.options || []).map((opt, oIdx) => (
                              <span
                                key={`${opt}-${oIdx}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px]"
                              >
                                {opt}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFields((prev) =>
                                      prev.map((item) =>
                                        item.id === sf.id
                                          ? {
                                              ...item,
                                              options: (item.options || []).filter(
                                                (_, i) => i !== oIdx
                                              ),
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="text-rose-500 font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Catalog Items section (for Entity Select Boxes) */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <ListChecks className="w-4 h-4 text-teal-600" />
                  <div>
                    <h4 className="font-bold text-slate-900">
                      ۲. مقادیر / رکوردهای ثابت موجودیت (اختیاری - جهت سلکت‌باکس از موجودیت)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      اگر می‌خواهید در فرم‌ها فیلدی از نوع «سلکت‌باکس از این موجودیت» بگذارید (مثلاً لیست شعب، مراکز همکار، یا نوع بیمه)، موارد را اینجا ثبت کنید.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatalogItem}
                    onChange={(e) => setNewCatalogItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCatalogItem();
                      }
                    }}
                    placeholder="مورد جدید (مثال: درمانگاه خیریه شماره ۱)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={addCatalogItem}
                    className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl cursor-pointer"
                  >
                    افزودن
                  </button>
                </div>

                {catalogItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {catalogItems.map((it, idx) => (
                      <span
                        key={`${it}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px]"
                      >
                        <span>{it}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setCatalogItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-rose-500 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditor(false);
                    resetEditor();
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'در حال ذخیره...' : 'ذخیره موجودیت'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
