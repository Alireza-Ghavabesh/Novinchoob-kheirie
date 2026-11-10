/**
 * Utility functions for Persian numbers, words, Shamsi calendar and validation
 */

// Convert numbers to Persian formatted string with commas (12,345,678)
export function formatToman(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '۰';
  const num = Math.round(Number(amount));
  return num.toLocaleString('fa-IR');
}

// Convert English digits to Persian digits
export function toPersianDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/[0-9]/g, (w) => persianDigits[+w]);
}

// Convert Persian digits to English digits
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

// Persian number to words converter
export function numberToPersianWords(num: number): string {
  if (!num || num <= 0) return 'صفر تومان';

  const units = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function convertSection(n: number): string {
    const parts: string[] = [];
    const c = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const u = remainder % 10;

    if (c > 0) parts.push(hundreds[c]);

    if (remainder >= 10 && remainder <= 19) {
      parts.push(teens[remainder - 10]);
    } else {
      if (t > 0) parts.push(tens[t]);
      if (u > 0) parts.push(units[u]);
    }

    return parts.join(' و ');
  }

  const sections: string[] = [];
  let scaleIndex = 0;
  let temp = Math.floor(num);

  while (temp > 0) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      const chunkWords = convertSection(chunk);
      if (scaleIndex > 0) {
        sections.unshift(`${chunkWords} ${scales[scaleIndex]}`);
      } else {
        sections.unshift(chunkWords);
      }
    }
    temp = Math.floor(temp / 1000);
    scaleIndex++;
  }

  return sections.join(' و ') + ' تومان';
}

// Iranian National Code Validator (کد ملی ۱۰ رقمی)
export function isValidIranianNID(nid: string): boolean {
  const code = toEnglishDigits(nid.trim());
  if (!/^\d{10}$/.test(code)) return false;

  // Check repeating digits like 0000000000 or 1111111111
  if (/^(\d)\1{9}$/.test(code)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(code[i]) * (10 - i);
  }

  const remainder = sum % 11;
  const lastDigit = parseInt(code[9]);

  if (remainder < 2) {
    return lastDigit === remainder;
  } else {
    return lastDigit === 11 - remainder;
  }
}

// Shamsi Calendar Month Names
export const SHAMSI_MONTHS = [
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

export const PERSIAN_WEEKDAYS = [
  'شنبه',
  '۱شنبه',
  '۲شنبه',
  '۳شنبه',
  '۴شنبه',
  '۵شنبه',
  'جمعه',
];

// Simple approximate Shamsi converter for today's date
export function getTodayShamsi(): { year: number; month: number; day: number; formatted: string } {
  // Approximate Iranian Solar year 1405
  const d = new Date();
  // Using Intl with fa-IR-u-ca-persian
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(d);
    let y = 1405;
    let m = 8;
    let day = 15;
    for (const p of parts) {
      if (p.type === 'year') y = parseInt(toEnglishDigits(p.value));
      if (p.type === 'month') m = parseInt(toEnglishDigits(p.value));
      if (p.type === 'day') day = parseInt(toEnglishDigits(p.value));
    }
    const formatted = `${y}/${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    return { year: y, month: m, day, formatted };
  } catch {
    return { year: 1405, month: 8, day: 15, formatted: '1405/08/15' };
  }
}
