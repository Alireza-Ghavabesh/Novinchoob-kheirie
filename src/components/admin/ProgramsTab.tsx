import React, { useState, useMemo } from 'react';
import {
  AppConfig,
  Program,
  Category,
  StaffUser,
} from '../../types';
import {
  formatToman,
  numberToPersianWords,
  toPersianDigits,
  getTodayShamsi,
} from '../../utils/persian';
import {
  CustomFormField,
  EntityDefinition,
  formatEntityRowSummary,
  parseSubmittedCustomFields,
} from '../../utils/publicFormConfig';
import {
  parseProgramFormSchema,
  parseProgramInstanceFieldSchema,
} from '../../utils/programFormConfig';
import {
  Plus,
  Search,
  Briefcase,
  Layers,
  Trash2,
  Edit3,
  Sliders,
  Sparkles,
  X,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
} from 'lucide-react';
import { api } from '../../services/api';
import { ShamsiDatePicker } from '../ShamsiDatePicker';
import {
  DynamicFieldRenderer,
  DynamicFormValuesMap,
  hydrateValuesFromSubmission,
  validateAndExtractCustomFields,
} from '../DynamicFieldRenderer';
import { FormFieldsEditor } from './FormFieldsEditor';
import { ProgramFormBuilderSection } from './ProgramFormBuilderSection';

interface ProgramsTabProps {
  programs: Program[];
  programCategories: Category[];
  currentUser: StaffUser;
  config: AppConfig | null;
  entities: EntityDefinition[];
  onRefresh: () => void;
  onRefreshCategories: () => void;
  onConfigUpdated: (config: AppConfig) => void;
  onOpenFormBuilder?: () => void;
}

const PIPELINE_STAGES = [
  { id: 1, title: '۱. تدوین و امکان‌سنجی', color: 'bg-slate-100 text-slate-700' },
  { id: 2, title: '۲. تصویب و تأمین اعتبار', color: 'bg-blue-100 text-blue-800' },
  { id: 3, title: '۳. اجرا و عملیات میدانی', color: 'bg-amber-100 text-amber-800' },
  { id: 4, title: '۴. تکمیل و بهره‌برداری', color: 'bg-emerald-100 text-emerald-800' },
];

export const ProgramsTab: React.FC<ProgramsTabProps> = ({
  programs,
  programCategories,
  currentUser,
  config,
  entities,
  onRefresh,
  onRefreshCategories,
  onConfigUpdated,
  onOpenFormBuilder,
}) => {
  const canCreate = currentUser.username === 'admin' || Boolean(currentUser.perms?.createProg);
  const canDecide = currentUser.username === 'admin' || Boolean(currentUser.perms?.decideProg);
  const canManageBuilder =
    currentUser.username === 'admin' ||
    Boolean(currentUser.perms?.manageSettings) ||
    canCreate ||
    canDecide;

  const programSchema = useMemo(
    () => parseProgramFormSchema(config?.programFormConfig),
    [config?.programFormConfig]
  );

  const [subTab, setSubTab] = useState<'list' | 'builder'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<number | 'ALL'>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Create / Edit Program Modal State
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProg, setEditingProg] = useState<Program | null>(null);
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('');
  const [requestedBudget, setRequestedBudget] = useState<number>(0);
  const [volunteers, setVolunteers] = useState<number>(0);
  const [roles, setRoles] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hideBuiltinFields, setHideBuiltinFields] = useState(false);
  const [instanceCustomFields, setInstanceCustomFields] = useState<CustomFormField[]>([]);
  const [showInstanceFieldDesigner, setShowInstanceFieldDesigner] = useState(false);
  const [customValues, setCustomValues] = useState<DynamicFormValuesMap>({});
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick inline add category inside modal
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [addingQuickCat, setAddingQuickCat] = useState(false);

  // Pipeline & Log Modal
  const [selectedProg, setSelectedProg] = useState<Program | null>(null);
  const [newStage, setNewStage] = useState<number>(1);
  const [newProgress, setNewProgress] = useState<number>(0);
  const [newApprovedBudget, setNewApprovedBudget] = useState<number>(0);
  const [logNote, setLogNote] = useState('');
  const [savingPipeline, setSavingPipeline] = useState(false);

  const activeModalCustomFields = useMemo(() => {
    const map = new Map<string, CustomFormField>();
    if (!hideBuiltinFields) {
      for (const f of programSchema.customFields) {
        if (f.enabled !== false) map.set(f.id, f);
      }
    }
    for (const f of instanceCustomFields) {
      if (f.enabled !== false) map.set(f.id, f);
    }
    return Array.from(map.values());
  }, [hideBuiltinFields, programSchema.customFields, instanceCustomFields]);

  const filteredPrograms = programs.filter((p) => {
    if (stageFilter !== 'ALL' && p.pipelineStage !== stageFilter) return false;
    if (catFilter !== 'ALL' && (p.cat || '') !== catFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const customText = parseSubmittedCustomFields(p.customFields)
        .map((c) => `${c.label} ${c.value}`)
        .join(' ')
        .toLowerCase();
      if (
        !p.title.toLowerCase().includes(q) &&
        !(p.cat || '').toLowerCase().includes(q) &&
        !(p.desc || '').toLowerCase().includes(q) &&
        !customText.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const openCreateModal = (customOnlyMode = false) => {
    const today = getTodayShamsi();
    setEditingProg(null);
    setTitle('');
    setCat(programCategories[0]?.name || '');
    setRequestedBudget(0);
    setVolunteers(0);
    setRoles('');
    setDesc('');
    setStartDate(today.formatted);
    setEndDate('');
    setHideBuiltinFields(customOnlyMode);
    setInstanceCustomFields([]);
    setShowInstanceFieldDesigner(customOnlyMode);
    setCustomValues({});
    setShowQuickAddCat(false);
    setQuickCatName('');
    setModalError('');
    setShowProgramModal(true);
  };

  const openEditModal = (p: Program) => {
    const parsedInstance = parseProgramInstanceFieldSchema(p.fieldSchema);
    const submittedCustom = parseSubmittedCustomFields(p.customFields);

    const mergedFieldsMap = new Map<string, CustomFormField>();
    if (!parsedInstance.hideBuiltinFields) {
      for (const f of programSchema.customFields) {
        if (f.enabled !== false) mergedFieldsMap.set(f.id, f);
      }
    }
    for (const f of parsedInstance.fields) {
      if (f.enabled !== false) mergedFieldsMap.set(f.id, f);
    }
    const mergedFields = Array.from(mergedFieldsMap.values());

    setEditingProg(p);
    setTitle(p.title || '');
    setCat(p.cat || '');
    setRequestedBudget(p.requestedBudget || 0);
    setVolunteers(p.volunteers || 0);
    setRoles(p.roles || '');
    setDesc(p.desc || '');
    setStartDate(p.startDate || '');
    setEndDate(p.endDate || '');
    setHideBuiltinFields(Boolean(parsedInstance.hideBuiltinFields));
    setInstanceCustomFields(JSON.parse(JSON.stringify(parsedInstance.fields || [])));
    setShowInstanceFieldDesigner(parsedInstance.fields.length > 0);
    setCustomValues(hydrateValuesFromSubmission(mergedFields, submittedCustom, entities));
    setShowQuickAddCat(false);
    setQuickCatName('');
    setModalError('');
    setShowProgramModal(true);
  };

  const handleQuickAddCategory = async () => {
    const val = quickCatName.trim();
    if (!val) return;
    setAddingQuickCat(true);
    setModalError('');
    try {
      await api.addProgramCategory(val);
      setCat(val);
      setQuickCatName('');
      setShowQuickAddCat(false);
      onRefreshCategories();
    } catch (err: any) {
      setModalError(err.message || 'خطا در ثبت دسته‌بندی جدید');
    } finally {
      setAddingQuickCat(false);
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!title.trim()) {
      setModalError(`لطفاً «${programSchema.builtin.titleLabel}» را وارد نمایید.`);
      return;
    }

    const b = programSchema.builtin;
    if (!hideBuiltinFields) {
      if (b.showCat && b.requiredCat && !(cat || programCategories[0]?.name || '').trim()) {
        setModalError(`لطفاً «${b.catLabel}» را انتخاب نمایید.`);
        return;
      }
      if (b.showDesc && b.requiredDesc && !desc.trim()) {
        setModalError(`لطفاً «${b.descLabel}» را تکمیل نمایید.`);
        return;
      }
      if (b.showRequestedBudget && b.requiredRequestedBudget && requestedBudget <= 0) {
        setModalError(`لطفاً «${b.requestedBudgetLabel}» را وارد نمایید.`);
        return;
      }
      if (b.showStartDate && b.requiredStartDate && !startDate.trim()) {
        setModalError(`لطفاً «${b.startDateLabel}» را وارد نمایید.`);
        return;
      }
      if (b.showEndDate && b.requiredEndDate && !endDate.trim()) {
        setModalError(`لطفاً «${b.endDateLabel}» را وارد نمایید.`);
        return;
      }
    }

    const { error: cfErr, values: extractedCustomValues } = validateAndExtractCustomFields(
      activeModalCustomFields,
      customValues,
      entities
    );
    if (cfErr) {
      setModalError(cfErr);
      return;
    }

    setSubmitting(true);
    try {
      const selectedCat =
        hideBuiltinFields || !b.showCat
          ? cat.trim()
          : (cat || programCategories[0]?.name || '').trim();

      const serializedFieldSchema =
        hideBuiltinFields || instanceCustomFields.length > 0
          ? JSON.stringify({
              hideBuiltinFields,
              fields: instanceCustomFields,
            })
          : '';

      const payload = {
        title: title.trim(),
        cat: selectedCat,
        requestedBudget: hideBuiltinFields || !b.showRequestedBudget ? 0 : requestedBudget,
        volunteers: hideBuiltinFields || !b.showVolunteers ? 0 : volunteers,
        roles: hideBuiltinFields || !b.showRoles ? '' : roles.trim(),
        desc: hideBuiltinFields || !b.showDesc ? '' : desc.trim(),
        startDate: hideBuiltinFields || !b.showStartDate ? '' : startDate.trim(),
        endDate: hideBuiltinFields || !b.showEndDate ? '' : endDate.trim(),
        customFields: JSON.stringify(extractedCustomValues),
        fieldSchema: serializedFieldSchema,
      };

      if (editingProg) {
        await api.updateProgram(editingProg.id, payload);
        setStatusMsg(`پروژه «${payload.title}» با موفقیت ویرایش و ذخیره شد.`);
      } else {
        await api.createProgram(payload);
        setStatusMsg(`پروژه «${payload.title}» با موفقیت ایجاد شد.`);
      }

      setShowProgramModal(false);
      setEditingProg(null);
      onRefresh();
      setTimeout(() => setStatusMsg(''), 3500);
    } catch (err: any) {
      setModalError(err.message || 'خطا در ذخیره طرح / پروژه');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPipelineModal = (p: Program) => {
    setSelectedProg(p);
    setNewStage(p.pipelineStage || 1);
    setNewProgress(p.progressPercent || 0);
    setNewApprovedBudget(p.approvedBudget || p.requestedBudget || 0);
    setLogNote('');
  };

  const handleSavePipeline = async () => {
    if (!selectedProg) return;
    setSavingPipeline(true);
    setErrorMsg('');
    try {
      const today = getTodayShamsi();
      await api.updateProgram(selectedProg.id, {
        pipelineStage: newStage,
        progressPercent: newProgress,
        approvedBudget: newApprovedBudget,
        status: newStage >= 2 ? 'APPROVED' : selectedProg.status,
        approvedDate:
          newStage >= 2 && !selectedProg.approvedDate ? today.formatted : selectedProg.approvedDate,
        approvedBy:
          newStage >= 2 && !selectedProg.approvedBy ? currentUser.name : selectedProg.approvedBy,
      });

      if (logNote.trim()) {
        await api.addProgramLog(selectedProg.id, logNote.trim(), today.formatted);
      }

      setSelectedProg(null);
      setStatusMsg('وضعیت پایپ‌لاین و گزارش پیشرفت پروژه با موفقیت ذخیره شد.');
      setTimeout(() => setStatusMsg(''), 3500);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ذخیره تغییرات پایپ‌لاین');
    } finally {
      setSavingPipeline(false);
    }
  };

  const handleDelete = async (p: Program) => {
    if (!confirm(`آیا از حذف طرح «${p.title}» و گزارش‌های پیشرفت آن اطمینان دارید؟`)) return;
    setErrorMsg('');
    try {
      await api.deleteProgram(p.id);
      setStatusMsg(`پروژه «${p.title}» حذف شد.`);
      setTimeout(() => setStatusMsg(''), 3000);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در حذف طرح');
    }
  };

  const b = programSchema.builtin;

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation Bar (Matching Form Builder) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setSubTab('list')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'list'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4 text-emerald-600" />
            <span>طرح‌ها و پروژه‌ها ({toPersianDigits(programs.length)})</span>
          </button>

          {canManageBuilder && (
            <button
              type="button"
              onClick={() => setSubTab('builder')}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'builder'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4 text-teal-600" />
              <span>طراحی فیلدها و دسته‌بندی‌ها</span>
            </button>
          )}
        </div>

        {subTab === 'list' && canCreate && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openCreateModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>پروژه با فیلدهای دلخواه</span>
            </button>

            <button
              type="button"
              onClick={() => openCreateModal(false)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تعریف طرح / پروژه جدید</span>
            </button>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {subTab === 'builder' && canManageBuilder ? (
        <ProgramFormBuilderSection
          config={config}
          programCategories={programCategories}
          entities={entities}
          onConfigUpdated={onConfigUpdated}
          onRefreshCategories={onRefreshCategories}
          onOpenEntitiesTab={onOpenFormBuilder}
        />
      ) : (
        <>
          {/* Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="جستجوی عنوان، موضوع یا فیلدهای پروژه..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="ALL">همه دسته‌بندی‌ها</option>
                {programCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={stageFilter}
                onChange={(e) =>
                  setStageFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                }
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="ALL">همه مراحل پایپ‌لاین</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Programs Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredPrograms.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                هیچ طرحی با فیلترهای انتخابی یافت نشد.
              </div>
            ) : (
              filteredPrograms.map((p) => {
                const currentStageObj =
                  PIPELINE_STAGES.find((s) => s.id === p.pipelineStage) || PIPELINE_STAGES[0];
                const customItems = parseSubmittedCustomFields(p.customFields);
                const parsedInstance = parseProgramInstanceFieldSchema(p.fieldSchema);
                const isCustomOnly = Boolean(parsedInstance.hideBuiltinFields);

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-emerald-300 transition flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Top Title & Category */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            {p.cat && (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block border border-emerald-200">
                                {p.cat}
                              </span>
                            )}
                            {isCustomOnly && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-amber-200">
                                <Sparkles className="w-3 h-3" />
                                فیلدهای اختصاصی
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {p.title}
                          </h3>
                        </div>

                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${currentStageObj.color}`}
                        >
                          مرحله {toPersianDigits(p.pipelineStage)}
                        </span>
                      </div>

                      {/* Description */}
                      {p.desc && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {p.desc}
                        </p>
                      )}

                      {/* 4-Stage Visual Stepper */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[11px] font-medium text-slate-500">
                          <span>مرحله: {currentStageObj.title}</span>
                          <span className="font-bold text-emerald-800">
                            {toPersianDigits(p.progressPercent)}% پیشرفت فیزیکی
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, p.progressPercent))}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-1 pt-1 text-center text-[10px]">
                          {PIPELINE_STAGES.map((s) => (
                            <div
                              key={s.id}
                              className={`py-1 rounded font-medium ${
                                p.pipelineStage >= s.id
                                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                                  : 'bg-slate-50 text-slate-400'
                              }`}
                            >
                              {s.id === 1 && 'امکان‌سنجی'}
                              {s.id === 2 && 'تأمین بودجه'}
                              {s.id === 3 && 'عملیات میدانی'}
                              {s.id === 4 && 'بهره‌برداری'}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Stats Grid (Budget, Volunteers, Dates, Logs) */}
                      {(!isCustomOnly ||
                        p.approvedBudget > 0 ||
                        p.requestedBudget > 0 ||
                        p.volunteers > 0 ||
                        p.startDate ||
                        p.endDate ||
                        (p.logs?.length || 0) > 0) && (
                        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {(p.approvedBudget > 0 || p.requestedBudget > 0 || !isCustomOnly) && (
                            <div>
                              <span className="text-[11px] text-slate-500 block">بودجه مصوب:</span>
                              <span className="font-bold text-emerald-800">
                                {p.approvedBudget > 0
                                  ? `${formatToman(p.approvedBudget)} تومان`
                                  : p.requestedBudget > 0
                                  ? `${formatToman(p.requestedBudget)} (در انتظار)`
                                  : '—'}
                              </span>
                            </div>
                          )}

                          {(p.volunteers > 0 || !isCustomOnly) && (
                            <div>
                              <span className="text-[11px] text-slate-500 block">نیروهای داوطلب:</span>
                              <span className="font-semibold text-slate-800">
                                {p.volunteers > 0
                                  ? `${toPersianDigits(p.volunteers)} نفر داوطلب`
                                  : '—'}
                              </span>
                            </div>
                          )}

                          {(p.startDate || p.endDate || !isCustomOnly) && (
                            <div>
                              <span className="text-[11px] text-slate-500 block">بازه اجرایی:</span>
                              <span className="text-slate-700 font-mono text-[11px]">
                                {p.startDate || '—'} الی {p.endDate || '—'}
                              </span>
                            </div>
                          )}

                          <div>
                            <span className="text-[11px] text-slate-500 block">گزارشات ثبت‌شده:</span>
                            <span className="text-slate-700 font-semibold">
                              {toPersianDigits(p.logs?.length || 0)} گزارش روزانه
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Custom Fields Preview on Card */}
                      {customItems.length > 0 && (
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            فیلدهای سفارشی پروژه ({toPersianDigits(customItems.length)}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {customItems.slice(0, 6).map((item, idx) => (
                              <div
                                key={`${item.id}-${idx}`}
                                className={`bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 ${
                                  item.type === 'textarea' || item.type === 'entity_list'
                                    ? 'sm:col-span-2'
                                    : ''
                                }`}
                              >
                                <span className="text-slate-500 block text-[10px] mb-0.5">
                                  {item.label}:
                                </span>
                                {item.type === 'file' && item.fileUrl ? (
                                  <a
                                    href={item.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span className="truncate">{item.fileName || item.value}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                ) : item.type === 'entity_list' && Array.isArray(item.items) ? (
                                  <div className="space-y-1 text-slate-800">
                                    {item.items.slice(0, 2).map((r, rIdx) => (
                                      <p key={rIdx} className="truncate text-[11px]">
                                        {formatEntityRowSummary(r, rIdx)}
                                      </p>
                                    ))}
                                    {item.items.length > 2 && (
                                      <span className="text-[10px] text-slate-500">
                                        و {toPersianDigits(item.items.length - 2)} مورد دیگر...
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="font-semibold text-slate-800 break-words">
                                    {item.value || '—'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {customItems.length > 6 && (
                            <p className="text-[10px] text-slate-500 text-center">
                              برای مشاهده {toPersianDigits(customItems.length - 6)} فیلد دیگر، پنجره جزئیات یا ویرایش را باز کنید.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenPipelineModal(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>مدیریت پایپ‌لاین و گزارش</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {(canCreate || canDecide) && (
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            title="ویرایش اطلاعات و فیلدهای پروژه"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDecide && (
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            title="حذف طرح"
                            className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Pipeline & Log Modal */}
      {selectedProg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                {selectedProg.cat && (
                  <span className="text-xs text-emerald-700 font-semibold">{selectedProg.cat}</span>
                )}
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedProg.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProg(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Fields Details */}
            {(() => {
              const items = parseSubmittedCustomFields(selectedProg.customFields);
              if (items.length === 0) return null;
              return (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    اطلاعات فیلدهای سفارشی پروژه:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {items.map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className={`bg-white p-2.5 rounded-xl border border-slate-200 ${
                          item.type === 'textarea' || item.type === 'entity_list'
                            ? 'sm:col-span-2'
                            : ''
                        }`}
                      >
                        <span className="text-[11px] text-slate-500 block mb-0.5">
                          {item.label}:
                        </span>
                        {item.type === 'file' && item.fileUrl ? (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline font-bold"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{item.fileName || item.value}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : item.type === 'entity_list' && Array.isArray(item.items) ? (
                          <div className="space-y-1">
                            {item.items.map((r, rIdx) => (
                              <p
                                key={rIdx}
                                className="text-slate-800 bg-slate-50 px-2 py-1 rounded-lg text-[11px]"
                              >
                                {formatEntityRowSummary(r, rIdx)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="font-semibold text-slate-800 whitespace-pre-wrap">
                            {item.value || '—'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Stage Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                مرحله جاری در پایپ‌لاین:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {PIPELINE_STAGES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setNewStage(s.id)}
                    className={`p-2.5 rounded-xl text-right font-semibold border transition cursor-pointer ${
                      newStage === s.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Percentage Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>درصد پیشرفت فیزیکی پروژه:</span>
                <span className="text-emerald-700 font-mono text-sm">
                  {toPersianDigits(newProgress)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={newProgress}
                onChange={(e) => setNewProgress(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Approved Budget Input */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                بودجه مصوب طرح (تومان)
              </label>
              <input
                type="number"
                step={1000000}
                value={newApprovedBudget}
                onChange={(e) => setNewApprovedBudget(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              />
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                معادل: {numberToPersianWords(newApprovedBudget)}
              </p>
            </div>

            {/* Add Daily Progress Log */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                ثبت گزارش پیشرفت جدید / رویداد روزانه:
              </label>
              <textarea
                rows={2}
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder="توضیح دهید امروز چه اقدامی صورت گرفت، مصالح تهیه شد یا کار میدانی انجام شد..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* History of Previous Logs */}
            {selectedProg.logs && selectedProg.logs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block">
                  تاریخچه گزارشات ثبت‌شده:
                </span>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {selectedProg.logs.map((l) => (
                    <div
                      key={l.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span className="font-mono">{l.date}</span>
                      </div>
                      <p className="text-slate-800">{l.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedProg(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={savingPipeline}
                onClick={handleSavePipeline}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
              >
                {savingPipeline ? 'در حال ذخیره...' : 'ذخیره تغییرات پایپ‌لاین'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Program Modal */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingProg ? `ویرایش پروژه: ${editingProg.title}` : programSchema.formTitle}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  می‌توانید از فیلدهای استاندارد پروژه استفاده کنید یا همین‌جا فیلدهای دلخواه اختصاصی برای این پروژه بسازید.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProgramModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switch: Standard + Custom vs Pure Custom Fields */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
              <span className="text-[11px] font-bold text-slate-700 px-1">
                ساختار فیلدهای این پروژه:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setHideBuiltinFields(false)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    !hideBuiltinFields
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  فیلدهای استاندارد + سفارشی
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHideBuiltinFields(true);
                    setShowInstanceFieldDesigner(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    hideBuiltinFields
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>فقط فیلدهای دلخواه این پروژه</span>
                </button>
              </div>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProgram} className="space-y-4 text-xs">
              {/* Always-present Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {b.titleLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={b.titlePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              {/* Standard Configurable Fields */}
              {!hideBuiltinFields && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {b.showCat && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="block font-semibold text-slate-700">
                            {b.catLabel}
                            {b.requiredCat && <span className="text-rose-500 mr-1">*</span>}
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowQuickAddCat((prev) => !prev)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                          >
                            <Tag className="w-3 h-3" />
                            <span>{showQuickAddCat ? 'بستن' : '+ دسته جدید'}</span>
                          </button>
                        </div>

                        {showQuickAddCat && (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={quickCatName}
                              onChange={(e) => setQuickCatName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickAddCategory();
                                }
                              }}
                              placeholder="نام دسته‌بندی جدید..."
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-emerald-400 bg-emerald-50/30 outline-none text-xs"
                            />
                            <button
                              type="button"
                              disabled={addingQuickCat || !quickCatName.trim()}
                              onClick={handleQuickAddCategory}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              ثبت
                            </button>
                          </div>
                        )}

                        <select
                          value={cat}
                          required={b.requiredCat}
                          onChange={(e) => setCat(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                          {!b.requiredCat && <option value="">— بدون دسته‌بندی —</option>}
                          {programCategories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                          {cat && !programCategories.some((c) => c.name === cat) && (
                            <option value={cat}>{cat}</option>
                          )}
                        </select>
                      </div>
                    )}

                    {b.showRequestedBudget && (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {b.requestedBudgetLabel}
                          {b.requiredRequestedBudget && (
                            <span className="text-rose-500 mr-1">*</span>
                          )}
                        </label>
                        <input
                          type="number"
                          step={1000000}
                          required={b.requiredRequestedBudget}
                          placeholder={b.requestedBudgetPlaceholder}
                          value={requestedBudget || ''}
                          onChange={(e) => setRequestedBudget(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none font-mono focus:ring-2 focus:ring-emerald-500"
                        />
                        {requestedBudget > 0 && (
                          <p className="text-[10px] text-emerald-700 mt-1">
                            {numberToPersianWords(requestedBudget)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {(b.showVolunteers || b.showRoles) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {b.showVolunteers && (
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {b.volunteersLabel}
                            {b.requiredVolunteers && <span className="text-rose-500 mr-1">*</span>}
                          </label>
                          <input
                            type="number"
                            min={0}
                            required={b.requiredVolunteers}
                            placeholder={b.volunteersPlaceholder}
                            value={volunteers}
                            onChange={(e) => setVolunteers(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      )}

                      {b.showRoles && (
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {b.rolesLabel}
                            {b.requiredRoles && <span className="text-rose-500 mr-1">*</span>}
                          </label>
                          <input
                            type="text"
                            required={b.requiredRoles}
                            placeholder={b.rolesPlaceholder}
                            value={roles}
                            onChange={(e) => setRoles(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {(b.showStartDate || b.showEndDate) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {b.showStartDate && (
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {b.startDateLabel}
                            {b.requiredStartDate && <span className="text-rose-500 mr-1">*</span>}
                          </label>
                          <ShamsiDatePicker
                            value={startDate}
                            onChange={setStartDate}
                            placeholder={b.startDatePlaceholder}
                            required={b.requiredStartDate}
                          />
                        </div>
                      )}

                      {b.showEndDate && (
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {b.endDateLabel}
                            {b.requiredEndDate && <span className="text-rose-500 mr-1">*</span>}
                          </label>
                          <ShamsiDatePicker
                            value={endDate}
                            onChange={setEndDate}
                            placeholder={b.endDatePlaceholder}
                            required={b.requiredEndDate}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {b.showDesc && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {b.descLabel}
                        {b.requiredDesc && <span className="text-rose-500 mr-1">*</span>}
                      </label>
                      <textarea
                        rows={3}
                        required={b.requiredDesc}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder={b.descPlaceholder}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Optional Category in Custom-Only Mode */}
              {hideBuiltinFields && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block font-semibold text-slate-700">
                      {b.catLabel} (اختیاری)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddCat((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{showQuickAddCat ? 'بستن' : '+ دسته جدید'}</span>
                    </button>
                  </div>
                  {showQuickAddCat && (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={quickCatName}
                        onChange={(e) => setQuickCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddCategory();
                          }
                        }}
                        placeholder="نام دسته‌بندی جدید..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-emerald-400 bg-emerald-50/30 outline-none text-xs"
                      />
                      <button
                        type="button"
                        disabled={addingQuickCat || !quickCatName.trim()}
                        onClick={handleQuickAddCategory}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] cursor-pointer disabled:opacity-50"
                      >
                        ثبت
                      </button>
                    </div>
                  )}
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">— بدون دسته‌بندی —</option>
                    {programCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Per-Project Custom Fields Designer (Form Builder inside Project Modal) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowInstanceFieldDesigner((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 text-right cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        طراحی فیلدهای دلخواه اختصاصی این پروژه (
                        {toPersianDigits(instanceCustomFields.length)} فیلد)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        دقیقاً مانند فرم‌ساز، فیلدهای اختصاصی همین پروژه را تعریف کنید و بلافاصله در پایین مقداردهی نمایید.
                      </span>
                    </div>
                  </div>
                  {showInstanceFieldDesigner ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {showInstanceFieldDesigner && (
                  <div className="pt-2 border-t border-slate-200">
                    <FormFieldsEditor
                      fields={instanceCustomFields}
                      entities={entities}
                      onChange={setInstanceCustomFields}
                      emptyText="هنوز فیلد اختصاصی برای این پروژه اضافه نکرده‌اید. از بخش بالا نوع فیلد را انتخاب و اضافه کنید تا بلافاصله در فرم پایین نمایش داده شود."
                    />
                  </div>
                )}
              </div>

              {/* Render Active Custom Fields (Global + Per-Project) */}
              {activeModalCustomFields.length > 0 && (
                <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 space-y-3">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      تکمیل اطلاعات فیلدهای سفارشی پروژه
                    </h4>
                  </div>
                  <DynamicFieldRenderer
                    fields={activeModalCustomFields}
                    values={customValues}
                    entities={entities}
                    onChange={setCustomValues}
                    maxFileSizeMB={programSchema.maxFileSizeMB || 5}
                    uploadContext={{ source: 'program_custom_field' }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'در حال ذخیره...'
                    : editingProg
                    ? 'ذخیره تغییرات پروژه'
                    : programSchema.submitButtonText}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
