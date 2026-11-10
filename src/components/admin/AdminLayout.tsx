import React, { useState } from 'react';
import {
  Inbox,
  Briefcase,
  Calendar,
  DollarSign,
  Users,
  Settings,
  ShieldCheck,
  Building,
  MessageSquare,
} from 'lucide-react';
import {
  StaffUser,
  BeneficiaryRequest,
  Program,
  Category,
  AppConfig,
} from '../../types';
import { RequestsTab } from './RequestsTab';
import { ProgramsTab } from './ProgramsTab';
import { CalendarTab } from './CalendarTab';
import { FinanceTab } from './FinanceTab';
import { UsersTab } from './UsersTab';
import { SettingsTab } from './SettingsTab';
import { SmsTab } from './SmsTab';

interface AdminLayoutProps {
  currentUser: StaffUser;
  config: AppConfig | null;
  requests: BeneficiaryRequest[];
  programs: Program[];
  needCategories: Category[];
  programCategories: Category[];
  onRefreshRequests: () => void;
  onRefreshPrograms: () => void;
  onRefreshCategories: () => void;
  onConfigUpdated: (config: AppConfig) => void;
}

export type AdminTab = 'inbox' | 'programs' | 'calendar' | 'finance' | 'users' | 'sms' | 'settings';

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  config,
  requests,
  programs,
  needCategories,
  programCategories,
  onRefreshRequests,
  onRefreshPrograms,
  onRefreshCategories,
  onConfigUpdated,
}) => {
  // Determine default tab based on user permissions
  const getInitialTab = (): AdminTab => {
    if (currentUser.perms.viewInbox) return 'inbox';
    if (currentUser.perms.viewProg) return 'programs';
    if (currentUser.perms.viewFin) return 'finance';
    if (currentUser.perms.manageSettings) return 'settings';
    return 'inbox';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getInitialTab());

  // Permissions checks
  const canInbox = currentUser.perms.viewInbox !== false;
  const canProg = currentUser.perms.viewProg !== false;
  const canFin = currentUser.perms.viewFin !== false;
  const canUsers = currentUser.username === 'admin' || currentUser.perms.manageSettings;
  const canSettings = currentUser.perms.manageSettings !== false;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pb-20 md:pb-6">
      {/* Admin Subheader & Desktop Tab Navigation */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              پنل مدیریت و خدمات مؤسسه خیریه
            </h2>
            <p className="text-[11px] text-slate-400">
              کاربر فعال: <strong className="text-emerald-300">{currentUser.name}</strong> ({currentUser.role})
            </p>
          </div>
        </div>

        {/* Tab Buttons (Desktop) */}
        <div className="hidden md:flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
          {canInbox && (
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition ${
                activeTab === 'inbox'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Inbox className="w-4 h-4 text-emerald-400" />
              <span>متقاضیان</span>
            </button>
          )}

          {canProg && (
            <button
              onClick={() => setActiveTab('programs')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition ${
                activeTab === 'programs'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>طرح‌ها و پروژه‌ها</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition ${
              activeTab === 'calendar'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>تقویم اجرایی</span>
          </button>

          {canFin && (
            <button
              onClick={() => setActiveTab('finance')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition ${
                activeTab === 'finance'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>گزارشات مالی</span>
            </button>
          )}

          {canUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition ${
                activeTab === 'users'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>کاربران و دسترسی</span>
            </button>
          )}

          {canSettings && (
            <button
              onClick={() => setActiveTab('sms')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition ${
                activeTab === 'sms'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>پنل پیامک (قاصدک)</span>
            </button>
          )}

          {canSettings && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>تنظیمات و هویت</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'inbox' && canInbox && (
          <RequestsTab
            requests={requests}
            needCategories={needCategories}
            currentUser={currentUser}
            onRefresh={onRefreshRequests}
          />
        )}

        {activeTab === 'programs' && canProg && (
          <ProgramsTab
            programs={programs}
            programCategories={programCategories}
            currentUser={currentUser}
            onRefresh={onRefreshPrograms}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab programs={programs} requests={requests} />
        )}

        {activeTab === 'finance' && canFin && <FinanceTab />}

        {activeTab === 'users' && canUsers && <UsersTab currentUser={currentUser} />}

        {activeTab === 'sms' && canSettings && <SmsTab currentUser={currentUser} />}

        {activeTab === 'settings' && canSettings && (
          <SettingsTab
            config={config}
            needCategories={needCategories}
            programCategories={programCategories}
            onConfigUpdated={onConfigUpdated}
            onRefreshCategories={onRefreshCategories}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (like in original HTML) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 py-2 px-3 shadow-lg flex items-center justify-around text-[10px]">
        {canInbox && (
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'inbox' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>نیازمندان</span>
          </button>
        )}

        {canProg && (
          <button
            onClick={() => setActiveTab('programs')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'programs' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>طرح‌ها</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'calendar' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>تقویم</span>
        </button>

        {canFin && (
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'finance' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>مالی</span>
          </button>
        )}

        {canUsers && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'users' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>کاربران</span>
          </button>
        )}

        {canSettings && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'settings' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>تنظیمات</span>
          </button>
        )}
      </div>
    </div>
  );
};
