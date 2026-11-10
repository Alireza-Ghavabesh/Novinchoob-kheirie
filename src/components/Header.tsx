import React, { useState } from 'react';
import {
  HeartHandshake,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  FileText,
  Search,
  Database,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { AppConfig, StaffUser } from '../types';

interface HeaderProps {
  config: AppConfig | null;
  currentUser: StaffUser | null;
  activeView: 'public' | 'login' | 'admin';
  onNavigate: (view: 'public' | 'login' | 'admin') => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  currentUser,
  activeView,
  onNavigate,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const instName = config?.instName || 'مؤسسه خیریه حضرت ام‌البنین (س)';
  const subtitle = 'سامانه خدمات و نیازسنجی مردمی';

  const handleNav = (view: 'public' | 'login' | 'admin') => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-md sticky top-0 z-50 border-b border-emerald-700/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Institution Brand */}
          <div
            onClick={() => handleNav('public')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
          >
            {/* Logo Emblem */}
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-md group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center">
              {config?.logoDataUrl ? (
                <img
                  src={config.logoDataUrl}
                  alt="لوگو مؤسسه"
                  className="w-full h-full object-cover rounded-[10px]"
                />
              ) : (
                <div className="w-full h-full rounded-[10px] bg-emerald-950/70 flex items-center justify-center text-amber-200">
                  <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow" />
                </div>
              )}
            </div>

            {/* Brand Titles */}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-white drop-shadow-sm truncate">
                {instName}
              </h1>
              <p className="text-[10px] sm:text-xs text-emerald-300/80 font-medium truncate max-w-[200px] sm:max-w-md hidden xs:block">
                سامانه خدمات و نیازسنجی مردمی
              </p>
            </div>
          </div>

          {/* Desktop Navigation Controls */}
          <div className="hidden sm:flex items-center gap-2 lg:gap-3">
            {/* Public Form link */}
            <button
              onClick={() => handleNav('public')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeView === 'public'
                  ? 'bg-emerald-800/90 text-white shadow-inner border border-emerald-600/70'
                  : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>فرم عمومی و پیگیری</span>
            </button>

            {currentUser ? (
              // Logged in Staff Menu
              <div className="flex items-center gap-2 bg-emerald-950/80 py-1.5 px-2.5 rounded-xl border border-emerald-700/50 shadow-inner">
                <button
                  onClick={() => handleNav('admin')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    activeView === 'admin'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>پنل مدیریت</span>
                </button>

                <div className="flex flex-col text-right border-r border-emerald-800/80 pr-2 mr-0.5 max-w-[130px]">
                  <span className="text-xs font-bold text-white truncate leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-amber-300 truncate">
                    {currentUser.role}
                  </span>
                </div>

                <button
                  onClick={onLogout}
                  title="خروج از حساب"
                  className="p-1.5 text-emerald-300 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              // Login Button
              <button
                onClick={() => handleNav('login')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  activeView === 'login'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600/80'
                }`}
              >
                <LogIn className="w-4 h-4 text-amber-300" />
                <span>ورود کادر خیریه</span>
              </button>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex sm:hidden items-center gap-1.5">
            {currentUser ? (
              // Mobile compact user badge & admin button
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleNav('admin')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeView === 'admin'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700/60'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[11px]">پنل کادر</span>
                </button>

                <button
                  onClick={onLogout}
                  title="خروج"
                  className="p-1.5 text-emerald-300 hover:text-rose-300 bg-emerald-950/60 rounded-lg border border-emerald-800/50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              // Mobile compact login or public toggle
              <button
                onClick={() => handleNav(activeView === 'login' ? 'public' : 'login')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm transition ${
                  activeView === 'login'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600/70'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-amber-300" />
                <span>{activeView === 'login' ? 'فرم مراجعین' : 'ورود کادر'}</span>
              </button>
            )}

            {/* Mobile Hamburger toggle for extra options & info */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-emerald-200 hover:text-white bg-emerald-950/60 border border-emerald-800/60 rounded-lg transition"
              aria-label="منوی موبایل"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-emerald-950/95 border-b border-emerald-800/80 p-4 space-y-3 backdrop-blur-lg animate-in slide-in-from-top-2 duration-200 shadow-xl">
          {/* User Status on mobile drawer if logged in */}
          {currentUser && (
            <div className="bg-emerald-900/60 p-3 rounded-xl border border-emerald-700/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-amber-300">
                  نقش: {currentUser.role}
                </span>
              </div>
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/60 text-rose-300 border border-rose-800/60 rounded-lg text-[11px]"
              >
                <LogOut className="w-3 h-3" />
                <span>خروج</span>
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <button
              onClick={() => handleNav('public')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeView === 'public'
                  ? 'bg-emerald-700 text-white'
                  : 'text-emerald-100 hover:bg-emerald-900/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-300" />
                <span>فرم عمومی نیازسنجی و پیگیری</span>
              </div>
              <span className="text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded text-emerald-300">
                مراجعین
              </span>
            </button>

            {currentUser ? (
              <button
                onClick={() => handleNav('admin')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeView === 'admin'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-100 hover:bg-emerald-900/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>پنل مدیریت و خدمات</span>
                </div>
                <span className="text-[10px] bg-amber-950/60 px-2 py-0.5 rounded text-amber-300">
                  مدیریت
                </span>
              </button>
            ) : (
              <button
                onClick={() => handleNav('login')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeView === 'login'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-emerald-100 hover:bg-emerald-900/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-amber-300" />
                  <span>ورود پرسنل و کادر خیریه</span>
                </div>
                <span className="text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded text-emerald-300">
                  ورود
                </span>
              </button>
            )}
          </div>

          {/* Quick info in mobile drawer */}
          <div className="pt-2 border-t border-emerald-900/80 flex items-center justify-between text-[11px] text-emerald-300/80">
            <span>سامانه خدمت‌رسانی خیریه</span>
            <span>تلفن: {config?.phone || '021-55667788'}</span>
          </div>
        </div>
      )}
    </header>
  );
};
