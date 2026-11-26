import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Briefcase,
  Calendar,
  DollarSign,
  Users,
  Settings,
  ShieldCheck,
  MessageSquare,
  Link2,
  Check,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Globe,
} from 'lucide-react';
import {
  StaffUser,
  BeneficiaryRequest,
  Program,
  Category,
  AppConfig,
  CustomForm,
  LoginPortal,
  SmsTemplate,
} from '../../types';
import { EntityDefinition } from '../../utils/publicFormConfig';
import { hasPermission } from '../../utils/permissions';
import { api } from '../../services/api';
import { RequestsTab } from './RequestsTab';
import { ProgramsTab } from './ProgramsTab';
import { PortalsTab } from './PortalsTab';
import { CalendarTab } from './CalendarTab';
import { FinanceTab } from './FinanceTab';
import { UsersTab } from './UsersTab';
import { SettingsTab } from './SettingsTab';
import { SmsTab } from './SmsTab';
import { FormsTab } from './FormsTab';

interface AdminLayoutProps {
  currentUser: StaffUser;
  config: AppConfig | null;
  requests: BeneficiaryRequest[];
  programs: Program[];
  needCategories: Category[];
  programCategories: Category[];
  entities: EntityDefinition[];
  onRefreshRequests: () => void;
  onRefreshPrograms: () => void;
  onRefreshCategories: () => void;
  onRefreshEntities: () => void;
  onConfigUpdated: (config: AppConfig) => void;
  onCurrentUserUpdated?: (user: StaffUser) => void;
}

export type AdminTab =
  | 'inbox'
  | 'programs'
  | 'portals'
  | 'calendar'
  | 'finance'
  | 'users'
  | 'sms'
  | 'forms'
  | 'settings';

const VALID_ADMIN_TABS: AdminTab[] = [
  'inbox',
  'programs',
  'portals',
  'calendar',
  'finance',
  'users',
  'sms',
  'forms',
  'settings',
];

function parseAdminRouteFromLocation(): { tab: AdminTab | null; participantsProgramId: number | null } {
  if (typeof window === 'undefined') return { tab: null, participantsProgramId: null };
  const path = window.location.pathname.replace(/\/+$/, '');
  const partMatch = path.match(/^\/admin\/programs\/(\d+)\/participants$/i);
  if (partMatch) {
    return { tab: 'programs', participantsProgramId: parseInt(partMatch[1], 10) };
  }
  const tabMatch = path.match(/^\/admin\/([a-z-]+)$/i);
  if (tabMatch) {
    const candidate = tabMatch[1].toLowerCase() as AdminTab;
    if (VALID_ADMIN_TABS.includes(candidate)) {
      return { tab: candidate, participantsProgramId: null };
    }
  }
  return { tab: null, participantsProgramId: null };
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  config,
  requests,
  programs,
  needCategories,
  programCategories,
  entities,
  onRefreshRequests,
  onRefreshPrograms,
  onRefreshCategories,
  onRefreshEntities,
  onConfigUpdated,
  onCurrentUserUpdated,
}) => {
  const canInbox =
    hasPermission(currentUser, 'viewInbox') || hasPermission(currentUser, 'decideInbox');
  const canProg =
    hasPermission(currentUser, 'viewProg') ||
    hasPermission(currentUser, 'createProg') ||
    hasPermission(currentUser, 'decideProg');
  const canCalendar = hasPermission(currentUser, 'viewCalendar');
  const canFin = hasPermission(currentUser, 'viewFin');
  const canUsers = hasPermission(currentUser, 'manageUsers');
  const canSms =
    hasPermission(currentUser, 'manageSms') || hasPermission(currentUser, 'manageSmsTemplates');
  const canForms =
    hasPermission(currentUser, 'viewForms') || hasPermission(currentUser, 'manageForms');
  const canSettings = hasPermission(currentUser, 'manageSettings');
  const canPortals = canForms || canProg || canSettings;

  const isTabAllowed = useCallback(
    (tab: AdminTab) => {
      if (tab === 'inbox') return canInbox;
      if (tab === 'programs') return canProg;
      if (tab === 'portals') return canPortals;
      if (tab === 'calendar') return canCalendar;
      if (tab === 'finance') return canFin;
      if (tab === 'users') return canUsers;
      if (tab === 'sms') return canSms;
      if (tab === 'forms') return canForms;
      if (tab === 'settings') return canSettings;
      return false;
    },
    [canInbox, canProg, canPortals, canCalendar, canFin, canUsers, canSms, canForms, canSettings]
  );

  // Determine default tab based on user permissions
  const getInitialTab = useCallback((): AdminTab => {
    if (canInbox) return 'inbox';
    if (canForms) return 'forms';
    if (canProg) return 'programs';
    if (canPortals) return 'portals';
    if (canFin) return 'finance';
    if (canSms) return 'sms';
    if (canUsers) return 'users';
    if (canSettings) return 'settings';
    return 'calendar';
  }, [canInbox, canForms, canProg, canPortals, canFin, canSms, canUsers, canSettings]);

  const initialRoute = parseAdminRouteFromLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    initialRoute.tab && isTabAllowed(initialRoute.tab) ? initialRoute.tab : getInitialTab()
  );
  const [participantsProgramId, setParticipantsProgramId] = useState<number | null>(
    () => initialRoute.participantsProgramId
  );
  const [portals, setPortals] = useState<LoginPortal[]>([]);
  const [formsList, setFormsList] = useState<CustomForm[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);

  // Self-service password change modal state
  const [showPassModal, setShowPassModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  const syncAdminUrl = useCallback(
    (tab: AdminTab, progId: number | null = null, replace = false) => {
      if (typeof window === 'undefined') return;
      const target =
        tab === 'programs' && progId ? `/admin/programs/${progId}/participants` : `/admin/${tab}`;
      if (window.location.pathname !== target) {
        if (replace) window.history.replaceState({}, '', target);
        else window.history.pushState({}, '', target);
      }
    },
    []
  );

  const switchTab = useCallback(
    (tab: AdminTab, progId: number | null = null) => {
      setActiveTab(tab);
      setParticipantsProgramId(tab === 'programs' ? progId : null);
      syncAdminUrl(tab, tab === 'programs' ? progId : null);
    },
    [syncAdminUrl]
  );

  const handleParticipantsProgramChange = useCallback(
    (progId: number | null) => {
      setParticipantsProgramId(progId);
      syncAdminUrl('programs', progId);
    },
    [syncAdminUrl]
  );

  // Sync URL on initial mount & listen to browser back/forward
  useEffect(() => {
    const parsed = parseAdminRouteFromLocation();
    if (parsed.tab && isTabAllowed(parsed.tab)) {
      setActiveTab(parsed.tab);
      setParticipantsProgramId(parsed.participantsProgramId);
    } else {
      const fallback = getInitialTab();
      setActiveTab(fallback);
      setParticipantsProgramId(null);
      syncAdminUrl(fallback, null, true);
    }

    const onPopState = () => {
      const next = parseAdminRouteFromLocation();
      if (next.tab && isTabAllowed(next.tab)) {
        setActiveTab(next.tab);
        setParticipantsProgramId(next.participantsProgramId);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isTabAllowed, getInitialTab, syncAdminUrl]);

  const loadPortalsAndSupporting = useCallback(async () => {
    const [pRes, fRes, tRes] = await Promise.all([
      canPortals ? api.getPortals().catch(() => []) : Promise.resolve([]),
      canForms || canProg ? api.getForms().catch(() => []) : Promise.resolve([]),
      api.getSmsTemplates(false).catch(() => []),
    ]);
    setPortals(Array.isArray(pRes) ? pRes : []);
    setFormsList(Array.isArray(fRes) ? fRes : []);
    setSmsTemplates(Array.isArray(tRes) ? tRes : []);
  }, [canPortals, canForms, canProg]);

  useEffect(() => {
    loadPortalsAndSupporting();
  }, [loadPortalsAndSupporting]);

  useEffect(() => {
    if (!isTabAllowed(activeTab)) {
      const fallback = getInitialTab();
      setActiveTab(fallback);
      syncAdminUrl(fallback, null, true);
    }
  }, [activeTab, isTabAllowed, getInitialTab, syncAdminUrl]);

  const handleCopyPublicFormLink = () => {
    const url = `${window.location.origin}/form`;
    navigator.clipboard.writeText(url);
    setCopiedPublicLink(true);
    setTimeout(() => setCopiedPublicLink(false), 2500);
  };

  const handleOpenPassModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPassError('');
    setPassSuccess(false);
    setShowPassModal(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPassword.length < 4) {
      setPassError('رمز عبور جدید باید حداقل ۴ کاراکتر باشد.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('تکرار رمز عبور جدید با آن مطابقت ندارد.');
      return;
    }
    setPassLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPassModal(false);
      }, 1400);
    } catch (err: any) {
      setPassError(err.message || 'خطا در تغییر رمز عبور');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pb-20 md:pb-6">
      {/* Admin Subheader & Desktop Tab Navigation */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
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

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyPublicFormLink}
              title="کپی لینک اختصاصی فرم عمومی (بدون دکمه ورود)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition shrink-0 ${
                copiedPublicLink
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
            >
              {copiedPublicLink ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
              <span>{copiedPublicLink ? 'لینک کپی شد!' : 'لینک فرم عمومی'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPassModal}
              title="تغییر رمز عبور حساب شخصی"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700 transition shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">تغییر رمز</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons (Desktop) */}
        <div className="hidden md:flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
          {canInbox && (
            <button
              onClick={() => switchTab('inbox')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
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
              onClick={() => switchTab('programs')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'programs'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>طرح‌ها و پروژه‌ها</span>
            </button>
          )}

          {canPortals && (
            <button
              onClick={() => switchTab('portals')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'portals'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>صفحات ورود اختصاصی</span>
            </button>
          )}

          {canCalendar && (
            <button
              onClick={() => switchTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>تقویم اجرایی</span>
            </button>
          )}

          {canFin && (
            <button
              onClick={() => switchTab('finance')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
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
              onClick={() => switchTab('users')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>کاربران و دسترسی</span>
            </button>
          )}

          {canSms && (
            <button
              onClick={() => switchTab('sms')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'sms'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>پنل پیامک (قاصدک)</span>
            </button>
          )}

          {canForms && (
            <button
              onClick={() => switchTab('forms')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'forms'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <span>فرم‌ساز</span>
            </button>
          )}

          {canSettings && (
            <button
              onClick={() => switchTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer ${
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
            config={config}
            entities={entities}
            onRefresh={onRefreshRequests}
          />
        )}

        {activeTab === 'programs' && canProg && (
          <ProgramsTab
            programs={programs}
            programCategories={programCategories}
            portals={portals}
            forms={formsList}
            smsTemplates={smsTemplates}
            currentUser={currentUser}
            config={config}
            entities={entities}
            activeParticipantsProgramId={participantsProgramId}
            onParticipantsProgramChange={handleParticipantsProgramChange}
            onRefresh={() => {
              onRefreshPrograms();
              loadPortalsAndSupporting();
            }}
            onRefreshCategories={onRefreshCategories}
            onConfigUpdated={onConfigUpdated}
            onOpenFormBuilder={canForms ? () => switchTab('forms') : undefined}
            onOpenPortalsTab={canPortals ? () => switchTab('portals') : undefined}
          />
        )}

        {activeTab === 'portals' && canPortals && (
          <PortalsTab
            portals={portals}
            onRefresh={async () => {
              await loadPortalsAndSupporting();
              onRefreshPrograms();
            }}
            onOpenProgramParticipants={
              canProg ? (progId) => switchTab('programs', progId) : undefined
            }
          />
        )}

        {activeTab === 'calendar' && canCalendar && (
          <CalendarTab programs={programs} requests={requests} />
        )}

        {activeTab === 'finance' && canFin && <FinanceTab />}

        {activeTab === 'users' && canUsers && <UsersTab currentUser={currentUser} />}

        {activeTab === 'sms' && canSms && (
          <SmsTab
            currentUser={currentUser}
            appConfig={config}
            onConfigUpdated={onConfigUpdated}
            onCurrentUserUpdated={onCurrentUserUpdated}
          />
        )}

        {activeTab === 'forms' && canForms && (
          <FormsTab
            currentUser={currentUser}
            config={config}
            needCategories={needCategories}
            entities={entities}
            onRefreshEntities={onRefreshEntities}
            onRefreshCategories={onRefreshCategories}
            onConfigUpdated={onConfigUpdated}
          />
        )}

        {activeTab === 'settings' && canSettings && (
          <SettingsTab
            currentUser={currentUser}
            config={config}
            needCategories={needCategories}
            programCategories={programCategories}
            entities={entities}
            onConfigUpdated={onConfigUpdated}
            onCurrentUserUpdated={onCurrentUserUpdated}
            onRefreshCategories={onRefreshCategories}
            onOpenFormBuilder={() => switchTab('forms')}
            onOpenSmsTab={() => switchTab('sms')}
          />
        )}
      </div>

      {/* Self-service Password Change Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm">تغییر رمز عبور حساب کاربری</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-900">
                  رمز عبور شما با موفقیت تغییر یافت.
                </p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                {passError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رمز عبور فعلی</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رمز عبور جدید</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تکرار رمز عبور جدید</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-right"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPassModal(false)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50"
                  >
                    {passLoading ? 'در حال ثبت...' : 'ذخیره رمز جدید'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 py-2 px-2 shadow-lg flex items-center justify-around gap-1 overflow-x-auto text-[10px]">
        {canInbox && (
          <button
            onClick={() => switchTab('inbox')}
            className={`flex flex-col items-center gap-1 min-w-[48px] ${
              activeTab === 'inbox' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>نیازمندان</span>
          </button>
        )}

        {canProg && (
          <button
            onClick={() => switchTab('programs')}
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
              activeTab === 'programs' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>طرح‌ها</span>
          </button>
        )}

        {canPortals && (
          <button
            onClick={() => switchTab('portals')}
            className={`flex flex-col items-center gap-1 min-w-[46px] ${
              activeTab === 'portals' ? 'text-indigo-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>پورتال‌ها</span>
          </button>
        )}

        {canCalendar && (
          <button
            onClick={() => switchTab('calendar')}
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
              activeTab === 'calendar' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>تقویم</span>
          </button>
        )}

        {canFin && (
          <button
            onClick={() => switchTab('finance')}
            className={`flex flex-col items-center gap-1 min-w-[40px] ${
              activeTab === 'finance' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>مالی</span>
          </button>
        )}

        {canUsers && (
          <button
            onClick={() => switchTab('users')}
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
              activeTab === 'users' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>کاربران</span>
          </button>
        )}

        {canSms && (
          <button
            onClick={() => switchTab('sms')}
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
              activeTab === 'sms' ? 'text-amber-700 font-bold' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>پیامک</span>
          </button>
        )}

        {canForms && (
          <button
            onClick={() => switchTab('forms')}
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
              activeTab === 'forms' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>فرم‌ساز</span>
          </button>
        )}

        {canSettings && (
          <button
            onClick={() => switchTab('settings')}
            className={`flex flex-col items-center gap-1 min-w-[44px] ${
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
