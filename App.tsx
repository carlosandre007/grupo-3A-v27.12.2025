
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

    // Fetch IPVA Alerts (due within 5 days)
    const fetchIpvaAlerts = async () => {
      const today = new Date();
      const next5Days = new Date();
      next5Days.setDate(today.getDate() + 5);

      const { data } = await supabase
        .from('ipva_records')
        .select('*')
        .eq('status', 'pending');

      if (data) {
        const count = data.filter((item: any) => {
          const due = new Date(item.due_date);
          const diffTime = due.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          // Show alert if due in <= 5 days and not past (or maybe include past?)
          // Let's include everything <= 5 days (including overdue)
          return diffDays <= 5;
        }).length;
        setIpvaAlerts(count);
      }
    };

    fetchIpvaAlerts();

    // Poll every minute for updates (optional, but good for "realtime" feel)
    const interval = setInterval(fetchIpvaAlerts, 60000);

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
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        ipvaAlerts={ipvaAlerts}
      />

      <main className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-brand-bg overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-brand-surface border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-slate-900 font-black shadow-sm">G</div>
            <span className="font-black text-slate-900 dark:text-white">GRUPO 3A</span>
          </div>
          <button className="p-2 text-slate-500">
            <span className="material-symbols-outlined">menu</span>
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
