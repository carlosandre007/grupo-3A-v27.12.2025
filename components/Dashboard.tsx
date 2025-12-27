
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MONTHS } from '../constants';
import PageHeader from './PageHeader';

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
];

const StatCard: React.FC<{ title: string, value: string, color: string, icon: string, highlight?: boolean }> = ({ title, value, color, icon, highlight }) => (
  <div className={`bg-white dark:bg-brand-surface p-6 rounded-2xl shadow-sm border-l-4 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${highlight ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-brand-bg' : ''}`} style={{ borderLeftColor: color }}>
    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
      <span className="material-symbols-outlined text-9xl">{icon}</span>
    </div>
    <p className="text-xs text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-2">{title}</p>
    <div className="flex items-end justify-between">
      <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [alerts, setAlerts] = useState({ cnh: 0, fines: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentMonthName = MONTHS[selectedMonth];

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: transData } = await supabase.from('transactions').select('*');
    if (transData) setTransactions(transData);

    const { data: bankData } = await supabase.from('banks').select('*');
    if (bankData) setBanks(bankData || []);

    setLoading(false);
  };

  const totalBankBalance = useMemo(() => banks.reduce((acc, b) => acc + Number(b.balance), 0), [banks]);

  const dashboardData = useMemo(() => {
    // 1. Filter transactions by selected month/year
    const filtered = transactions.filter(t => {
      const dateStr = t.date.split('T')[0];
      const [y, m] = dateStr.split('-').map(Number);
      return y === selectedYear && (m - 1) === selectedMonth;
    });

    // 2. Calculate totals
    const receita = filtered.reduce((acc, t) => t.type === 'in' ? acc + Number(t.value) : acc, 0);
    const despesa = filtered.reduce((acc, t) => t.type === 'out' ? acc + Number(t.value) : acc, 0);

    // 3. Group by Category
    const groupByCategory = (type: 'in' | 'out') => {
      const groups: Record<string, number> = {};
      filtered.filter(t => t.type === type).forEach(t => {
        groups[t.category] = (groups[t.category] || 0) + Number(t.value);
      });
      const total = Object.values(groups).reduce((a, b) => a + b, 0);
      return Object.entries(groups).map(([name, value], i) => ({
        name,
        value: Number(((value / total) * 100).toFixed(1)),
        amount: value,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
      }));
    };

    const pieRevenue = groupByCategory('in');
    const pieExpense = groupByCategory('out');

    // 4. Performance Over Time (Area Chart)
    const performanceData = MONTHS.map((month, i) => {
      const monthTransactions = transactions.filter(t => {
        const dateStr = t.date.split('T')[0];
        const [y, m] = dateStr.split('-').map(Number);
        return y === selectedYear && (m - 1) === i;
      });
      return {
        name: month,
        receita: monthTransactions.reduce((acc, t) => t.type === 'in' ? acc + Number(t.value) : acc, 0),
        despesa: monthTransactions.reduce((acc, t) => t.type === 'out' ? acc + Number(t.value) : acc, 0),
      };
    });

    return { receita, despesa, pieRevenue, pieExpense, performanceData };
  }, [transactions, selectedMonth, selectedYear]);

  const fetchAlerts = async () => {
    const { data: clients } = await supabase.from('clients').select('cnh_expiry, status');
    let cnhCount = 0;
    if (clients) {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      cnhCount = clients.filter((c: any) => {
        if (!c.cnh_expiry) return false;
        const expiry = new Date(c.cnh_expiry);
        return expiry <= thirtyDaysFromNow;
      }).length;
    }

    let finesCount = 0;
    try {
      const { data: fines } = await supabase.from('fines').select('id').eq('status', 'pending');
      if (fines) finesCount = fines.length;
    } catch { }

    setAlerts({ cnh: cnhCount, fines: finesCount });
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const [
        { data: clients },
        { data: fleet },
        { data: fines },
        { data: trans }
      ] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('motorcycles').select('*'),
        supabase.from('fines').select('*'),
        supabase.from('transactions').select('*')
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        data: { clients, fleet, fines, transactions: trans }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_3a_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('Backup gerado com sucesso!');
    } catch {
      alert('Falha no backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchTransactions();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Dashboard Overview"
        description={<>Análise financeira de <span className="text-primary font-bold">{currentMonthName} / {selectedYear}</span>.</>}
      >
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleBackup}
            disabled={isBackingUp}
            className="px-5 py-2.5 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <span className={`material-symbols-outlined text-lg ${isBackingUp ? 'animate-spin' : ''}`}>
              {isBackingUp ? 'sync' : 'cloud_download'}
            </span>
            Backup
          </button>
        </div>
      </PageHeader>

      {/* Alerts */}
      {(alerts.cnh > 0 || alerts.fines > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {alerts.cnh > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-red-500">warning</span>
                <div>
                  <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">CNHs Vencendo</h4>
                  <p className="text-xs text-red-600 dark:text-red-300">Existem {alerts.cnh} alertas pendentes.</p>
                </div>
              </div>
            </div>
          )}
          {alerts.fines > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded-r-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-orange-500">local_police</span>
                <div>
                  <h4 className="font-bold text-orange-700 dark:text-orange-400 text-sm">Multas Pendentes</h4>
                  <p className="text-xs text-orange-600 dark:text-orange-300">{alerts.fines} multas aguardando resolução.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total em Caixa"
          value={totalBankBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          color="#8B5CF6"
          icon="account_balance"
          highlight={true}
        />
        <StatCard
          title="Receita no Período"
          value={dashboardData.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          color="#10B981"
          icon="payments"
        />
        <StatCard
          title="Despesa no Período"
          value={dashboardData.despesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          color="#EF4444"
        />
      </div>

      {/* Performance Chart */}
      <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8">Performance em {selectedYear}</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dashboardData.performanceData}>
              <defs>
                <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <Tooltip
                formatter={(val: any) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="receita" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" />
              <Area type="monotone" dataKey="despesa" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <h3 className="font-black text-slate-900 dark:text-white mb-6">Entradas por Categoria</h3>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData.pieRevenue}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dashboardData.pieRevenue.map((entry: any, index: number) => (
                    <Cell key={`cell-rev-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => `${val}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {dashboardData.pieRevenue.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate flex-1 text-slate-500 font-bold uppercase">{item.name}</span>
                <span className="text-slate-900 dark:text-white font-black">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <h3 className="font-black text-slate-900 dark:text-white mb-6">Saídas por Categoria</h3>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData.pieExpense}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dashboardData.pieExpense.map((entry: any, index: number) => (
                    <Cell key={`cell-exp-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => `${val}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {dashboardData.pieExpense.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate flex-1 text-slate-500 font-bold uppercase">{item.name}</span>
                <span className="text-slate-900 dark:text-white font-black">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
