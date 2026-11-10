import React, { useState } from 'react';
import {
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
  Plus,
  Search,
  CheckCircle,
  Clock,
  Briefcase,
  Users,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Trash2,
  Edit,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';

interface ProgramsTabProps {
  programs: Program[];
  programCategories: Category[];
  currentUser: StaffUser;
  onRefresh: () => void;
}

export const ProgramsTab: React.FC<ProgramsTabProps> = ({
  programs,
  programCategories,
  currentUser,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<number | 'ALL'>('ALL');

  // New Program Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('');
  const [requestedBudget, setRequestedBudget] = useState<number>(50000000);
  const [volunteers, setVolunteers] = useState<number>(5);
  const [roles, setRoles] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('1405/08/15');
  const [endDate, setEndDate] = useState('1405/08/30');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Pipeline & Log Modal
  const [selectedProg, setSelectedProg] = useState<Program | null>(null);
  const [newStage, setNewStage] = useState<number>(1);
  const [newProgress, setNewProgress] = useState<number>(0);
  const [newApprovedBudget, setNewApprovedBudget] = useState<number>(0);
  const [logNote, setLogNote] = useState('');
  const [savingPipeline, setSavingPipeline] = useState(false);

  const canCreate = !!currentUser.perms.createProg;
  const canDecide = !!currentUser.perms.decideProg;

  // Pipeline Stages definition
  const PIPELINE_STAGES = [
    { id: 1, title: '۱. تدوین و امکان‌سنجی', color: 'bg-slate-100 text-slate-700' },
    { id: 2, title: '۲. تصویب و تأمین اعتبار', color: 'bg-blue-100 text-blue-800' },
    { id: 3, title: '۳. اجرا و عملیات میدانی', color: 'bg-amber-100 text-amber-800' },
    { id: 4, title: '۴. تکمیل و بهره‌برداری', color: 'bg-emerald-100 text-emerald-800' },
  ];

  const filteredPrograms = programs.filter((p) => {
    if (stageFilter !== 'ALL' && p.pipelineStage !== stageFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.cat.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      const selectedCat = cat || (programCategories[0]?.name || 'عمرانی و مدرسه‌سازی');
      await api.createProgram({
        title,
        cat: selectedCat,
        requestedBudget,
        volunteers,
        roles,
        desc,
        startDate,
        endDate,
      });
      setShowCreateModal(false);
      setTitle('');
      setRoles('');
      setDesc('');
      onRefresh();
    } catch {
      alert('خطا در ثبت طرح');
    } finally {
      setCreateSubmitting(false);
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
    try {
      const today = getTodayShamsi();
      // 1. Update program attributes
      await api.updateProgram(selectedProg.id, {
        pipelineStage: newStage,
        progressPercent: newProgress,
        approvedBudget: newApprovedBudget,
        status: newStage >= 2 ? 'APPROVED' : selectedProg.status,
        approvedDate: newStage >= 2 && !selectedProg.approvedDate ? today.formatted : selectedProg.approvedDate,
        approvedBy: newStage >= 2 && !selectedProg.approvedBy ? currentUser.name : selectedProg.approvedBy,
      });

      // 2. If log note added, create log
      if (logNote.trim()) {
        await api.addProgramLog(selectedProg.id, logNote.trim(), today.formatted);
      }

      setSelectedProg(null);
      onRefresh();
    } catch {
      alert('خطا در ذخیره تغییرات');
    } finally {
      setSavingPipeline(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف این طرح و لاگ‌های آن اطمینان دارید؟')) return;
    try {
      await api.deleteProgram(id);
      onRefresh();
    } catch {
      alert('خطا در حذف طرح');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="جستجوی عنوان طرح یا موضوع..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="ALL">همه مراحل پایپ‌لاین</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>تعریف طرح / پروژه جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Programs Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPrograms.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            هیچ طرحی با فیلترهای انتخابی یافت نشد.
          </div>
        ) : (
          filteredPrograms.map((p) => {
            const currentStageObj = PIPELINE_STAGES.find((s) => s.id === p.pipelineStage) || PIPELINE_STAGES[0];
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-emerald-300 transition"
              >
                {/* Top Title & Category */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mb-1.5 border border-emerald-200">
                      {p.cat}
                    </span>
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
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {p.desc}
                </p>

                {/* 4-Stage Visual Stepper */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <span>مرحله: {currentStageObj.title}</span>
                    <span className="font-bold text-emerald-800">
                      {toPersianDigits(p.progressPercent)}% پیشرفت فیزیکی
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, p.progressPercent))}%` }}
                    />
                  </div>

                  {/* Pipeline Stage Dots */}
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

                {/* Stats Grid: Budget, Volunteers, Dates */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-500 block">بودجه مصوب:</span>
                    <span className="font-bold text-emerald-800">
                      {p.approvedBudget > 0
                        ? `${formatToman(p.approvedBudget)} تومان`
                        : `${formatToman(p.requestedBudget)} (در انتظار)`}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">نیروهای داوطلب:</span>
                    <span className="font-semibold text-slate-800">
                      {toPersianDigits(p.volunteers)} نفر داوطلب
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">بازه اجرایی:</span>
                    <span className="text-slate-700 font-mono text-[11px]">
                      {p.startDate || '—'} الی {p.endDate || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">گزارشات ثبت‌شده:</span>
                    <span className="text-slate-700 font-semibold">
                      {toPersianDigits(p.logs?.length || 0)} گزارش روزانه
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenPipelineModal(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>مدیریت پایپ‌لاین و گزارش پیشرفت</span>
                  </button>

                  {canDecide && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      title="حذف طرح"
                      className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pipeline & Log Modal */}
      {selectedProg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-emerald-700 font-semibold">{selectedProg.cat}</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedProg.title}
                </h3>
              </div>
            </div>

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
                    className={`p-2.5 rounded-xl text-right font-semibold border transition ${
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
                <span className="text-emerald-700 font-mono text-sm">{toPersianDigits(newProgress)}%</span>
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
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={savingPipeline}
                onClick={handleSavePipeline}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                {savingPipeline ? 'در حال ذخیره...' : 'ذخیره تغییرات پایپ‌لاین'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Program Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              تعریف طرح / پروژه اجرایی جدید
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">عنوان کامل طرح</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: کاروان سلامت و درمان رایگان روستایی"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">دسته‌بندی طرح</label>
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none"
                  >
                    {programCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">برآورد بودجه اولیه (تومان)</label>
                  <input
                    type="number"
                    step={1000000}
                    value={requestedBudget}
                    onChange={(e) => setRequestedBudget(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تعداد داوطلب مورد نیاز</label>
                  <input
                    type="number"
                    min={0}
                    value={volunteers}
                    onChange={(e) => setVolunteers(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نقش‌ها و تخصص‌ها</label>
                  <input
                    type="text"
                    placeholder="مثال: ۲ پزشک، ۳ مددکار"
                    value={roles}
                    onChange={(e) => setRoles(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاریخ شروع (شمسی)</label>
                  <input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاریخ پایان (شمسی)</label>
                  <input
                    type="text"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">اهداف و شرح پروژه</label>
                <textarea
                  rows={3}
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="جامعه هدف، تعداد ذینفعان و محل اجرای طرح..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  {createSubmitting ? 'در حال ثبت...' : 'ثبت طرح و آغاز فاز ۱'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
