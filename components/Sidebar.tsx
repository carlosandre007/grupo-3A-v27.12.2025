import React, { useState } from 'react';
import { NavItem } from '../types';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Coins, 
  CalendarClock, 
  Receipt, 
  Landmark, 
  Building2, 
  Home, 
  Bike, 
  FileSpreadsheet, 
  Users, 
  Bell, 
  ShoppingCart, 
  Database, 
  Trash2, 
  Moon, 
  Sun, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavItem;
  setActiveTab: (tab: NavItem) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  ipvaAlerts: number;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isDarkMode, 
  toggleDarkMode, 
  ipvaAlerts, 
  isOpen, 
  onClose 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'Geral': true,
    'Financeiro': true,
    'Patrimônio': true,
    'Clientes': true,
    'Sistema': true
  });

  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };

  // Grouped Navigation Items matching standard SaaS interfaces
  const navigationGroups = [
    {
      title: 'Financeiro',
      items: [
        { id: NavItem.CASH_FLOW, label: 'Fluxo de Caixa', icon: Coins },
        { id: NavItem.CHARGES, label: 'Escala de Cobrança', icon: CalendarClock },
        { id: NavItem.FIXED_COSTS, label: 'Custo Fixo Mês', icon: Receipt },
        { id: NavItem.BANKS, label: 'Bancos / Contas', icon: Landmark }
      ]
    },
    {
      title: 'Patrimônio',
      items: [
        { id: NavItem.PATRIMONIO, label: 'Patrimônio', icon: Building2 },
        { id: NavItem.PROPERTIES, label: 'Imóveis', icon: Home },
        { id: NavItem.LOC_MOTTUS, label: 'LOC MOTTUS', icon: Bike },
        { id: NavItem.IPVA, label: 'IPVA / Veículos', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'Clientes',
      items: [
        { id: NavItem.CLIENTS, label: 'Clientes', icon: Users }
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: NavItem.ALERTS, label: 'Alertas', icon: Bell, badge: ipvaAlerts > 0 ? '!' : undefined },
        { id: NavItem.SHOPPING_CART, label: 'Carrinho', icon: ShoppingCart },
        { id: NavItem.BACKUP, label: 'Backup / Restaurar', icon: Database },
        { id: NavItem.DELETION_LOGS, label: 'Log de Exclusões', icon: Trash2 }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside 
        className={`fixed inset-y-0 left-0 z-50 md:relative md:flex flex-col sidebar-glass transition-all duration-300 transform shadow-premium ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-72'}`}
      >
        
        {/* Top Header / Branding area */}
        <div className={`relative flex flex-col items-center text-center border-b border-slate-200/50 dark:border-slate-800/40 transition-all ${
          isCollapsed ? 'p-3 py-6 justify-center' : 'p-8 pb-6'
        }`}>
          <div className={`rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-300 ${
            isCollapsed ? 'w-10 h-10' : 'w-36 h-36'
          }`}>
            <img src="/logo.png" alt="Logo Grupo 3A" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col text-center mt-3">
              <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Grupo 3A</span>
              <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none mt-1">BI & Fleet</span>
            </div>
          )}

          {/* Discrete Top Toggle Collapse Chevron */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-[-14px] z-50 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shadow-md active:scale-90 transition-all hover:scale-105"
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? <ChevronRight size={14} className="stroke-[3]" /> : <ChevronLeft size={14} className="stroke-[3]" />}
          </button>
        </div>

        {/* Navigation Groups container */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
          {/* Standalone Dashboard Item at the Top */}
          <div className="space-y-1.5 mb-6">
            <button
              onClick={() => {
                setActiveTab(NavItem.DASHBOARD);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group saas-hover-item ${
                activeTab === NavItem.DASHBOARD
                  ? 'bg-slate-900/5 dark:bg-white/5 text-primary-dark dark:text-primary saas-active-border shadow-sm border-l-[3px] border-primary font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/20 hover:text-slate-900 dark:hover:text-white font-bold'
              } ${isCollapsed ? 'justify-center px-0' : 'pl-4'}`}
            >
              <div className="flex items-center justify-center shrink-0">
                <LayoutDashboard 
                  size={18} 
                  className={`transition-all ${activeTab === NavItem.DASHBOARD ? 'stroke-[2.5] text-primary' : 'stroke-[2]'}`} 
                />
              </div>
              {!isCollapsed && <span className="flex-1 text-left text-xs tracking-tight">Dashboard</span>}
              {isCollapsed && <span className="saas-tooltip">Dashboard</span>}
            </button>
          </div>

          {navigationGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              
              {/* Group Title or thin divider */}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full flex items-center justify-between text-[10px] uppercase tracking-[0.15em] pl-3 pr-2.5 py-1.5 mb-1.5 rounded-lg transition-all text-left outline-none font-black ${
                    collapsedGroups[group.title]
                      ? 'bg-slate-900/5 dark:bg-white/5 text-slate-800 dark:text-white border-l-2 border-slate-400 dark:border-slate-500 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-950/[0.03] dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <span>{group.title}</span>
                  {collapsedGroups[group.title] ? (
                    <ChevronRight size={11} className="stroke-[3] text-primary" />
                  ) : (
                    <ChevronDown size={11} className="stroke-[3]" />
                  )}
                </button>
              ) : (
                <div className="h-[1px] bg-slate-200/50 dark:bg-slate-800/40 my-3 mx-2" />
              )}

              {/* Group Items (Only render if not collapsed, or if sidebar itself is collapsed) */}
              {(!collapsedGroups[group.title] || isCollapsed) && (
                <div className="space-y-1.5 transition-all duration-300">
                  {group.items.map((item) => {
                    const IconComponent = item.icon;
                    const isItemActive = activeTab === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (onClose) onClose();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group saas-hover-item ${
                          isItemActive
                            ? 'bg-slate-900/5 dark:bg-white/5 text-primary-dark dark:text-primary saas-active-border shadow-sm border-l-[3px] border-primary font-black'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/20 hover:text-slate-900 dark:hover:text-white font-bold'
                        } ${isCollapsed ? 'justify-center px-0' : 'pl-4'}`}
                      >
                        
                        {/* Icon wrapper */}
                        <div className="flex items-center justify-center shrink-0">
                          <IconComponent 
                            size={18} 
                            className={`transition-all ${isItemActive ? 'stroke-[2.5] text-primary' : 'stroke-[2]'}`} 
                          />
                        </div>

                        {/* Label and Badge */}
                        {!isCollapsed && <span className="flex-1 text-left text-xs tracking-tight">{item.label}</span>}
                        
                        {/* Badge alert */}
                        {item.badge && (
                          <span className={`flex items-center justify-center text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-brand-surface ${
                            isCollapsed ? 'absolute top-1.5 right-1.5 w-3 h-3 p-0' : ''
                          } bg-red-500 text-white`}>
                            {isCollapsed ? '' : item.badge}
                          </span>
                        )}

                        {/* Floating Tooltip in collapsed mode */}
                        {isCollapsed && (
                          <span className="saas-tooltip">
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer: User & Controls Section */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/40 space-y-4">
          
          {/* Dark Mode toggle */}
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-250/20 hover:bg-slate-200/40 dark:bg-slate-800/20 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400 transition-all ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? (isDarkMode ? 'Modo Claro' : 'Modo Escuro') : undefined}
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Sun size={18} className="stroke-[2]" /> : <Moon size={18} className="stroke-[2]" />}
              {!isCollapsed && (
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-primary' : 'bg-slate-350 dark:bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isDarkMode ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            )}
            
            {/* Tooltip */}
            {isCollapsed && (
              <span className="saas-tooltip">
                {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
              </span>
            )}
          </button>

          {/* User Profile Block */}
          <div className={`flex items-center gap-3 p-1.5 rounded-xl transition-all relative ${
            isCollapsed ? 'justify-center' : 'bg-slate-900/5 dark:bg-white/5 border border-slate-200/30 dark:border-slate-850'
          }`}>
            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden shrink-0">
              <img src="https://picsum.photos/100/100?random=1" alt="Profile" className="w-full h-full object-cover" />
            </div>
            
            {!isCollapsed && (
              <div className="overflow-hidden flex-1 text-left min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-white truncate">Carlos André</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate font-mono mt-0.5 leading-none">admin@grupo3a.com</p>
              </div>
            )}
            
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                title="Sair"
              >
                <LogOut size={16} className="stroke-[2.5]" />
              </button>
            )}

            {/* Tooltip */}
            {isCollapsed && (
              <span className="saas-tooltip">
                Perfil: Carlos André
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
