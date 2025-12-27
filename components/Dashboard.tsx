
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MONTHS } from '../constants';
import PageHeader from './PageHeader';

const currentMonthIndex = new Date().getMonth();
const currentMonthName = MONTHS[currentMonthIndex];

// Initial data generation functions
const generateChartData = () => MONTHS.map((month, i) => ({
  name: month,
  receita: 4000 + Math.random() * 6000,
  despesa: 3000 + Math.random() * 4000,
  isCurrent: i === new Date().getMonth()
}));

const generatePieData = () => [
  { name: 'ANDRE S', value: 11, color: '#3B82F6' },
  { name: 'LOC MOTTUS', value: 16, color: '#F59E0B' },
  { name: 'GERAL', value: 14, color: '#10B981' },
  { name: 'RASTREAR', value: 7, color: '#EF4444' },
  { name: '3A P. STORE', value: 20, color: '#8B5CF6' },
  { name: 'OUTROS', value: 32, color: '#06B6D4' },
];

const StatCard: React.FC<{ title: string, value: string, change?: string, color: string, icon: string, highlight?: boolean }> = ({ title, value, change, color, icon, highlight }) => (
  <div className={`bg-white dark:bg-brand-surface p-6 rounded-2xl shadow-sm border-l-4 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${highlight ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-brand-bg' : ''}`} style={{ borderLeftColor: color }}>
    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
      <span className="material-symbols-outlined text-9xl">{icon}</span>
    </div>
    <p className="text-xs text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-2">{title}</p>
    <div className="flex items-end justify-between">
      <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
      {change && (
        <span className={`text-[10px] font-black flex items-center px-2 py-1 rounded-lg ${change.includes('+') ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
          <span className="material-symbols-outlined text-sm mr-1">{change.includes('+') ? 'arrow_upward' : 'arrow_downward'}</span>
          {change}
        </span>
      )}
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [alerts, setAlerts] = useState({ cnh: 0, fines: 0 });
  const [chartData, setChartData] = useState(generateChartData());
  const [pieData, setPieData] = useState(generatePieData());
  const [isBackingUp, setIsBackingUp] = useState(false);

  const currentMonthIndex = new Date().getMonth();
  const currentMonthRevenue = chartData[currentMonthIndex].receita;
  const currentMonthExpense = chartData[currentMonthIndex].despesa;

  const fetchAlerts = async () => {
    // CNH Alerts
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

    // Fines Alerts
    let finesCount = 0;
    try {
      const { data: fines, error } = await supabase
        .from('fines')
        .select('id')
        .eq('status', 'pending');

      if (!error && fines) {
        finesCount = fines.length;
      }
    } catch (e) {
      console.log('Fines table might not exist yet');
    }

    setAlerts({ cnh: cnhCount, fines: finesCount });
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      // Fetch all major tables
      const [
        { data: clients },
        { data: fleet },
        { data: fines },
        { data: cashFlow }
      ] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('motorcycles').select('*'),
        supabase.from('fines').select('*'),
        supabase.from('cash_flow').select('*')
      ]);

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          clients: clients || [],
          fleet: fleet || [],
          fines: fines || [],
          cashFlow: cashFlow || []
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sistema_3a_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Backup de recuperação gerado com sucesso! Guarde este arquivo em um local seguro.');
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Falha ao gerar backup. Verifique a conexão com o banco de dados.');
    } finally {
      setIsBackingUp(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Dashboard Overview"
        description={<>Análise financeira do mês de <span className="text-primary font-bold">{currentMonthName}</span>.</>}
      >
        <button
          onClick={handleBackup}
          disabled={isBackingUp}
          className={`px-5 py-2.5 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center gap-2 ${isBackingUp ? 'opacity-50' : ''}`}
        >
          <span className={`material-symbols-outlined text-xl ${isBackingUp ? 'animate-spin' : ''}`}>
            {isBackingUp ? 'sync' : 'cloud_download'}
          </span>
          {isBackingUp ? 'Gerando Backup...' : 'Backup de Recuperação'}
        </button>
        <button className="px-5 py-2.5 bg-primary text-slate-900 rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          Novo Lançamento
        </button>
      </PageHeader>


      {/* Alerts Section */}
      {(alerts.cnh > 0 || alerts.fines > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {alerts.cnh > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
                <div>
                  <h4 className="font-bold text-red-700 dark:text-red-400">Atenção: CNHs Vencendo</h4>
                  <p className="text-sm text-red-600 dark:text-red-300">Existem {alerts.cnh} clientes com CNH vencida ou a vencer em 30 dias.</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-white dark:bg-brand-surface text-red-600 dark:text-red-400 text-xs font-black uppercase rounded-lg shadow-sm hover:shadow-md transition-all">
                Verificar
              </button>
            </div>
          )}
          {alerts.fines > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded-r-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-orange-500 text-3xl">local_police</span>
                <div>
                  <h4 className="font-bold text-orange-700 dark:text-orange-400">Multas Pendentes</h4>
                  <p className="text-sm text-orange-600 dark:text-orange-300">Existem {alerts.fines} multas pendentes de pagamento.</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-white dark:bg-brand-surface text-orange-600 dark:text-orange-400 text-xs font-black uppercase rounded-lg shadow-sm hover:shadow-md transition-all">
                Resolver
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title={`Receita (${currentMonthName})`}
          value={`R$ ${(currentMonthRevenue / 1000).toFixed(1)}k`}
          change="+8%"
          color="#10B981"
          icon="payments"
          highlight={true}
        />
        <StatCard
          title={`Despesa (${currentMonthName})`}
          value={`R$ ${(currentMonthExpense / 1000).toFixed(1)}k`}
          change="+2%"
          color="#EF4444"
          icon="shopping_cart"
        />
        <StatCard
          title="Saldo Líquido"
          value={`R$ ${((currentMonthRevenue - currentMonthExpense) / 1000).toFixed(1)}k`}
          change="+15%"
          color="#3B82F6"
          icon="account_balance_wallet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Performance Anual</h3>
              <p className="text-xs text-slate-400 mt-1">Destaque para o mês vigente.</p>
            </div>
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-2 text-success">
                <span className="w-2.5 h-2.5 rounded-full bg-success"></span> Receita
              </div>
              <div className="flex items-center gap-2 text-danger">
                <span className="w-2.5 h-2.5 rounded-full bg-danger"></span> Despesa
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                />
                <Area type="monotone" dataKey="receita" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" />
                <Area type="monotone" dataKey="despesa" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 flex flex-col">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">Entradas por Categoria</h3>
          <p className="text-xs text-slate-400 mb-6">Fontes de receita em {currentMonthName}.</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">100%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 w-full mt-6">
              {pieData.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight truncate">{item.name} {item.value}%</span>
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
