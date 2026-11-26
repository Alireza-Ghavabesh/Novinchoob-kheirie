import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header, AppView } from './components/Header';
import { PublicView } from './components/PublicView';
import { CustomFormPublicView } from './components/CustomFormPublicView';
import { LoginView } from './components/LoginView';
import { BeneficiaryLoginView } from './components/BeneficiaryLoginView';
import { BeneficiaryPortalView } from './components/BeneficiaryPortalView';
import { AdminLayout } from './components/admin/AdminLayout';
import {
  AppConfig,
  BeneficiaryAccount,
  BeneficiaryRequest,
  Category,
  LoginPortal,
  Program,
  StaffUser,
} from './types';
import { EntityDefinition } from './utils/publicFormConfig';
import { api, BENEFICIARY_TOKEN_KEY } from './services/api';
import { HeartHandshake, AlertCircle } from 'lucide-react';

const ACTIVE_VIEW_STORAGE_KEY = 'OM_CHARITY_ACTIVE_VIEW';

interface ParsedLocation {
  pathname: string;
  customFormSlug: string | null;
  dedicatedPortalSlug: string | null;
  isStandaloneRequestForm: boolean;
  isAdminPath: boolean;
  isPortalPath: boolean;
  rawPathSlug: string;
  isLegacyBeneficiaryRoute: boolean;
}

function parseBrowserLocation(): ParsedLocation {
  if (typeof window === 'undefined') {
    return {
      pathname: '/',
      customFormSlug: null,
      dedicatedPortalSlug: null,
      isStandaloneRequestForm: false,
      isAdminPath: false,
      isPortalPath: false,
      rawPathSlug: '',
      isLegacyBeneficiaryRoute: false,
    };
  }

  const pathname = window.location.pathname || '/';
  const searchParams = new URLSearchParams(window.location.search);

  const customFormMatch = pathname.match(/^\/forms\/([^/]+)\/?$/i);
  const queryCustomForm = searchParams.get('form');
  const customFormSlug = customFormMatch
    ? decodeURIComponent(customFormMatch[1])
    : queryCustomForm || null;

  const portalMatch = pathname.match(/^\/p\/([^/]+)\/?$/i);
  const dedicatedPortalSlug = portalMatch ? decodeURIComponent(portalMatch[1]).toLowerCase() : null;

  const isStandaloneRequestForm =
    !customFormSlug &&
    !dedicatedPortalSlug &&
    (pathname === '/form' ||
      pathname === '/form/' ||
      pathname === '/public-form' ||
      pathname === '/public-form/' ||
      searchParams.get('mode') === 'form');

  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isPortalPath = pathname === '/portal' || pathname === '/portal/';
  const rawPathSlug = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const isLegacyBeneficiaryRoute =
    rawPathSlug === 'beneficiary' || searchParams.get('portal') === 'beneficiary';

  return {
    pathname,
    customFormSlug,
    dedicatedPortalSlug,
    isStandaloneRequestForm,
    isAdminPath,
    isPortalPath,
    rawPathSlug,
    isLegacyBeneficiaryRoute,
  };
}

export default function App() {
  const [loc, setLoc] = useState<ParsedLocation>(() => parseBrowserLocation());

  const isStandalonePage = loc.isStandaloneRequestForm || Boolean(loc.customFormSlug);
  const isDedicatedPortalPage = Boolean(loc.dedicatedPortalSlug);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [needCategories, setNeedCategories] = useState<Category[]>([]);
  const [programCategories, setProgramCategories] = useState<Category[]>([]);
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [requests, setRequests] = useState<BeneficiaryRequest[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [activePortal, setActivePortal] = useState<LoginPortal | null>(null);
  const [portalNotFoundError, setPortalNotFoundError] = useState<string>('');

  const [isBeneficiaryEntryRoute, setIsBeneficiaryEntryRoute] = useState<boolean>(
    loc.isLegacyBeneficiaryRoute || loc.isPortalPath
  );
  const [isAdminEntryRoute, setIsAdminEntryRoute] = useState<boolean>(loc.isAdminPath);

  const [activeView, setActiveView] = useState<AppView>('beneficiary-login');
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [currentBeneficiary, setCurrentBeneficiary] = useState<BeneficiaryAccount | null>(null);
  const [loading, setLoading] = useState(true);

  // Remember deep /admin/... route if staff needed to log in first
  const pendingAdminPathRef = useRef<string | null>(
    loc.isAdminPath && loc.pathname !== '/admin' ? loc.pathname : null
  );

  const pushPath = useCallback((path: string, replace = false) => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== path) {
      if (replace) window.history.replaceState({}, '', path);
      else window.history.pushState({}, '', path);
    }
    setLoc(parseBrowserLocation());
  }, []);

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

  const loadProtectedData = useCallback(
    async (user: StaffUser | null) => {
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
    },
    [isStandalonePage]
  );

  const clearAuthSession = useCallback(
    (nextView: AppView, nextPath?: string) => {
      setCurrentUser(null);
      setRequests([]);
      setPrograms([]);
      localStorage.removeItem('OM_CHARITY_CURRENT_USER');
      localStorage.removeItem('OM_CHARITY_AUTH_TOKEN');
      sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
      setActiveView(nextView);
      if (nextPath) pushPath(nextPath, true);
    },
    [pushPath]
  );

  const clearBeneficiarySession = useCallback((nextView?: AppView) => {
    setCurrentBeneficiary(null);
    localStorage.removeItem(BENEFICIARY_TOKEN_KEY);
    if (nextView) setActiveView(nextView);
  }, []);

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      clearAuthSession('login');
    });
    api.setBeneficiaryUnauthorizedHandler(() => {
      clearBeneficiarySession('beneficiary-login');
    });
    return () => {
      api.setUnauthorizedHandler(null);
      api.setBeneficiaryUnauthorizedHandler(null);
    };
  }, [clearAuthSession, clearBeneficiarySession]);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const nextLoc = parseBrowserLocation();
      setLoc(nextLoc);
      if (nextLoc.dedicatedPortalSlug) {
        setActiveView(currentBeneficiary ? 'beneficiary-portal' : 'beneficiary-login');
      } else if (nextLoc.isAdminPath) {
        if (currentUser) setActiveView('admin');
        else setActiveView('login');
      } else if (nextLoc.isPortalPath || nextLoc.rawPathSlug === '' || nextLoc.isLegacyBeneficiaryRoute) {
        setActiveView(currentBeneficiary ? 'beneficiary-portal' : 'beneficiary-login');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, currentBeneficiary]);

  // Load dedicated portal info whenever /p/:slug changes
  useEffect(() => {
    if (!loc.dedicatedPortalSlug) {
      setActivePortal(null);
      setPortalNotFoundError('');
      return;
    }
    let cancelled = false;
    api
      .getPublicPortal(loc.dedicatedPortalSlug)
      .then((portalData) => {
        if (!cancelled) {
          setActivePortal(portalData);
          setPortalNotFoundError('');
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setActivePortal(null);
          setPortalNotFoundError(
            err?.message || 'صفحه ورود اختصاصی مورد نظر یافت نشد یا غیرفعال است.'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loc.dedicatedPortalSlug]);

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      const initialLoc = parseBrowserLocation();
      setLoc(initialLoc);
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

        const standalone =
          initialLoc.isStandaloneRequestForm || Boolean(initialLoc.customFormSlug);
        if (standalone) {
          return;
        }

        // Dedicated Custom Portal (/p/:slug)
        if (initialLoc.dedicatedPortalSlug) {
          try {
            const portalData = await api.getPublicPortal(initialLoc.dedicatedPortalSlug);
            setActivePortal(portalData);
            setPortalNotFoundError('');
          } catch (err: any) {
            setActivePortal(null);
            setPortalNotFoundError(
              err?.message || 'صفحه ورود اختصاصی مورد نظر یافت نشد یا غیرفعال است.'
            );
          }

          const bToken = localStorage.getItem(BENEFICIARY_TOKEN_KEY);
          if (bToken) {
            try {
              const { beneficiary } = await api.getBeneficiaryMe(bToken);
              setCurrentBeneficiary(beneficiary);
              setActiveView('beneficiary-portal');
            } catch {
              clearBeneficiarySession('beneficiary-login');
            }
          } else {
            setActiveView('beneficiary-login');
          }
          return;
        }

        const configuredBeneficiarySlug = (conf?.beneficiaryLoginSlug || 'beneficiary')
          .trim()
          .toLowerCase();
        const matchedBeneficiaryRoute =
          initialLoc.isLegacyBeneficiaryRoute ||
          initialLoc.isPortalPath ||
          (Boolean(initialLoc.rawPathSlug) &&
            initialLoc.rawPathSlug === configuredBeneficiarySlug);
        setIsBeneficiaryEntryRoute(matchedBeneficiaryRoute);

        let matchedAdminSlug = false;
        if (
          !matchedBeneficiaryRoute &&
          !initialLoc.isAdminPath &&
          initialLoc.rawPathSlug &&
          !initialLoc.rawPathSlug.includes('/')
        ) {
          try {
            const check = await api.checkAdminRoute(initialLoc.rawPathSlug);
            matchedAdminSlug = Boolean(check?.isAdminRoute);
          } catch {
            matchedAdminSlug = false;
          }
        }
        const wantsAdmin = initialLoc.isAdminPath || matchedAdminSlug;
        setIsAdminEntryRoute(wantsAdmin);

        let hasValidStaff = false;
        if (!matchedBeneficiaryRoute) {
          const token = localStorage.getItem('OM_CHARITY_AUTH_TOKEN');
          if (token) {
            try {
              const { user } = await api.getMe(token);
              hasValidStaff = true;
              setCurrentUser(user);
              localStorage.setItem('OM_CHARITY_CURRENT_USER', JSON.stringify(user));
              await loadProtectedData(user);
              if (wantsAdmin) {
                setActiveView('admin');
                if (matchedAdminSlug && !initialLoc.isAdminPath) {
                  window.history.replaceState({}, '', '/admin/inbox');
                  setLoc(parseBrowserLocation());
                }
              }
            } catch {
              clearAuthSession(wantsAdmin ? 'login' : 'beneficiary-login');
            }
          } else {
            localStorage.removeItem('OM_CHARITY_CURRENT_USER');
          }
        }

        if (wantsAdmin && !hasValidStaff) {
          setActiveView('login');
          return;
        }
        if (wantsAdmin && hasValidStaff) {
          return;
        }

        const bToken = localStorage.getItem(BENEFICIARY_TOKEN_KEY);
        if (bToken) {
          try {
            const { beneficiary } = await api.getBeneficiaryMe(bToken);
            setCurrentBeneficiary(beneficiary);
            setActiveView('beneficiary-portal');
            if (initialLoc.pathname === '/') {
              window.history.replaceState({}, '', '/portal');
              setLoc(parseBrowserLocation());
            }
          } catch {
            clearBeneficiarySession('beneficiary-login');
          }
        } else {
          setActiveView('beneficiary-login');
        }
      } catch (err) {
        console.error('Error loading initial data from backend:', err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateTo = (view: AppView) => {
    if (isStandalonePage) return;
    if ((isBeneficiaryEntryRoute || isDedicatedPortalPage) && view !== 'beneficiary-login' && view !== 'beneficiary-portal') {
      return;
    }
    if (view === 'admin' && !currentUser) {
      setActiveView('login');
      const adminSlug = (config?.adminLoginSlug || 'admin-portal').trim().toLowerCase();
      pushPath(`/${adminSlug}`);
      return;
    }
    if (view === 'beneficiary-portal' && !currentBeneficiary) {
      setActiveView('beneficiary-login');
      if (!isDedicatedPortalPage) pushPath('/');
      return;
    }

    setActiveView(view);
    if (view === 'admin') {
      sessionStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, 'admin');
      if (!window.location.pathname.startsWith('/admin')) {
        pushPath('/admin/inbox');
      }
    } else if (view === 'login') {
      const adminSlug = (config?.adminLoginSlug || 'admin-portal').trim().toLowerCase();
      pushPath(`/${adminSlug}`);
    } else if (view === 'beneficiary-portal') {
      sessionStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, 'beneficiary-portal');
      if (!isDedicatedPortalPage) pushPath('/portal');
    } else if (view === 'beneficiary-login') {
      sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
      if (!isDedicatedPortalPage) pushPath('/');
    } else if (view === 'public') {
      sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
      pushPath('/form');
    }
  };

  const handleLoginSuccess = async (user: StaffUser, token?: string) => {
    if (!token) return;
    localStorage.setItem('OM_CHARITY_AUTH_TOKEN', token);
    localStorage.setItem('OM_CHARITY_CURRENT_USER', JSON.stringify(user));
    setCurrentUser(user);
    setActiveView('admin');
    sessionStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, 'admin');

    const targetAdminPath = pendingAdminPathRef.current || '/admin/inbox';
    pendingAdminPathRef.current = null;
    pushPath(targetAdminPath);

    const [freshConfig] = await Promise.all([
      api.getConfig().catch(() => null),
      loadProtectedData(user),
    ]);
    if (freshConfig) setConfig(freshConfig);
  };

  const handleLogout = () => {
    const adminSlug = (config?.adminLoginSlug || 'admin-portal').trim().toLowerCase();
    clearAuthSession(
      isAdminEntryRoute ? 'login' : 'beneficiary-login',
      isAdminEntryRoute ? `/${adminSlug}` : '/'
    );
  };

  const handleBeneficiaryLoginSuccess = (beneficiary: BeneficiaryAccount, token: string) => {
    if (!token) return;
    localStorage.setItem(BENEFICIARY_TOKEN_KEY, token);
    setCurrentBeneficiary(beneficiary);
    setActiveView('beneficiary-portal');
    sessionStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, 'beneficiary-portal');
    if (!isDedicatedPortalPage) {
      pushPath('/portal');
    }
  };

  const handleBeneficiaryLogout = () => {
    clearBeneficiarySession('beneficiary-login');
    sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
    if (!isDedicatedPortalPage) {
      pushPath('/');
    }
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
        currentUser={
          isStandalonePage || isBeneficiaryEntryRoute || isDedicatedPortalPage ? null : currentUser
        }
        currentBeneficiary={isStandalonePage ? null : currentBeneficiary}
        activeView={isStandalonePage ? 'public' : activeView}
        standalone={isStandalonePage}
        beneficiaryOnly={
          isDedicatedPortalPage ||
          isBeneficiaryEntryRoute ||
          activeView === 'beneficiary-login' ||
          activeView === 'beneficiary-portal'
        }
        hideAdminLogin={
          config?.hideAdminLoginButton !== false ||
          isDedicatedPortalPage ||
          isBeneficiaryEntryRoute ||
          activeView === 'beneficiary-login' ||
          activeView === 'beneficiary-portal'
        }
        onNavigate={navigateTo}
        onLogout={handleLogout}
        onBeneficiaryLogout={handleBeneficiaryLogout}
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
        ) : loc.customFormSlug ? (
          <CustomFormPublicView slug={loc.customFormSlug} config={config} />
        ) : loc.isStandaloneRequestForm ? (
          <PublicView
            config={config}
            needCategories={needCategories}
            entities={entities}
          />
        ) : isDedicatedPortalPage ? (
          portalNotFoundError || !activePortal ? (
            <div className="py-20 px-4 max-w-md mx-auto text-center space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 space-y-3">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                <h2 className="text-base font-extrabold text-slate-900">
                  صفحه ورود اختصاصی در دسترس نیست
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {portalNotFoundError || 'لینک واردشده معتبر نیست یا توسط مدیر سامانه غیرفعال شده است.'}
                </p>
                <button
                  type="button"
                  onClick={() => pushPath('/')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  بازگشت به صفحه اصلی
                </button>
              </div>
            </div>
          ) : currentBeneficiary ? (
            <BeneficiaryPortalView
              beneficiary={currentBeneficiary}
              config={config}
              portal={activePortal}
              needCategories={needCategories}
              entities={entities}
              onLogout={handleBeneficiaryLogout}
              onBackToPublic={() => setActiveView('beneficiary-portal')}
              isolated={true}
            />
          ) : (
            <BeneficiaryLoginView
              config={config}
              portal={activePortal}
              onLoginSuccess={handleBeneficiaryLoginSuccess}
              onBackToPublic={() => setActiveView('beneficiary-login')}
              isolated={true}
            />
          )
        ) : (
          <>
            {activeView === 'public' && (
              <PublicView
                config={config}
                needCategories={needCategories}
                entities={entities}
                onRequestSubmitted={refreshRequests}
                onOpenBeneficiaryPortal={() =>
                  navigateTo(currentBeneficiary ? 'beneficiary-portal' : 'beneficiary-login')
                }
              />
            )}

            {(activeView === 'beneficiary-login' ||
              (activeView === 'beneficiary-portal' && !currentBeneficiary)) && (
              <BeneficiaryLoginView
                config={config}
                onLoginSuccess={handleBeneficiaryLoginSuccess}
                onBackToPublic={() => navigateTo('beneficiary-login')}
                isolated={true}
              />
            )}

            {activeView === 'beneficiary-portal' && currentBeneficiary && (
              <BeneficiaryPortalView
                beneficiary={currentBeneficiary}
                config={config}
                needCategories={needCategories}
                entities={entities}
                onLogout={handleBeneficiaryLogout}
                onBackToPublic={() => navigateTo('beneficiary-portal')}
                isolated={true}
              />
            )}

            {(activeView === 'login' || (activeView === 'admin' && !currentUser)) && (
              <LoginView
                config={config}
                onLoginSuccess={handleLoginSuccess}
                onBackToPublic={() =>
                  navigateTo(currentBeneficiary ? 'beneficiary-portal' : 'beneficiary-login')
                }
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
                onCurrentUserUpdated={(u) => {
                  setCurrentUser(u);
                  localStorage.setItem('OM_CHARITY_CURRENT_USER', JSON.stringify(u));
                }}
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
