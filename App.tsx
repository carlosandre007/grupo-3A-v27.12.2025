
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

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

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
        return <Dashboard />;
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
        return <ClientManagement />;
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
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center">
        <div className="w-72 h-72 relative">
          <img src="/logo.png" alt="Loading" className="w-full h-full object-contain animate-pulse" />
          <div className="absolute inset-0 border-[10px] border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => { }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        ipvaAlerts={ipvaAlerts}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-brand-bg overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-brand-surface border-b border-slate-200 dark:border-slate-800 z-50">
          <div className="w-24 h-24 flex items-center justify-center overflow-hidden leading-none">
            <img src="/logo.png" alt="Logo Grupo 3A" className="w-full h-full object-contain" />
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
          >
            <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
        </header>

        {/* Dynamic Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
