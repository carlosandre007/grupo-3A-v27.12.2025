
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FleetManagement from './components/FleetManagement';
import IPVAControl from './components/IPVAControl';
import PropertyManagement from './components/PropertyManagement';
import CashFlow from './components/CashFlow';
import ChargesSchedule from './components/ChargesSchedule';
import ClientManagement from './components/ClientManagement';
import BankManagement from './components/BankManagement';
import BackupRestore from './components/BackupRestore';
import AlertsView from './components/AlertsView';
import ShoppingCartView from './components/ShoppingCartView';
import Login from './components/Login';


import { NavItem } from './types';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavItem>(NavItem.DASHBOARD);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ipvaAlerts, setIpvaAlerts] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navTarget, setNavTarget] = useState<{ tab: NavItem, clientId?: string } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Initial session check
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
      } catch (err: any) {
        console.error('Initialization error:', err);
        setInitError(err.message || 'Falha na conexão com o banco de dados.');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Fetch General Alerts (IPVA + Maintenance)
    const fetchAlerts = async () => {
      const today = new Date();
      const next5Days = new Date();
      next5Days.setDate(today.getDate() + 5);

      // Fetch IPVA
      const { data: ipvaData } = await supabase
        .from('ipva_records')
        .select('*')
        .eq('status', 'pending');

      // Fetch Maintenance Alerts
      const { data: maintData } = await supabase
        .from('maintenance_alerts')
        .select('*')
        .eq('status', 'active');

      let count = 0;
      if (ipvaData) {
        count += ipvaData.filter((item: any) => {
          const due = new Date(item.due_date);
          const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 5;
        }).length;
      }

      if (maintData) {
        count += maintData.length;
      }

      setIpvaAlerts(count);
    };

    fetchAlerts();


    // Poll every minute for updates (optional, but good for "realtime" feel)
    const interval = setInterval(fetchAlerts, 60000);


    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const renderContent = () => {
    switch (activeTab) {
      case NavItem.DASHBOARD:
        return <Dashboard
          onNavigate={(target) => {
            setActiveTab(target.tab);
            setNavTarget(target);
          }}
        />;
      case NavItem.LOC_MOTTUS:
        return <FleetManagement />;
      case NavItem.IPVA:
        return <IPVAControl />;
      case NavItem.PROPERTIES:
        return <PropertyManagement />;
      case NavItem.CASH_FLOW:
        return <CashFlow />;
      case NavItem.ALERTS:
        return <AlertsView />;
      case NavItem.SHOPPING_CART:
        return <ShoppingCartView />;
      case NavItem.CHARGES:
        return <ChargesSchedule />;

      case NavItem.CLIENTS:
        return <ClientManagement
          initialSelectedClientId={navTarget?.tab === NavItem.CLIENTS ? navTarget.clientId : undefined}
          onProfileShown={() => setNavTarget(null)}
        />;
      case NavItem.BANKS:
        return <BankManagement />;

      case NavItem.BACKUP:
        return <BackupRestore />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-72 h-72 relative mb-8">
          <img src="/logo.png" alt="Loading" className="w-full h-full object-contain animate-pulse" />
          <div className="absolute inset-0 border-[10px] border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        {initError ? (
          <div className="max-w-md bg-white/10 backdrop-blur-md p-8 rounded-[32px] border border-white/20 animate-fade-in">
            <span className="material-symbols-outlined text-danger text-5xl mb-4">error</span>
            <h2 className="text-2xl font-black text-white mb-2">Ops! Algo deu errado</h2>
            <p className="text-slate-400 mb-6">{initError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-primary text-slate-900 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <p className="text-slate-400 font-medium animate-pulse">Iniciando Grupo 3A - Consolidação de Empresas...</p>
        )}
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => { }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50 dark:bg-brand-bg select-none sm:select-text">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        ipvaAlerts={ipvaAlerts}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header - Improved */}
        <header className="md:hidden sticky top-0 flex items-center justify-between p-4 bg-white/80 dark:bg-brand-surface/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 transition-all">
          <div className="h-8 flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-full object-contain" />
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Grupo 3A</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
        </header>

        {/* Dynamic Content Container - Optimized Spacing */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-10 custom-scrollbar scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
