import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PublicView } from './components/PublicView';
import { LoginView } from './components/LoginView';
import { AdminLayout } from './components/admin/AdminLayout';
import {
  AppConfig,
  BeneficiaryRequest,
  Category,
  Program,
  StaffUser,
} from './types';
import { api } from './services/api';
import { Database, HeartHandshake, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [needCategories, setNeedCategories] = useState<Category[]>([]);
  const [programCategories, setProgramCategories] = useState<Category[]>([]);
  const [requests, setRequests] = useState<BeneficiaryRequest[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [activeView, setActiveView] = useState<'public' | 'login' | 'admin'>('public');
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    try {
      const saved = localStorage.getItem('OM_CHARITY_CURRENT_USER');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [conf, cats, reqs, progs] = await Promise.all([
        api.getConfig(),
        api.getCategories(),
        api.getRequests(),
        api.getPrograms(),
      ]);

      setConfig(conf);
      setNeedCategories(cats.needCategories);
      setProgramCategories(cats.programCategories);
      setRequests(reqs);
      setPrograms(progs);
    } catch (err) {
      console.error('Error loading initial data from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: StaffUser) => {
    setCurrentUser(user);
    localStorage.setItem('OM_CHARITY_CURRENT_USER', JSON.stringify(user));
    setActiveView('admin');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('OM_CHARITY_CURRENT_USER');
    setActiveView('public');
  };

  const refreshRequests = async () => {
    try {
      const data = await api.getRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshPrograms = async () => {
    try {
      const data = await api.getPrograms();
      setPrograms(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshCategories = async () => {
    try {
      const cats = await api.getCategories();
      setNeedCategories(cats.needCategories);
      setProgramCategories(cats.programCategories);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        config={config}
        currentUser={currentUser}
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'admin' && !currentUser) {
            setActiveView('login');
          } else {
            setActiveView(view);
          }
        }}
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
        ) : (
          <>
            {activeView === 'public' && (
              <PublicView
                config={config}
                needCategories={needCategories}
                onRequestSubmitted={refreshRequests}
              />
            )}

            {activeView === 'login' && (
              <LoginView
                config={config}
                onLoginSuccess={handleLoginSuccess}
                onBackToPublic={() => setActiveView('public')}
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
                onRefreshRequests={refreshRequests}
                onRefreshPrograms={refreshPrograms}
                onRefreshCategories={refreshCategories}
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
