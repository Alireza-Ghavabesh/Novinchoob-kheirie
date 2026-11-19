export interface LoginThemeConfig {
  id: 'emerald' | 'teal' | 'slate' | 'amber' | 'indigo';
  label: string;
  swatch: string;
  iconBox: string;
  button: string;
  tabActive: string;
  linkText: string;
  focusRing: string;
  backLink: string;
  welcomeBox: string;
}

export const LOGIN_THEMES: Record<string, LoginThemeConfig> = {
  emerald: {
    id: 'emerald',
    label: 'سبز زمردی (پیش‌فرض)',
    swatch: 'bg-emerald-600',
    iconBox: 'from-emerald-600 to-teal-500 shadow-emerald-600/30',
    button: 'from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800',
    tabActive: 'text-emerald-800',
    linkText: 'text-emerald-700 hover:text-emerald-900',
    focusRing: 'focus:ring-emerald-500 focus:border-emerald-500',
    backLink: 'text-emerald-800 hover:text-emerald-950',
    welcomeBox: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  },
  teal: {
    id: 'teal',
    label: 'فیروزه‌ای آرام',
    swatch: 'bg-teal-600',
    iconBox: 'from-teal-600 to-cyan-500 shadow-teal-600/30',
    button: 'from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800',
    tabActive: 'text-teal-800',
    linkText: 'text-teal-700 hover:text-teal-900',
    focusRing: 'focus:ring-teal-500 focus:border-teal-500',
    backLink: 'text-teal-800 hover:text-teal-950',
    welcomeBox: 'bg-teal-50 border-teal-200 text-teal-900',
  },
  slate: {
    id: 'slate',
    label: 'سرمه‌ای و ذغالی رسمی',
    swatch: 'bg-slate-800',
    iconBox: 'from-slate-800 to-slate-600 shadow-slate-700/30',
    button: 'from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black',
    tabActive: 'text-slate-900',
    linkText: 'text-slate-700 hover:text-slate-950',
    focusRing: 'focus:ring-slate-500 focus:border-slate-500',
    backLink: 'text-slate-700 hover:text-slate-950',
    welcomeBox: 'bg-slate-100 border-slate-300 text-slate-800',
  },
  amber: {
    id: 'amber',
    label: 'طلایی و کهربایی',
    swatch: 'bg-amber-600',
    iconBox: 'from-amber-500 to-orange-500 shadow-amber-500/30',
    button: 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
    tabActive: 'text-amber-800',
    linkText: 'text-amber-700 hover:text-amber-900',
    focusRing: 'focus:ring-amber-500 focus:border-amber-500',
    backLink: 'text-amber-800 hover:text-amber-950',
    welcomeBox: 'bg-amber-50 border-amber-200 text-amber-900',
  },
  indigo: {
    id: 'indigo',
    label: 'آبی نیلی سازمانی',
    swatch: 'bg-indigo-600',
    iconBox: 'from-indigo-600 to-blue-500 shadow-indigo-600/30',
    button: 'from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800',
    tabActive: 'text-indigo-800',
    linkText: 'text-indigo-700 hover:text-indigo-900',
    focusRing: 'focus:ring-indigo-500 focus:border-indigo-500',
    backLink: 'text-indigo-800 hover:text-indigo-950',
    welcomeBox: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  },
};

export function getLoginTheme(themeId?: string | null): LoginThemeConfig {
  return LOGIN_THEMES[themeId || 'emerald'] || LOGIN_THEMES.emerald;
}
