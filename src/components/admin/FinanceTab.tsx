import React, { useState, useEffect } from 'react';
import { FinanceSummary } from '../../types';
import { formatToman, numberToPersianWords, toPersianDigits } from '../../utils/persian';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  PieChart,
  FileSpreadsheet,
  Printer,
  Calendar,
  Building,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';

export const FinanceTab: React.FC = () => {
  const [stats, setStats] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'month' | 'quarter' | 'year' | 'all'>('month');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getFinanceStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        در حال محاسبه و تجمیع داده‌های مالی از دیتابیس...
      </div>
    );
  }

  const { summary, reqCategoryBreakdown, progCategoryBreakdown } = stats;

  const exportCSV = () => {
    const headers = ['سرفصل / دسته‌بندی', 'تعداد پرونده', 'تعداد مصوب', 'مبلغ مصوب (تومان)'];
    const rows = Object.entries(reqCategoryBreakdown).map(([cat, val]) => [
      cat,
      val.count,
      val.approvedCount,
      val.approvedAmount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial-report-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const avgPerBeneficiary =
    summary.approvedReqCount > 0
      ? Math.round(summary.totalReqApprovedAmount / summary.approvedReqCount)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Controls & Timeframe */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            داشبورد جامع مالی و تعهدات مصوب خیریه
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            گزارش اعتبارات تخصیص‌یافته به نیازمندان و بودجه پروژه‌های عام‌المنفعه
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === 'month' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-600'
              }`}
            >
              ماه جاری
            </button>
            <button
              onClick={() => setTimeFilter('quarter')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === 'quarter' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-600'
              }`}
            >
              ۳ ماه اخیر
            </button>
            <button
              onClick={() => setTimeFilter('year')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === 'year' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-600'
              }`}
            >
              سالانه
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === 'all' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-600'
              }`}
            >
              کل دوره
            </button>
          </div>

          <button
            onClick={exportCSV}
            title="خروجی فایل اکسل"
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-300 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          <button
            onClick={() => window.print()}
            title="چاپ گزارش مالی"
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-300 transition"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenditure */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex items-center justify-between text-emerald-200">
            <span className="text-xs font-medium">کل مصوبات و تعهدات خیریه</span>
            <DollarSign className="w-5 h-5 text-amber-300" />
          </div>
          <div className="text-2xl font-black text-white">
            {formatToman(summary.grandTotalApprovedExpenditure)} تومان
          </div>
          <div className="text-[11px] text-emerald-200">
            {numberToPersianWords(summary.grandTotalApprovedExpenditure)}
          </div>
        </div>

        {/* Beneficiary disbursements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">تخصیص به نیازمندان و مراجعین</span>
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatToman(summary.totalReqApprovedAmount)} تومان
          </div>
          <div className="text-[11px] text-slate-500">
            در قالب {toPersianDigits(summary.approvedReqCount)} پرونده مصوب
          </div>
        </div>

        {/* Programs Budget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">بودجه مصوب پروژه‌های عام‌المنفعه</span>
            <Building className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatToman(summary.totalProgApprovedBudget)} تومان
          </div>
          <div className="text-[11px] text-slate-500">
            تعداد {toPersianDigits(summary.approvedProgCount)} طرح مصوب اجرایی
          </div>
        </div>

        {/* Average Per Beneficiary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">میانگین کمک مصوب هر خانوار</span>
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatToman(avgPerBeneficiary)} تومان
          </div>
          <div className="text-[11px] text-slate-500">
            نرخ تحقق اعتبارات: {summary.totalReqRequestedAmount > 0 ? Math.round((summary.totalReqApprovedAmount / summary.totalReqRequestedAmount) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Two Column Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Beneficiary Needs Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <PieChart className="w-4 h-4 text-emerald-600" />
            تفکیک اعتبارات بر اساس موضوع نیاز نیازمندان
          </h4>

          <div className="space-y-4">
            {Object.entries(reqCategoryBreakdown).map(([cat, val]) => {
              const percent =
                summary.totalReqApprovedAmount > 0
                  ? Math.round((val.approvedAmount / summary.totalReqApprovedAmount) * 100)
                  : 0;

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{cat}</span>
                    <span className="font-bold text-emerald-800 font-mono">
                      {formatToman(val.approvedAmount)} تومان ({toPersianDigits(percent)}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>کل مراجعین این دسته: {toPersianDigits(val.count)} نفر</span>
                    <span>مصوب‌شده: {toPersianDigits(val.approvedCount)} پرونده</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Programs Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-teal-600" />
            تفکیک بودجه پروژه‌ها بر اساس سرفصل عمرانی و فرهنگی
          </h4>

          <div className="space-y-4">
            {Object.entries(progCategoryBreakdown).map(([cat, val]) => {
              const percent =
                summary.totalProgApprovedBudget > 0
                  ? Math.round((val.approvedBudget / summary.totalProgApprovedBudget) * 100)
                  : 0;

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{cat}</span>
                    <span className="font-bold text-teal-800 font-mono">
                      {formatToman(val.approvedBudget)} تومان ({toPersianDigits(percent)}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>کل پروژه‌های این سر‌فصل: {toPersianDigits(val.count)} طرح</span>
                    <span>تصویب و ابلاغ شده: {toPersianDigits(val.approvedCount)} طرح</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
