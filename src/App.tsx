import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { PublicView } from './components/PublicView';
import { CustomFormPublicView } from './components/CustomFormPublicView';
import { LoginView } from './components/LoginView';
import { AdminLayout } from './components/admin/AdminLayout';
import {
  AppConfig,
  BeneficiaryRequest,
  Category,
  Program,
  StaffUser,
} from './types';
import { EntityDefinition } from './utils/publicFormConfig';
import { api } from './services/api';
import { HeartHandshake } from 'lucide-react';

const ACTIVE_VIEW_STORAGE_KEY = 'OM_CHARITY_ACTIVE_VIEW';

export default function App() {
  const customFormMatch =
    typeof window !== 'undefined'
      ? window.location.pathname.match(/^\/forms\/([^/]+)\/?$/)
      : null;
  const queryCustomForm =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('form')
      : null;
  const customFormSlug = customFormMatch
    ? decodeURIComponent(customFormMatch[1])
    : queryCustomForm || null;

  const isStandaloneRequestForm =
    !customFormSlug &&
    typeof window !== 'undefined' &&
    (window.location.pathname === '/form' ||
      window.location.pathname === '/form/' ||
      window.location.pathname === '/public-form' ||
      new URLSearchParams(window.location.search).get('mode') === 'form');

  const isStandalonePage = isStandaloneRequestForm || Boolean(customFormSlug);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [needCategories, setNeedCategories] = useState<Category[]>([]);
  const [programCategories, setProgramCategories] = useState<Category[]>([]);
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [requests, setRequests] = useState<BeneficiaryRequest[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [activeView, setActiveView] = useState<'public' | 'login' | 'admin'>('public');
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const canReadRequests = (user: StaffUser | null) => {
    if (!user) return false;
    return (
      user.username === 'admin' ||
      Boolean(user.perms?.viewInbox || user.perms?.decideInbox || user.perms?.viewFin)
    );
  };

  const canReadPrograms = (user: StaffUser | null) => {
    if (!user) return false;
    return (
      user.username === 'admin' ||
      Boolean(
        user.perms?.viewProg ||
          user.perms?.createProg ||
          user.perms?.decideProg ||
          user.perms?.viewFin
      )
    );
  };

  const loadProtectedData = useCallback(async (user: StaffUser | null) => {
    if (!user || isStandalonePage) {
      setRequests([]);
      setPrograms([]);
      return;
    }
    try {
      const [reqs, progs] = await Promise.all([
        canReadRequests(user) ? api.getRequests().catch(() => []) : Promise.resolve([]),
        canReadPrograms(user) ? api.getPrograms().catch(() => []) : Promise.resolve([]),
      ]);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setPrograms(Array.isArray(progs) ? progs : []);
    } catch {
      setRequests([]);
      setPrograms([]);
    }
  }, [isStandalonePage]);

  const clearAuthSession = useCallback((nextView: 'public' | 'login') => {
    setCurrentUser(null);
    setRequests([]);
    setPrograms([]);
    localStorage.removeItem('OM_CHARITY_CURRENT_USER');
    localStorage.removeItem('OM_CHARITY_AUTH_TOKEN');
    sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
    setActiveView(nextView);
  }, []);

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      clearAuthSession('login');
    });
    return () => {
      api.setUnauthorizedHandler(null);
    };
  }, [clearAuthSession]);

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        const [conf, cats, ents] = await Promise.all([
          api.getConfig(),
          api.getCategories(),
          api.getEntities().catch(() => []),
        ]);
        setConfig(conf);
        setNeedCategories(cats.needCategories || []);
        setProgramCategories(cats.programCategories || []);
        setEntities(Array.isArray(ents) ? ents : []);

        if (!isStandalonePage) {
          const token = localStorage.getItem('OM_CHARITY_AUTH_TOKEN');
          if (token) {
            try {
              const { user } = await api.getMe(token);
              setCurrentUser(user);
              localStorage.setItem('OM_CHARITY_CURRENT_USER', JSON.stringify(user));
              await loadProtectedData(user);
              const savedView = sessionStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
              if (savedView === 'admin') {
                setActiveView('admin');
              }
            } catch {
              clearAuthSession('public');
            }
          } else {
            localStorage.removeItem('OM_CHARITY_CURRENT_USER');
            sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Error loading initial data from backend:', err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, [isStandalonePage, loadProtectedData, clearAuthSession]);

  const navigateTo = (view: 'public' | 'login' | 'admin') => {
    if (isStandalonePage) return;
    if (view === 'admin' && !currentUser) {
      setActiveView('login');
      sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
      return;
    }
    setActiveView(view);
    if (view === 'admin') {
      sessionStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, 'admin');
    } else {
      sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
    }
  };

  const handleLoginSuccess = async (user: StaffUser, token?: string) => {
    if (!token) return;
    localStorage.setItem('OM_CHARITY_AUTH_TOKEN', token);
    localStorage.setItem('OM_CHARITY_CURRENT_USER', JSON.stringify(user));
    setCurrentUser(user);
    setActiveView('admin');
    sessionStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, 'admin');
    await loadProtectedData(user);
  };

  const handleLogout = () => {
    clearAuthSession('public');
  };

  const refreshRequests = async () => {
    if (isStandalonePage || !canReadRequests(currentUser)) return;
    try {
      const data = await api.getRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshPrograms = async () => {
    if (isStandalonePage || !canReadPrograms(currentUser)) return;
    try {
      const data = await api.getPrograms();
      setPrograms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshCategories = async () => {
    try {
      const cats = await api.getCategories();
      setNeedCategories(cats.needCategories || []);
      setProgramCategories(cats.programCategories || []);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshEntities = async () => {
    try {
      const ents = await api.getEntities();
      setEntities(Array.isArray(ents) ? ents : []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        config={config}
        currentUser={isStandalonePage ? null : currentUser}
        activeView={isStandalonePage ? 'public' : activeView}
        standalone={isStandalonePage}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">
              در حال دریافت و بارگذاری اطلاعات سامانه...
            </p>
          </div>
        ) : customFormSlug ? (
          <CustomFormPublicView slug={customFormSlug} config={config} />
        ) : isStandaloneRequestForm ? (
          <PublicView
            config={config}
            needCategories={needCategories}
            entities={entities}
          />
        ) : (
          <>
            {activeView === 'public' && (
              <PublicView
                config={config}
                needCategories={needCategories}
                entities={entities}
                onRequestSubmitted={refreshRequests}
              />
            )}

            {(activeView === 'login' || (activeView === 'admin' && !currentUser)) && (
              <LoginView
                config={config}
                onLoginSuccess={handleLoginSuccess}
                onBackToPublic={() => navigateTo('public')}
              />
            )}

            {activeView === 'admin' && currentUser && (
              <AdminLayout
                currentUser={currentUser}
                config={config}
                requests={requests}
                programs={programs}
                needCategories={needCategories}
                programCategories={programCategories}
                entities={entities}
                onRefreshRequests={refreshRequests}
                onRefreshPrograms={refreshPrograms}
                onRefreshCategories={refreshCategories}
                onRefreshEntities={refreshEntities}
                onConfigUpdated={(c) => setConfig(c)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <span className="text-slate-300 font-semibold">
              {config?.instName || 'مؤسسه خیریه حضرت ام‌البنین (س)'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-500">
              سامانه جامع خدمات، نیازسنجی مردمی و پایش طرح‌ها
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>حفظ کرامت و رازداری هویت مددجویان</span>
            <span className="text-slate-700">•</span>
            <span>پایش شفاف اعتبارات و پروژه‌ها</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
