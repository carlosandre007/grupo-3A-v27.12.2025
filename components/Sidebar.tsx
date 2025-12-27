import React from 'react';
import { NavItem } from '../types';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  activeTab: NavItem;
  setActiveTab: (tab: NavItem) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isDarkMode, toggleDarkMode }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { id: NavItem.DASHBOARD, label: 'Dashboard', icon: 'dashboard' },
    { id: NavItem.CASH_FLOW, label: 'Fluxo de Caixa', icon: 'account_balance_wallet' },
    { id: NavItem.LOC_MOTTUS, label: 'LOC MOTTUS', icon: 'two_wheeler' },
    { id: NavItem.IPVA, label: 'IPVA', icon: 'calendar_today', badge: 3 },
    { id: NavItem.CHARGES, label: 'Escala de Cobrança', icon: 'schedule' },
    { id: NavItem.PROPERTIES, label: 'Imóveis', icon: 'apartment' },
    { id: NavItem.CLIENTS, label: 'Clientes', icon: 'group' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-brand-surface border-r border-slate-200 dark:border-slate-800 transition-colors">
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-slate-900 font-black shadow-lg shadow-primary/20">
          G
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">GRUPO 3A</h1>
          <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 tracking-widest">Gestão Empresarial</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === item.id
                ? 'bg-primary/10 text-primary-dark dark:text-primary dark:bg-primary/5 border-l-4 border-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <span className={`material-symbols-outlined text-xl ${activeTab === item.id ? 'fill' : ''}`}>
              {item.icon}
            </span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="bg-danger text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-white dark:ring-brand-surface">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </div>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-primary' : 'bg-slate-300'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isDarkMode ? 'right-0.5' : 'left-0.5'}`} />
          </div>
        </button>

        <div className="flex items-center gap-4 group p-1 rounded-xl transition-all">
          <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 font-black border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden">
            <img src="https://picsum.photos/100/100?random=1" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Carlos André</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">admin@grupo3a.com</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-300 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
            title="Sair"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
