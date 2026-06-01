import React, { useState } from 'react';
import { NavItem } from '../types';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  activeTab: NavItem;
  setActiveTab: (tab: NavItem) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  ipvaAlerts: number;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isDarkMode, toggleDarkMode, ipvaAlerts, isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };

  const menuItems = [
    { id: NavItem.DASHBOARD, label: 'Dashboard', icon: 'dashboard' },
    { id: NavItem.PATRIMONIO, label: 'Patrimônio', icon: 'domain' },
    { id: NavItem.CASH_FLOW, label: 'Fluxo de Caixa', icon: 'account_balance_wallet' },
    { id: NavItem.CHARGES, label: 'Escala de Cobrança', icon: 'schedule' },
    { id: NavItem.FIXED_COSTS, label: 'Custo Fixo Mês', icon: 'receipt_long' },
    { id: NavItem.ALERTS, label: 'Alertas', icon: 'notifications', badge: ipvaAlerts > 0 ? '!' : undefined },
    { id: NavItem.SHOPPING_CART, label: 'Carrinho', icon: 'shopping_cart' },
    { id: NavItem.LOC_MOTTUS, label: 'LOC MOTTUS', icon: 'two_wheeler' },
    { id: NavItem.IPVA, label: 'IPVA', icon: 'calendar_today', badge: ipvaAlerts > 0 ? ipvaAlerts : undefined },
    { id: NavItem.PROPERTIES, label: 'Imóveis', icon: 'apartment' },
    { id: NavItem.CLIENTS, label: 'Clientes', icon: 'group' },
    { id: NavItem.BANKS, label: 'Bancos', icon: 'account_balance' },
    { id: NavItem.BACKUP, label: 'Backup / Restaurar', icon: 'settings_backup_restore' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`fixed inset-y-0 left-0 z-50 md:relative md:flex flex-col bg-white dark:bg-brand-surface border-r border-slate-200 dark:border-slate-800 transition-all duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <div className={`flex flex-col items-center text-center transition-all ${isCollapsed ? 'p-3 py-6' : 'p-8'}`}>
          <div className={`rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-36 h-36'}`}>
            <img src="/logo.png" alt="Logo Grupo 3A" className="w-full h-full object-contain" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === item.id
                ? 'bg-primary/10 text-primary-dark dark:text-primary dark:bg-primary/5 border-l-4 border-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={`material-symbols-outlined text-lg ${activeTab === item.id ? 'fill' : ''}`}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span className="bg-danger text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-brand-surface">
                  {item.badge}
                </span>
              )}
              {isCollapsed && item.badge && (
                <div className="absolute top-1 right-2 w-2.5 h-2.5 bg-danger rounded-full ring-2 ring-white dark:ring-brand-surface" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-800 ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? (isDarkMode ? 'Modo Claro' : 'Modo Escuro') : undefined}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
              {!isCollapsed && (
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-primary' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isDarkMode ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            )}
          </button>

          {/* Toggle Collapse Button */}
          <button
            onClick={toggleCollapse}
            className={`hidden md:flex w-full items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-800 ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">
                {isCollapsed ? 'menu_open' : 'menu'}
              </span>
              {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider">Recolher Menu</span>}
            </div>
          </button>

          <div className={`flex items-center gap-4 group p-1 rounded-xl transition-all ${isCollapsed ? 'justify-center gap-0' : ''}`}>
            <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 font-black border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden shrink-0">
              <img src="https://picsum.photos/100/100?random=1" alt="Profile" className="w-full h-full object-cover" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Carlos André</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">admin@grupo3a.com</p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-300 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                title="Sair"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
