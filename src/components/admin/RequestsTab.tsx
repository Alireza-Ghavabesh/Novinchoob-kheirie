import React, { useState } from 'react';
import {
  BeneficiaryRequest,
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
  Search,
  Filter,
  Plus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Printer,
  Trash2,
  Eye,
  FileSpreadsheet,
  Calendar,
  Phone,
  User,
  Home,
  Users,
  CreditCard,
  Building,
} from 'lucide-react';
import { api } from '../../services/api';

interface RequestsTabProps {
  requests: BeneficiaryRequest[];
  needCategories: Category[];
  currentUser: StaffUser;
  onRefresh: () => void;
}

export const RequestsTab: React.FC<RequestsTabProps> = ({
  requests,
  needCategories,
  currentUser,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('ALL');

  // Approval Modal State
  const [approveModalReq, setApproveModalReq] = useState<BeneficiaryRequest | null>(null);
  const [approvedAmountInput, setApprovedAmountInput] = useState<number>(0);
  const [approveNote, setApproveNote] = useState('');
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  // Needs Info Modal State
  const [needsInfoReq, setNeedsInfoReq] = useState<BeneficiaryRequest | null>(null);
  const [needsInfoNote, setNeedsInfoNote] = useState('');

  // Details & Printable Voucher Modal
  const [viewDetailsReq, setViewDetailsReq] = useState<BeneficiaryRequest | null>(null);

  // Create Manual Request Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReqName, setNewReqName] = useState('');
  const [newReqNid, setNewReqNid] = useState('');
  const [newReqPhone, setNewReqPhone] = useState('');
  const [newReqGuardian, setNewReqGuardian] = useState('زن سرپرست خانوار');
  const [newReqDependents, setNewReqDependents] = useState(2);
  const [newReqHousing, setNewReqHousing] = useState('استیجاری');
  const [newReqCat, setNewReqCat] = useState('');
  const [newReqAmount, setNewReqAmount] = useState<number>(10000000);
  const [newReqDesc, setNewReqDesc] = useState('');
  const [newReqAddress, setNewReqAddress] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Permissions
  const canDecide = !!currentUser.perms.decideInbox;

  // KPIs
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const needsInfoCount = requests.filter((r) => r.status === 'NEEDS_INFO').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const totalRequested = requests.reduce((sum, r) => sum + r.requestedAmount, 0);
  const totalApproved = requests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + r.approvedAmount, 0);

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (catFilter !== 'ALL' && r.cat !== catFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const match =
        r.name.toLowerCase().includes(q) ||
        r.nid.includes(q) ||
        r.phone.includes(q) ||
        r.trackingCode.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Actions
  const handleOpenApprove = (req: BeneficiaryRequest) => {
    setApproveModalReq(req);
    setApprovedAmountInput(req.requestedAmount || 0);
    setApproveNote('تأیید در کمیسیون مددکاری مؤسسه');
  };

  const handleConfirmApprove = async () => {
    if (!approveModalReq) return;
    setApproveSubmitting(true);
    try {
      const today = getTodayShamsi();
      await api.updateRequest(approveModalReq.id, {
        status: 'APPROVED',
        approvedAmount: Number(approvedAmountInput) || 0,
        note: approveNote,
        approvedDate: today.formatted,
        approvedBy: currentUser.name,
      });
      setApproveModalReq(null);
      onRefresh();
    } catch (err) {
      alert('خطا در تصویب پرونده');
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleConfirmNeedsInfo = async () => {
    if (!needsInfoReq) return;
    try {
      await api.updateRequest(needsInfoReq.id, {
        status: 'NEEDS_INFO',
        note: needsInfoNote || 'نیازمند ارائه مدارک تکمیلی و فاکتورها',
      });
      setNeedsInfoReq(null);
      onRefresh();
    } catch {
      alert('خطا در ثبت نقص مدارک');
    }
  };

  const handleReject = async (req: BeneficiaryRequest) => {
    const reason = prompt('علت عدم احراز شرایط و رد پرونده را وارد نمایید:', 'عدم تطابق با شرایط مندرج در اساسنامه');
    if (reason === null) return;
    try {
      await api.updateRequest(req.id, {
        status: 'REJECTED',
        note: reason,
      });
      onRefresh();
    } catch {
      alert('خطا در رد پرونده');
    }
  };

  const handleResetToPending = async (req: BeneficiaryRequest) => {
    if (!confirm('آیا پرونده مجدداً به وضعیت «در حال بررسی» بازگردد؟')) return;
    try {
      await api.updateRequest(req.id, {
        status: 'PENDING',
        approvedAmount: 0,
        note: null,
        approvedDate: null,
        approvedBy: null,
      });
      onRefresh();
    } catch {
      alert('خطا در بازگردانی');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف کامل این پرونده از دیتابیس اطمینان دارید؟')) return;
    try {
      await api.deleteRequest(id);
      onRefresh();
    } catch {
      alert('خطا در حذف پرونده');
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      const today = getTodayShamsi();
      const selectedCat = newReqCat || (needCategories[0]?.name || 'درمان و هزینه‌های پزشکی');
      await api.createRequest({
        name: newReqName,
        nid: newReqNid,
        phone: newReqPhone,
        birthDate: today.formatted,
        guardian: newReqGuardian,
        dependents: newReqDependents,
        housing: newReqHousing,
        cat: selectedCat,
        requestedAmount: newReqAmount,
        desc: newReqDesc,
        address: newReqAddress,
      });
      setShowCreateModal(false);
      // Reset form
      setNewReqName('');
      setNewReqNid('');
      setNewReqPhone('');
      setNewReqDesc('');
      setNewReqAddress('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت پرونده');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'کد رهگیری',
      'نام متقاضی',
      'کد ملی',
      'شماره تماس',
      'سرپرستی',
      'عائله',
      'موضوع نیاز',
      'مبلغ درخواستی',
      'مبلغ مصوب',
      'وضعیت',
      'تاریخ مصوبه',
      'تاییدکننده',
    ];
    const rows = filteredRequests.map((r) => [
      r.trackingCode,
      r.name,
      r.nid,
      r.phone,
      r.guardian,
      r.dependents,
      r.cat,
      r.requestedAmount,
      r.approvedAmount,
      r.status,
      r.approvedDate || '',
      r.approvedBy || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `beneficiaries-report-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printVoucher = (req: BeneficiaryRequest) => {
    setViewDetailsReq(req);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 block mb-1">کل مراجعین</span>
          <span className="text-xl font-bold text-slate-800">{toPersianDigits(totalCount)}</span>
          <span className="text-[10px] text-slate-400 block mt-1">پرونده در دیتابیس</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/50">
          <span className="text-[11px] font-medium text-amber-700 block mb-1">در حال بررسی</span>
          <span className="text-xl font-bold text-amber-700">{toPersianDigits(pendingCount)}</span>
          <span className="text-[10px] text-amber-600 block mt-1">منتظر کمیسیون</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/50">
          <span className="text-[11px] font-medium text-emerald-700 block mb-1">تأیید و مصوب</span>
          <span className="text-xl font-bold text-emerald-700">{toPersianDigits(approvedCount)}</span>
          <span className="text-[10px] text-emerald-600 block mt-1">دارای اعتبار مالی</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm bg-gradient-to-br from-white to-blue-50/50">
          <span className="text-[11px] font-medium text-blue-700 block mb-1">نقص مدارک</span>
          <span className="text-xl font-bold text-blue-700">{toPersianDigits(needsInfoCount)}</span>
          <span className="text-[10px] text-blue-600 block mt-1">نیاز به پیگیری</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/50">
          <span className="text-[11px] font-medium text-rose-700 block mb-1">عدم احراز / رد</span>
          <span className="text-xl font-bold text-rose-700">{toPersianDigits(rejectedCount)}</span>
          <span className="text-[10px] text-rose-600 block mt-1">خارج از اولویت</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-sm bg-gradient-to-br from-white to-teal-50/50">
          <span className="text-[11px] font-medium text-teal-700 block mb-1">مجموع مصوبات</span>
          <span className="text-sm font-black text-teal-800 leading-tight block truncate">
            {formatToman(totalApproved)} تومان
          </span>
          <span className="text-[10px] text-teal-600 block mt-1">کمک بلاعوض</span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="جستجوی نام، کد ملی، شماره یا کد رهگیری..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="PENDING">در حال بررسی (PENDING)</option>
            <option value="APPROVED">تأیید و مصوب شده (APPROVED)</option>
            <option value="NEEDS_INFO">نقص مدارک (NEEDS_INFO)</option>
            <option value="REJECTED">رد شده (REJECTED)</option>
          </select>

          {/* Category Filter */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white max-w-[180px] truncate"
          >
            <option value="ALL">همه دسته‌بندی‌ها</option>
            {needCategories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            title="خروجی فایل اکسل / CSV"
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-300 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          {/* Add Manual Request */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت پرونده دستی</span>
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">کد رهگیری</th>
                <th className="py-3.5 px-4">مشخصات متقاضی</th>
                <th className="py-3.5 px-4">سرپرستی و مسکن</th>
                <th className="py-3.5 px-4">موضوع نیاز</th>
                <th className="py-3.5 px-4">مبلغ درخواستی / مصوب</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4 text-center">عملیات کمیسیون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    پرونده‌ای مطابق با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {req.trackingCode}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{req.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        کد ملی: {toPersianDigits(req.nid)} | تلفن: {toPersianDigits(req.phone)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 mb-0.5">
                        {req.guardian}
                      </span>
                      <div className="text-[10px] text-slate-500">
                        عائله: {toPersianDigits(req.dependents)} نفر | {req.housing}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{req.cat}</span>
                      <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                        {req.desc}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-500 text-[11px]">
                        درخواستی: {formatToman(req.requestedAmount)}
                      </div>
                      {req.status === 'APPROVED' ? (
                        <div className="text-emerald-700 font-bold">
                          مصوب: {formatToman(req.approvedAmount)} تومان
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[10px]">در انتظار تعیین</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5" />
                          تأیید و مصوب
                        </span>
                      )}
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          در حال بررسی
                        </span>
                      )}
                      {req.status === 'NEEDS_INFO' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          نقص مدارک
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3.5 h-3.5" />
                          عدم احراز
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* View & Print */}
                        <button
                          onClick={() => setViewDetailsReq(req)}
                          title="مشاهده جزئیات و چاپ حواله"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Approval (Requires permission) */}
                        {canDecide && req.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleOpenApprove(req)}
                            title="تصویب و تعیین مبلغ کمک"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Needs Info */}
                        {canDecide && req.status !== 'NEEDS_INFO' && (
                          <button
                            onClick={() => {
                              setNeedsInfoReq(req);
                              setNeedsInfoNote(req.note || '');
                            }}
                            title="درخواست تکمیل مدارک"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reject */}
                        {canDecide && req.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleReject(req)}
                            title="عدم تأیید / رد پرونده"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reset status */}
                        {canDecide && req.status !== 'PENDING' && (
                          <button
                            onClick={() => handleResetToPending(req)}
                            title="بازنشانی به در حال بررسی"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        {canDecide && (
                          <button
                            onClick={() => handleDelete(req.id)}
                            title="حذف پرونده"
                            className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {approveModalReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-800 border-b border-slate-100 pb-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <div>
                <h3 className="font-bold text-base">تصویب اعتبار و تعیین مبلغ مصوب</h3>
                <p className="text-xs text-slate-500">
                  پرونده متقاضی: {approveModalReq.name} ({approveModalReq.trackingCode})
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">موضوع نیاز:</span>
                <span className="font-semibold text-slate-800">{approveModalReq.cat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مبلغ درخواستی متقاضی:</span>
                <span className="font-bold text-slate-800">
                  {formatToman(approveModalReq.requestedAmount)} تومان
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  مبلغ مصوب کمیسیون (تومان)
                </label>
                <input
                  type="number"
                  step={500000}
                  value={approvedAmountInput}
                  onChange={(e) => setApprovedAmountInput(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  معادل: {numberToPersianWords(approvedAmountInput)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  شرح و یادداشت رسمی مصوبه
                </label>
                <textarea
                  rows={2}
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApproveModalReq(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={approveSubmitting}
                onClick={handleConfirmApprove}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                {approveSubmitting ? 'در حال ثبت...' : 'تأیید و ابلاغ مالی'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Needs Info Modal */}
      {needsInfoReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-blue-800 border-b border-slate-100 pb-3">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-bold text-base">درخواست تکمیل مدارک</h3>
                <p className="text-xs text-slate-500">
                  برای پرونده: {needsInfoReq.name} ({needsInfoReq.trackingCode})
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                توضیحات مدارک یا استعلام مورد نیاز (در سامانه پیگیری به متقاضی نمایش داده می‌شود):
              </label>
              <textarea
                rows={3}
                value={needsInfoNote}
                onChange={(e) => setNeedsInfoNote(e.target.value)}
                placeholder="مثال: لطفاً تصویر اجاره‌نامه دارای کد رهگیری و فیش حقوقی یا استشهاد محلی را ارائه فرمایید..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNeedsInfoReq(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmNeedsInfo}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                ثبت وضعیت نقص مدارک
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details & Printable Voucher Modal */}
      {viewDetailsReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 animate-in fade-in printable-area">
            {/* Header Voucher */}
            <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    مؤسسه خیریه حضرت ام‌البنین (س)
                  </h2>
                  <p className="text-xs text-slate-600">
                    برگ مصوبه رسمی کمیسیون مددکاری و حواله پرداخت
                  </p>
                </div>
              </div>

              <div className="text-left font-mono text-xs">
                <div>کد پرونده: {viewDetailsReq.trackingCode}</div>
                <div>تاریخ: {viewDetailsReq.approvedDate || 'در حال رسیدگی'}</div>
              </div>
            </div>

            {/* Grid of Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">نام متقاضی:</span>
                <span className="font-bold text-slate-900">{viewDetailsReq.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">کد ملی:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {toPersianDigits(viewDetailsReq.nid)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">شماره همراه:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {toPersianDigits(viewDetailsReq.phone)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">وضعیت سرپرستی:</span>
                <span className="font-bold text-slate-900">{viewDetailsReq.guardian}</span>
              </div>
              <div>
                <span className="text-slate-500 block">تعداد افراد عائله:</span>
                <span className="font-bold text-slate-900">
                  {toPersianDigits(viewDetailsReq.dependents)} نفر
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">وضعیت مسکن:</span>
                <span className="font-bold text-slate-900">{viewDetailsReq.housing}</span>
              </div>
            </div>

            {/* Need & Financials */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-emerald-900">موضوع نیاز و سرفصل مصوب:</span>
                  <span className="text-emerald-800 font-semibold">{viewDetailsReq.cat}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-emerald-950 pt-2 border-t border-emerald-200/60">
                  <span>مبلغ مصوب قابل پرداخت:</span>
                  <span>{formatToman(viewDetailsReq.approvedAmount)} تومان</span>
                </div>
                {viewDetailsReq.approvedAmount > 0 && (
                  <p className="text-[11px] text-emerald-800 mt-1">
                    حروف: {numberToPersianWords(viewDetailsReq.approvedAmount)}
                  </p>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">شرح وضعیت و نیاز:</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 leading-relaxed">
                  {viewDetailsReq.desc}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">آدرس سکونت:</span>
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                  {viewDetailsReq.address}
                </p>
              </div>

              {viewDetailsReq.note && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">یادداشت کمیسیون:</span>
                  <p className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                    {viewDetailsReq.note}
                  </p>
                </div>
              )}
            </div>

            {/* Official Signature Lines */}
            <div className="pt-6 border-t-2 border-dashed border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
              <div className="space-y-8">
                <span className="text-slate-600 block">کارشناس مددکاری</span>
                <span className="text-[11px] text-slate-400 block">امضاء و اثر انگشت</span>
              </div>
              <div className="space-y-8">
                <span className="text-slate-600 block">مسئول امور مالی</span>
                <span className="text-[11px] text-slate-400 block">مهر و امضاء</span>
              </div>
              <div className="space-y-8">
                <span className="text-slate-600 block">مدیر عامل مؤسسه</span>
                <span className="text-[11px] text-slate-400 block">مهر خیریه</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 no-print">
              <button
                type="button"
                onClick={() => setViewDetailsReq(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ حواله رسمی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              ثبت دستی پرونده مددجوی جدید
            </h3>

            <form onSubmit={handleCreateManual} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نام و نام خانوادگی</label>
                  <input
                    type="text"
                    required
                    value={newReqName}
                    onChange={(e) => setNewReqName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">کد ملی</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={newReqNid}
                    onChange={(e) => setNewReqNid(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">شماره تماس</label>
                  <input
                    type="tel"
                    required
                    value={newReqPhone}
                    onChange={(e) => setNewReqPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تعداد عائله</label>
                  <input
                    type="number"
                    min={0}
                    value={newReqDependents}
                    onChange={(e) => setNewReqDependents(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">دسته‌بندی نیاز</label>
                  <select
                    value={newReqCat}
                    onChange={(e) => setNewReqCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  >
                    {needCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مبلغ درخواستی (تومان)</label>
                  <input
                    type="number"
                    step={500000}
                    value={newReqAmount}
                    onChange={(e) => setNewReqAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">شرح نیاز</label>
                <textarea
                  rows={2}
                  required
                  value={newReqDesc}
                  onChange={(e) => setNewReqDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">آدرس سکونت</label>
                <input
                  type="text"
                  required
                  value={newReqAddress}
                  onChange={(e) => setNewReqAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
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
                  {createSubmitting ? 'در حال ثبت...' : 'ثبت پرونده در دیتابیس'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
