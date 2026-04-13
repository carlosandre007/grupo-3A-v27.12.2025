
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Line, ComposedChart, Legend } from 'recharts';
import { MONTHS } from '../constants';
import { NavItem, Bank, Transaction, Charge, Category, MonthlyBankMovement } from '../types';
import PageHeader from './PageHeader';

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
];

const StatCard: React.FC<{ 
  title: string, 
  value: string, 
  color: string, 
  icon: string, 
  variation?: number,
  highlight?: boolean 
}> = ({ title, value, color, icon, variation, highlight }) => (
  <div className={`bg-white dark:bg-brand-surface p-4 md:p-6 rounded-2xl shadow-sm border-l-4 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${highlight ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-brand-bg' : ''}`} style={{ borderLeftColor: color }}>
    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
      <span className="material-symbols-outlined text-7xl md:text-9xl">{icon}</span>
    </div>
    <div className="flex items-center gap-2 mb-2">
      <span className="material-symbols-outlined text-base md:text-lg" style={{ color }}>{icon}</span>
      <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest truncate">{title}</p>
    </div>
    <div className="flex flex-col">
      <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">{value}</h3>
      {variation !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-[9px] md:text-[10px] font-bold ${variation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          <span className="material-symbols-outlined text-xs md:text-sm">{variation >= 0 ? 'trending_up' : 'trending_down'}</span>
          {variation >= 0 ? '+' : ''}{variation}% <span className="hidden xs:inline">vs mês anterior</span>
        </div>
      )}
    </div>
  </div>
);

const Dashboard: React.FC<{ onNavigate: (target: { tab: NavItem, clientId?: string }) => void }> = ({ onNavigate }) => {
  const [alerts, setAlerts] = useState({ 
    cnh: 0, 
    fines: 0, 
    overdueCharges: 0, 
    expiringCNHs: [] as any[],
    rentIncreases: [] as any[]
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyMovements, setMonthlyMovements] = useState<MonthlyBankMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const currentMonthName = MONTHS[selectedMonth];

  const fetchDashboardData = async () => {
    setLoading(true);
    const [
      { data: transData },
      { data: bankData },
      { data: chargesData },
      { data: catsData },
      { data: movementsData }
    ] = await Promise.all([
      supabase.from('transactions').select('*'),
      supabase.from('banks').select('*'),
      supabase.from('charges').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('movimentacao_mensal_bancos').select('*')
    ]);

    if (transData) setTransactions(transData);
    if (bankData) setBanks(bankData || []);
    if (chargesData) setCharges(chargesData || []);
    if (catsData) setCategories(catsData || []);
    if (movementsData) setMonthlyMovements(movementsData || []);

    setLoading(false);
  };

  const totalBankBalance = useMemo(() => banks.reduce((acc, b) => acc + Number(b.balance), 0), [banks]);

  const financialData = useMemo(() => {
    const today = new Date();
    const currentYear = selectedYear;
    const currentMonth = selectedMonth;

    const getMonthStats = (month: number, year: number) => {
      const filtered = transactions.filter(t => {
        const [y, m] = t.date.split('-').map(Number);
        const matchDate = y === year && (m - 1) === month;
        const matchBank = selectedBank === 'all' || t.id_conta === selectedBank;
        const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
        return matchDate && matchBank && matchCat;
      });

      const income = filtered.reduce((acc, t) => t.type === 'in' ? acc + Number(t.value) : acc, 0);
      const expense = filtered.reduce((acc, t) => t.type === 'out' ? acc + Number(t.value) : acc, 0);

      // Add manual monthly movements for this month/year
      const monthMovements = monthlyMovements.filter(m => m.mes === month && m.ano === year);
      const manualIn = monthMovements.reduce((acc, m) => acc + Number(m.entrada_mes), 0);
      const manualOut = monthMovements.reduce((acc, m) => acc + Number(m.saida_mes), 0);

      return { income: income + manualIn, expense: expense + manualOut, profit: (income + manualIn) - (expense + manualOut) };
    };

    // Current Month Stats
    const current = getMonthStats(currentMonth, currentYear);
    
    // Previous Month Stats for MoM calculation
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const previous = getMonthStats(prevMonth, prevYear);

    const calcVariation = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    // Contas a Receber (Pending charges)
    const contasAReceber = charges
      .filter(c => c.status === 'pending')
      .reduce((acc, c) => acc + (c.valor_cobranca || 0), 0);

    // Contas a Pagar (Future transactions 'out')
    const contasAPagar = transactions
      .filter(t => t.type === 'out' && new Date(t.date) > today)
      .reduce((acc, t) => acc + Number(t.value), 0);

    // Inadimplência
    const overdueCharges = charges.filter(c => c.status === 'pending' && new Date(c.due_date) < today);
    const totalPrevisto = charges.reduce((acc, c) => acc + (c.valor_cobranca || 0), 0);
    const inadimplenciaRate = totalPrevisto > 0 ? (overdueCharges.reduce((acc, c) => acc + (c.valor_cobranca || 0), 0) / totalPrevisto) * 100 : 0;

    // Total em Caixa (Consolidated)
    // Agora reflete exatamente o saldo manual inserido no BankManagement (excluindo investimentos).
    const consolidatedBalance = banks.filter(b => b.tipo_conta !== 'Investimento').reduce((total, bank) => total + Number(bank.balance || 0), 0);

    const totalInvestido = banks.filter(b => b.tipo_conta === 'Investimento').reduce((total, bank) => total + Number(bank.balance || 0), 0);

    // Chart Data: Performance Over Time
    const performanceData = MONTHS.map((month, i) => {
      const stats = getMonthStats(i, currentYear);
      return {
        name: month,
        receita: stats.income,
        despesa: stats.expense,
        lucro: stats.profit
      };
    });

    // Category Ranking
    const getCategoryStats = (type: 'in' | 'out') => {
      const stats: Record<string, { value: number, count: number }> = {};
      transactions
        .filter(t => {
          const [y, m] = t.date.split('-').map(Number);
          return y === currentYear && (m-1) === currentMonth && t.type === type;
        })
        .forEach(t => {
          if (!stats[t.category]) stats[t.category] = { value: 0, count: 0 };
          stats[t.category].value += Number(t.value);
          stats[t.category].count += 1;
        });

      const total = Object.values(stats).reduce((a, b) => a + b.value, 0);
      return Object.entries(stats)
        .map(([name, data]) => ({
          name,
          amount: data.value,
          count: data.count,
          percent: total > 0 ? Number(((data.value / total) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.amount - a.amount);
    };

    const topRevenueCats = getCategoryStats('in').slice(0, 5);
    const pieRevenue = getCategoryStats('in').map((c, i) => ({ ...c, value: c.percent, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
    const pieExpense = getCategoryStats('out').map((c, i) => ({ ...c, value: c.percent, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

    // Top 5 Revenues Data for Chart
    const topRevenuesData = topRevenueCats.map(c => ({ name: c.name, value: c.amount }));

    return { 
      current, 
      previous, 
      variations: {
        income: calcVariation(current.income, previous.income),
        expense: calcVariation(current.expense, previous.expense),
        profit: calcVariation(current.profit, previous.profit)
      },
      contasAReceber,
      contasAPagar,
      inadimplenciaRate,
      consolidatedBalance,
      totalInvestido,
      performanceData,
      pieRevenue,
      pieExpense,
      topRevenueCats,
      topRevenuesData
    };
  }, [transactions, banks, charges, monthlyMovements, selectedMonth, selectedYear, selectedBank, selectedCategory]);

  const fetchAlerts = async () => {
    // 1. Check CNH Expiry logic (Updated)
    const { data: expiringClients } = await supabase
      .from('clients')
      .select('id, name, cnh_validade, cnh_expiry')
      .lte('cnh_validade', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('cnh_validade', { ascending: true });

    let cnhCount = 0;
    let expiringCNHsList = [] as any[];

    if (expiringClients) {
      const today = new Date();
      expiringCNHsList = expiringClients.map(c => {
        const dateVal = c.cnh_validade || c.cnh_expiry;
        if (!dateVal) return null;
        const expiry = new Date(dateVal);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...c, cnh_validade: dateVal, diffDays };
      }).filter(item => item !== null);
      cnhCount = expiringCNHsList.length;
    }

    // 2. Check Fines (Multas) - RESTORED
    const { count: finesCount } = await supabase
      .from('ipva_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue');

    // 3. Check Overdue Charges (> 3 days) - RESTORED
    const { data: charges } = await supabase
      .from('charges')
      .select('*')
      .eq('status', 'pending');

    let overdueChargesCount = 0;
    if (charges) {
      const today = new Date();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(today.getDate() - 3);

      overdueChargesCount = charges.filter((c: any) => {
        const dueDate = new Date(c.due_date);
        return dueDate < threeDaysAgo;
      }).length;
    }

    // 4. Check Rent Increases (Reajuste de Aluguel)
    const { data: rentIncreases } = await supabase
      .from('properties')
      .select('id, code, description, next_increase_date')
      .not('next_increase_date', 'is', null)
      .lte('next_increase_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('next_increase_date', { ascending: true });

    setAlerts({
      cnh: cnhCount,
      fines: finesCount || 0,
      overdueCharges: overdueChargesCount,
      expiringCNHs: expiringCNHsList,
      rentIncreases: rentIncreases || []
    });
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
    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Painel Grupo 3A"
        description={<>Gestão consolidada de empresas • <span className="text-primary font-bold">{currentMonthName} / {selectedYear}</span></>}
      >
        <div className="flex flex-wrap gap-2 justify-end">
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
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
          >
            <option value="all">Todas as Contas</option>
            {banks.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CNH Alerts */}
        <div className="bg-white dark:bg-brand-surface border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-warning font-black">warning</span>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Alertas de CNH</h4>
            </div>
            {alerts.cnh > 0 && (
              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                {alerts.cnh}
              </span>
            )}
          </div>
          {alerts.cnh > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {alerts.expiringCNHs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate">{c.name}</span>
                  <span className={`text-[9px] font-black uppercase ${c.diffDays < 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                    {c.diffDays < 0 ? 'Vencida' : `${c.diffDays} dias`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 font-bold text-center py-4">Tudo em dia</p>
          )}
        </div>

        {/* Rent Increase Alerts */}
        <div className="bg-white dark:bg-brand-surface border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary font-black">calendar_today</span>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Reajuste de Aluguel</h4>
            </div>
            {alerts.rentIncreases.length > 0 && (
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-black">
                {alerts.rentIncreases.length}
              </span>
            )}
          </div>
          {alerts.rentIncreases.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {alerts.rentIncreases.map(p => (
                <button
                  key={p.id}
                  onClick={() => onNavigate({ tab: NavItem.PROPERTIES })}
                   className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 w-full hover:bg-slate-100 transition-all"
                >
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase">{p.code}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">{p.description}</p>
                  </div>
                  <span className="text-[9px] font-black text-rose-500 uppercase">
                    {new Date(p.next_increase_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 font-bold text-center py-4">Nenhum reajuste próximo</p>
          )}
        </div>

        {(alerts.fines > 0 || alerts.overdueCharges > 0) && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.fines > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded-r-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-orange-500">local_police</span>
                  <div>
                    <h4 className="font-bold text-orange-700 dark:text-orange-400 text-sm">Multas Pendentes</h4>
                    <p className="text-xs text-orange-600 dark:text-orange-300">{alerts.fines} multas</p>
                  </div>
                </div>
              </div>
            )}
            {alerts.overdueCharges > 0 && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-rose-500">price_check</span>
                  <div>
                    <h4 className="font-bold text-rose-700 dark:text-rose-400 text-sm">Cobranças Atrasadas</h4>
                    <p className="text-xs text-rose-600 dark:text-rose-300">{alerts.overdueCharges} pendentes</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Total em Caixa"
          value={financialData.consolidatedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          color="#8B5CF6"
          icon="account_balance"
          highlight={true}
        />
        <StatCard
          title="Total Investido"
          value={financialData.totalInvestido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          color="#10B981"
          icon="savings"
        />
        <StatCard
          title="Receita"
          value={financialData.current.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          color="#10B981"
          icon="payments"
          variation={financialData.variations.income}
        />
        <StatCard
          title="Despesa"
          value={financialData.current.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          color="#EF4444"
          icon="shopping_cart_checkout"
          variation={financialData.variations.expense}
        />
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Financial Flow Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Fluxo Financeiro Mensal</h3>
            <div className="flex gap-4 text-[10px] uppercase font-black">
              <span className="flex items-center gap-1 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Receitas</span>
              <span className="flex items-center gap-1 text-rose-500"><div className="w-2 h-2 rounded-full bg-rose-500"/> Despesas</span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={financialData.performanceData}>
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
                <Line type="monotone" dataKey="despesa" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Bar dataKey="lucro" fill="#3B82F6" opacity={0.3} radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goal Indicator Card */}
        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Meta do Mês</h3>
            <p className="text-xs text-slate-400 font-bold uppercase mb-8">Objetivo Financeiro de {currentMonthName}</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center text-center">
             <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={553} strokeDashoffset={553 - (553 * Math.min(financialData.current.income / 30000, 1))} className="text-primary transition-all duration-1000" strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{Math.round((financialData.current.income / 30000) * 100)}%</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase">atingido</span>
                </div>
             </div>
             <div className="mt-8 space-y-1">
                <p className="text-[10px] text-slate-400 font-black uppercase">Realizado: <span className="text-slate-900 dark:text-white">{financialData.current.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                <p className="text-[10px] text-slate-400 font-black uppercase">Meta: <span className="text-primary font-black">R$ 30.000,00</span></p>
             </div>
          </div>
        </div>
      </div>

      {/* Insights and Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Alerts */}
        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary fill-1">bolt</span>
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Alertas Financeiros Inteligentes</h3>
          </div>
          <div className="space-y-4">
            {financialData.variations.income < -10 && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600">
                  <span className="material-symbols-outlined">trending_down</span>
                </div>
                <div>
                  <p className="text-xs font-black text-rose-900 dark:text-rose-100">Receita caiu {Math.abs(financialData.variations.income)}% em relação ao mês anterior.</p>
                  <p className="text-[10px] text-rose-600 font-bold uppercase">Atenção ao fluxo de entrada</p>
                </div>
              </div>
            )}
            {financialData.variations.expense > 20 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div>
                  <p className="text-xs font-black text-amber-900 dark:text-amber-100">Despesas subiram {financialData.variations.expense}% este mês.</p>
                  <p className="text-[10px] text-amber-600 font-bold uppercase">Considere revisar categorias de gastos</p>
                </div>
              </div>
            )}
            {financialData.inadimplenciaRate > 5 && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600">
                  <span className="material-symbols-outlined">assignment_late</span>
                </div>
                <div>
                  <p className="text-xs font-black text-rose-900 dark:text-rose-100">Taxa de inadimplência em {financialData.inadimplenciaRate.toFixed(1)}%.</p>
                  <p className="text-[10px] text-rose-600 font-bold uppercase">Ação necessária na escala de cobrança</p>
                </div>
              </div>
            )}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-4 opacity-50">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-full italic">Nenhum outro alerta crítico detectado</span>
            </div>
          </div>
        </div>

        {/* System Suggestions */}
        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-emerald-500 fill-1">lightbulb</span>
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Sugestões do Sistema</h3>
          </div>
          <div className="space-y-4">
            {financialData.topRevenueCats[0] && (
              <div className="flex gap-4 items-start">
                <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  A categoria <span className="text-slate-900 dark:text-white font-black">{financialData.topRevenueCats[0].name}</span> representa <span className="text-emerald-500 font-black">{financialData.topRevenueCats[0].percent}%</span> do seu faturamento atual.
                </p>
              </div>
            )}
             <div className="flex gap-4 items-start">
                <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Seu lucro líquido atual é de <span className="text-primary font-black">{financialData.current.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>. Mantenha as despesas abaixo de <span className="text-slate-900 dark:text-white font-black">R$ 10.000</span> para otimizar margem.
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Você possui <span className="text-amber-500 font-black">{financialData.contasAReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> em cobranças pendentes. Reduzir esse valor em 20% aumentaria seu caixa significativamente.
                </p>
              </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Receitas */}
        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Top 5 Receitas do Mês</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData.topRevenuesData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} width={80} />
                <Tooltip 
                  formatter={(val: any) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  contentStyle={{ borderRadius: '16px', border: 'none' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Indicador Financeiro Comparativo */}
        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Saúde Financeira (Comparativo)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ 
                name: 'Consolidado', 
                Receita: financialData.current.income, 
                Despesa: financialData.current.expense,
                Lucro: financialData.current.profit 
              }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip formatter={(val: any) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                <Bar dataKey="Receita" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesa" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lucro" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Categories Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Entradas por Categoria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={financialData.pieRevenue}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {financialData.pieRevenue.map((entry: any, index: number) => (
                      <Cell key={`cell-rev-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => `${val}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {financialData.pieRevenue.slice(0, 6).map((item: any) => (
                <div key={item.name} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-2 text-slate-500 font-bold uppercase">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-slate-900 dark:text-white font-black">{item.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Saídas por Categoria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={financialData.pieExpense}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {financialData.pieExpense.map((entry: any, index: number) => (
                      <Cell key={`cell-exp-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => `${val}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {financialData.pieExpense.slice(0, 6).map((item: any) => (
                <div key={item.name} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-2 text-slate-500 font-bold uppercase">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-slate-900 dark:text-white font-black">{item.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
