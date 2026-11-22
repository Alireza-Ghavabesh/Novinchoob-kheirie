import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { toPersianDigits } from '../utils/persian';

interface ShamsiDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  compact?: boolean;
  className?: string;
}

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function jalaliToJdn(jy: number, jm: number, jd: number): number {
  const epbase = jy - (jy >= 0 ? 474 : 473);
  const epyear = 474 + (((epbase % 2820) + 2820) % 2820);
  return (
    jd +
    (jm <= 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) +
    Math.floor((epyear * 682 - 110) / 2816) +
    (epyear - 1) * 365 +
    Math.floor(epbase / 2820) * 1029983 +
    1948320
  );
}

function isJalaliLeapYear(jy: number): boolean {
  return jalaliToJdn(jy + 1, 1, 1) - jalaliToJdn(jy, 1, 1) === 366;
}

function getJalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

function getJalaliFirstWeekday(jy: number, jm: number): number {
  // Saturday = 0, Sunday = 1, ..., Friday = 6
  return (jalaliToJdn(jy, jm, 1) + 2) % 7;
}

export function getTodayShamsi(): { year: number; month: number; day: number } {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(now);
    const y = Number(toEnglishDigits(parts.find((p) => p.type === 'year')?.value || '1405'));
    const m = Number(toEnglishDigits(parts.find((p) => p.type === 'month')?.value || '1'));
    const d = Number(toEnglishDigits(parts.find((p) => p.type === 'day')?.value || '1'));
    if (y >= 1300 && y <= 1500 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  } catch {
    // Fallback below
  }
  return { year: 1405, month: 1, day: 1 };
}

function parseShamsiValue(val: string): { year: number; month: number; day: number } | null {
  const clean = toEnglishDigits(String(val || '').trim());
  const match = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1250 || year > 1500 || month < 1 || month > 12) return null;
  const maxDay = getJalaliMonthLength(year, month);
  if (day < 1 || day > maxDay) return null;
  return { year, month, day };
}

function formatShamsiValue(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}/${mm}/${dd}`;
}

export const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({
  value,
  onChange,
  placeholder,
  required,
  compact = false,
  className = '',
}) => {
  const today = useMemo(() => getTodayShamsi(), []);
  const parsedValue = useMemo(() => parseShamsiValue(value), [value]);

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(parsedValue?.year ?? today.year);
  const [viewMonth, setViewMonth] = useState<number>(parsedValue?.month ?? today.month);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const openPicker = () => {
    const parsed = parseShamsiValue(value);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    } else {
      // Default to today's Shamsi date whenever opening on an empty field
      const freshToday = getTodayShamsi();
      setViewYear(freshToday.year);
      setViewMonth(freshToday.month);
    }
    setIsOpen(true);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => Math.max(1300, y - 1));
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => Math.min(1450, y + 1));
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    onChange(formatShamsiValue(viewYear, viewMonth, day));
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const freshToday = getTodayShamsi();
    setViewYear(freshToday.year);
    setViewMonth(freshToday.month);
    onChange(formatShamsiValue(freshToday.year, freshToday.month, freshToday.day));
    setIsOpen(false);
  };

  const daysInMonth = getJalaliMonthLength(viewYear, viewMonth);
  const startWeekday = getJalaliFirstWeekday(viewYear, viewMonth);

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = 1430; y >= 1300; y--) {
      list.push(y);
    }
    return list;
  }, []);

  const cells: Array<number | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const displayPlaceholder =
    placeholder || formatShamsiValue(today.year, today.month, today.day);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          readOnly
          required={Boolean(required)}
          dir="ltr"
          value={value || ''}
          onClick={openPicker}
          onFocus={openPicker}
          placeholder={displayPlaceholder}
          className={`w-full cursor-pointer rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-mono text-left ${
            compact ? 'pl-8 pr-9 py-2 text-xs' : 'pl-9 pr-10 py-2.5 text-sm'
          }`}
        />
        <button
          type="button"
          onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
          tabIndex={-1}
          title="انتخاب تاریخ شمسی"
          className="absolute right-2.5 text-emerald-600 hover:text-emerald-800 p-1 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
        >
          <Calendar className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>

        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            tabIndex={-1}
            title="پاک کردن تاریخ"
            className="absolute left-2 text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          dir="rtl"
          className="absolute z-50 mt-2 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 select-none animate-in fade-in duration-150"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-1.5 mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="ماه قبل"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {PERSIAN_MONTHS.map((mName, idx) => (
                  <option key={mName} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {toPersianDigits(yr)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="ماه بعد"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
            {WEEKDAYS_SHORT.map((wd, idx) => (
              <div
                key={wd}
                className={`text-[11px] font-bold py-1 ${
                  idx === 6 ? 'text-rose-500' : 'text-slate-500'
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }
              const isSelected =
                parsedValue &&
                parsedValue.year === viewYear &&
                parsedValue.month === viewMonth &&
                parsedValue.day === day;
              const isToday =
                today.year === viewYear && today.month === viewMonth && today.day === day;
              const isFriday = idx % 7 === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 rounded-lg text-xs font-semibold transition flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : isToday
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-400 font-bold hover:bg-emerald-100'
                      : isFriday
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition cursor-pointer"
            >
              امروز ({toPersianDigits(formatShamsiValue(today.year, today.month, today.day))})
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-[11px] font-semibold transition cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
