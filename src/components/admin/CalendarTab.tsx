import React, { useState } from 'react';
import { BeneficiaryRequest, Program } from '../../types';
import {
  SHAMSI_MONTHS,
  PERSIAN_WEEKDAYS,
  toPersianDigits,
  formatToman,
} from '../../utils/persian';
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface CalendarTabProps {
  programs: Program[];
  requests: BeneficiaryRequest[];
}

export const CalendarTab: React.FC<CalendarTabProps> = ({ programs, requests }) => {
  const [selectedYear, setSelectedYear] = useState(1405);
  const [selectedMonth, setSelectedMonth] = useState(8); // 8: آبان
  const [selectedDay, setSelectedDay] = useState<number | null>(15);

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  // Days in Persian months: 1-6 have 31 days, 7-11 have 30 days, 12 has 29 or 30 days
  const daysInMonth = selectedMonth <= 6 ? 31 : selectedMonth <= 11 ? 30 : 29;

  // Approximate starting weekday (0: شنبه to 6: جمعه)
  const firstDayWeekday = ((selectedMonth * 2 + selectedYear) % 7);

  // Month string formatted e.g. "1405/08"
  const monthStr = `${selectedYear}/${String(selectedMonth).padStart(2, '0')}`;

  // Find all programs that intersect or start in this month
  const monthPrograms = programs.filter(
    (p) =>
      p.startDate?.startsWith(monthStr) ||
      p.endDate?.startsWith(monthStr) ||
      (p.startDate && p.endDate && p.startDate <= monthStr && p.endDate >= monthStr)
  );

  // Find all requests approved in this month
  const monthApprovedRequests = requests.filter(
    (r) => r.status === 'APPROVED' && r.approvedDate?.startsWith(monthStr)
  );

  // Get events for a specific day
  const getDayEvents = (day: number) => {
    const dayStr = `${monthStr}/${String(day).padStart(2, '0')}`;
    const progs = programs.filter(
      (p) => p.startDate === dayStr || p.endDate === dayStr
    );
    const approved = requests.filter(
      (r) => r.status === 'APPROVED' && r.approvedDate === dayStr
    );
    return { progs, approved };
  };

  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : null;

  return (
    <div className="space-y-6">
      {/* Month Navigation Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              تقویم اجرایی و برنامه زمان‌بندی طرح‌ها
            </h3>
            <p className="text-xs text-slate-500">
              مشاهده مواعد افتتاح، عملیات میدانی و برنامه‌ریزی تخصیص اعتبارات خیریه
            </p>
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="ماه قبل"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold text-slate-800 px-3 py-1 bg-slate-50 rounded-xl border border-slate-200 min-w-[130px] text-center">
            {SHAMSI_MONTHS[selectedMonth - 1]} {toPersianDigits(selectedYear)}
          </span>

          <button
            onClick={nextMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="ماه بعد"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar on Left (2/3), Details on Right (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-600 pb-2 border-b border-slate-100">
            {PERSIAN_WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty slots for starting offset */}
            {Array.from({ length: firstDayWeekday }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-20 rounded-xl bg-slate-50/50" />
            ))}

            {/* Days 1 to daysInMonth */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const { progs, approved } = getDayEvents(day);
              const hasEvents = progs.length > 0 || approved.length > 0;
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-20 p-1.5 rounded-xl border transition cursor-pointer flex flex-col justify-between text-right relative overflow-hidden ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/30'
                      : hasEvents
                      ? 'border-slate-200 bg-white hover:border-emerald-400'
                      : 'border-slate-100 bg-slate-50/40 hover:bg-slate-100/50 text-slate-600'
                  }`}
                >
                  <span
                    className={`text-xs font-bold font-mono ${
                      isSelected ? 'text-emerald-800' : 'text-slate-800'
                    }`}
                  >
                    {toPersianDigits(day)}
                  </span>

                  {/* Badges / dots */}
                  <div className="space-y-1">
                    {progs.length > 0 && (
                      <div className="text-[9px] bg-teal-100 text-teal-900 px-1 py-0.5 rounded truncate font-medium">
                        📋 {progs[0].title}
                      </div>
                    )}
                    {approved.length > 0 && (
                      <div className="text-[9px] bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded truncate font-medium">
                        💰 {toPersianDigits(approved.length)} مصوبه مالی
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day & Month Overview (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span>
                {selectedDay
                  ? `رویدادهای روز ${toPersianDigits(selectedDay)} ${SHAMSI_MONTHS[selectedMonth - 1]}`
                  : `خلاصه رویدادهای ${SHAMSI_MONTHS[selectedMonth - 1]}`}
              </span>
              <span className="text-xs text-emerald-700 font-normal">
                {toPersianDigits(selectedYear)}
              </span>
            </h4>

            {selectedDayEvents && (selectedDayEvents.progs.length > 0 || selectedDayEvents.approved.length > 0) ? (
              <div className="space-y-3">
                {selectedDayEvents.progs.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-1"
                  >
                    <span className="text-[10px] text-teal-700 font-semibold">{p.cat}</span>
                    <h5 className="font-bold text-teal-950">{p.title}</h5>
                    <p className="text-teal-800 text-[11px] line-clamp-2">{p.desc}</p>
                    <div className="pt-1 text-[10px] text-teal-600">
                      بازه: {p.startDate} تا {p.endDate}
                    </div>
                  </div>
                ))}

                {selectedDayEvents.approved.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold text-emerald-900">
                      <span>مصوبه مددکاری: {r.name}</span>
                      <span>{formatToman(r.approvedAmount)} تومان</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 block">
                      سرفصل: {r.cat}
                    </span>
                    {r.note && (
                      <p className="text-[11px] text-emerald-800">یادداشت: {r.note}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedDay ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                رویداد خاصی برای این روز ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-slate-500">
                  برای مشاهده جزئیات، روی هر یک از روزهای تقویم کلیک نمایید.
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">طرح‌های فعال در این ماه:</span>
                    <span className="font-bold text-slate-800">
                      {toPersianDigits(monthPrograms.length)} طرح
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">تعداد مصوبات نیازمندان:</span>
                    <span className="font-bold text-slate-800">
                      {toPersianDigits(monthApprovedRequests.length)} مورد
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Programs List */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-amber-300">طرح‌های در دست اقدام این ماه:</h4>
            {monthPrograms.length === 0 ? (
              <p className="text-[11px] text-slate-400">هیچ طرحی برای این ماه ثبت نشده است.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {monthPrograms.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-2 bg-slate-800/80 rounded-xl border border-slate-700">
                    <span className="font-bold text-white block">{p.title}</span>
                    <span className="text-[10px] text-emerald-400">{p.cat}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
