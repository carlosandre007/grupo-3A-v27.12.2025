
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
import FixedCosts from './components/FixedCosts';
import Login from './components/Login';
import PatrimonioDashboard from './components/PatrimonioDashboard';
import DeletionLogsView from './components/DeletionLogsView';


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

  // Estados do sistema de notificações
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [toast, setToast] = useState<{ id: string, title: string, message: string } | null>(null);

  // Carregar notificações e escutar em tempo real
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notificacoes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data) {
          setNotifications(data);
          setUnreadCount(data.filter((n: any) => !n.lida).length);
        }
      } catch (err) {
        console.warn('Erro ao carregar notificações (tabela pode não existir ainda):', err);
      }
    };

    if (session) {
      fetchNotifications();

      // Inscrição em tempo real
      const channel = supabase
        .channel('realtime-notificacoes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notificacoes' },
          (payload) => {
            const newNotif = payload.new;
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Exibir toast temporário na tela
            setToast({
              id: newNotif.id,
              title: newNotif.titulo,
              message: newNotif.mensagem
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  // Timer para ocultar o toast após 5 segundos
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('lida', false);
      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error('Erro ao marcar como lidas:', e);
    }
  };

  const handleClearNotifications = async () => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (!error) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (e) {
      console.error('Erro ao limpar notificações:', e);
    }
  };

  const handleToggleRead = async (notifId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: !currentStatus })
        .eq('id', notifId);
      if (!error) {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, lida: !currentStatus } : n));
        setUnreadCount(prev => currentStatus ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Erro ao alterar status de leitura:', e);
    }
  };

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
      case NavItem.FIXED_COSTS:
        return <FixedCosts />;

      case NavItem.CLIENTS:
        return <ClientManagement
          initialSelectedClientId={navTarget?.tab === NavItem.CLIENTS ? navTarget.clientId : undefined}
          onProfileShown={() => setNavTarget(null)}
        />;
      case NavItem.BANKS:
        return <BankManagement />;

      case NavItem.BACKUP:
        return <BackupRestore />;
      case NavItem.PATRIMONIO:
        return <PatrimonioDashboard />;
      case NavItem.DELETION_LOGS:
        return <DeletionLogsView />;
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
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50 dark:bg-brand-bg select-none sm:select-text relative">
      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 dark:bg-brand-surface/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 max-w-md w-[90%] animate-fade-in-down border-l-4 border-l-primary">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined">notifications_active</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{toast.title}</h4>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Notification Drawer (Gaveta) */}
      {isNotifDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsNotifDrawerOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-brand-surface h-full shadow-2xl flex flex-col justify-between border-l border-slate-100 dark:border-slate-850 animate-slide-in-right">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Central de Notificações</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{unreadCount} não lidas</p>
              </div>
              <button onClick={() => setIsNotifDrawerOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleToggleRead(n.id, n.lida)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      n.lida
                        ? 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800 opacity-60'
                        : 'bg-primary/5 dark:bg-primary/5 border-primary/20 shadow-sm'
                    }`}
                  >
                    {!n.lida && <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />}
                    <div className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-lg mt-0.5 ${
                        n.tipo === 'caixa' ? 'text-blue-500' : n.tipo === 'aluguel' ? 'text-emerald-500' : n.tipo === 'devolucao' ? 'text-amber-500' : 'text-primary'
                      }`}>
                        {n.tipo === 'caixa' ? 'account_balance_wallet' : n.tipo === 'aluguel' ? 'key' : n.tipo === 'devolucao' ? 'assignment_return' : 'notifications'}
                      </span>
                      <div>
                        <h5 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{n.titulo}</h5>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1">{n.mensagem}</p>
                        <span className="text-[8px] text-slate-400 font-bold block mt-2">{new Date(n.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                  <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Nenhuma notificação por enquanto</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all disabled:opacity-50"
              >
                Ler Todas
              </button>
              <button
                onClick={handleClearNotifications}
                disabled={notifications.length === 0}
                className="flex-1 py-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black transition-all disabled:opacity-50"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNotifDrawerOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 relative"
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-slate-900 text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-brand-surface">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </header>

        {/* Desktop Notification Icon - Float Right */}
        <div className="hidden md:flex absolute top-6 right-10 z-30 items-center gap-4">
          <button
            onClick={() => setIsNotifDrawerOpen(true)}
            className="w-11 h-11 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 relative"
            title="Notificações"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-slate-900 text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-brand-surface">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

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
