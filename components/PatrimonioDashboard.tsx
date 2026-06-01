import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface AssetListItem {
  id: string;
  code: string;
  name: string;
  category: 'Veículo' | 'Kitnet' | 'Loja';
  valorPatrimonial: number;
  valorAtual: number;
  dataAquisicao: string;
  receitaAcumulada: number;
  despesaAcumulada: number;
  lucroLiquido: number;
  payback: number;
  status: 'Ainda não se pagou' | 'Investimento Recuperado' | 'Gerando Lucro';
  receitaAcumuladaAnterior: number;
  despesaAcumuladaAnterior: number;
  observacoes: string;
}

const PatrimonioDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<keyof AssetListItem>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    code: '',
    name: '',
    category: 'Veículo' as 'Veículo' | 'Kitnet' | 'Loja',
    dataAquisicao: '',
    valorCompra: '', // maps to valor_patrimonial
    valorAtual: '',
    observacoes: '',
    receitaAcumuladaAnterior: '',
    despesaAcumuladaAnterior: '',
  });

  // Dashboard Totals
  const [totals, setTotals] = useState({
    totalVeiculos: 0,
    totalKitnets: 0,
    totalLojas: 0,
    patrimonialVeiculos: 0,
    patrimonialImoveis: 0,
    patrimonialGeral: 0,
    totalRecebido: 0,
    totalDespesas: 0,
    lucroTotal: 0,
    rentabilidadeGeral: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch motorcycles and properties
      const { data: motorcycles } = await supabase.from('motorcycles').select('*');
      const { data: properties } = await supabase.from('properties').select('*');

      // 2. Fetch all maintenance records (to calculate vehicle revenue/expenses)
      const { data: maintenance } = await supabase.from('motorcycle_maintenance').select('*');

      // 3. Fetch all property payments (property revenue)
      const { data: propertyPayments } = await supabase.from('property_payments').select('*');

      // 4. Fetch transactions (to calculate property expenses or additional values)
      const { data: transactions } = await supabase.from('transactions').select('*');

      const items: AssetListItem[] = [];

      // Process Motorcycles/Vehicles
      if (motorcycles) {
        motorcycles.forEach((m: any) => {
          const valPatrimonial = Number(m.valor_patrimonial) || 0;
          const valAtual = Number(m.valor_atual) || 0;
          const recAnterior = Number(m.receita_acumulada_anterior) || 0;
          const expAnterior = Number(m.despesa_acumulada_anterior) || 0;
          const obs = m.observacoes || '';
          
          // Calculate revenue & expenses from motorcycle_maintenance
          let rev = recAnterior; // Start with historical balance!
          let exp = expAnterior; // Start with historical expenses!
          
          if (maintenance) {
            const records = maintenance.filter((r: any) => r.motorcycle_id === m.id);
            records.forEach((r: any) => {
              if (r.type === 'credit') {
                rev += Number(r.value) || 0;
              } else {
                exp += Number(r.value) || 0;
              }
            });
          }

          const profit = rev - exp;
          const payback = valPatrimonial > 0 ? (profit / valPatrimonial) * 100 : 0;
          
          let status: AssetListItem['status'] = 'Ainda não se pagou';
          if (payback >= 100) status = 'Investimento Recuperado';
          if (payback > 100) status = 'Gerando Lucro';

          items.push({
            id: m.id,
            code: m.code,
            name: `${m.model} (${m.plate})`,
            category: 'Veículo',
            valorPatrimonial: valPatrimonial,
            valorAtual: valAtual,
            dataAquisicao: m.data_aquisicao || '',
            receitaAcumulada: rev,
            despesaAcumulada: exp,
            lucroLiquido: profit,
            payback: payback,
            status,
            receitaAcumuladaAnterior: recAnterior,
            despesaAcumuladaAnterior: expAnterior,
            observacoes: obs,
          });
        });
      }

      // Process Properties (Kitnets and Lojas)
      if (properties) {
        properties.forEach((p: any) => {
          const valPatrimonial = Number(p.valor_patrimonial) || 0;
          const valAtual = Number(p.valor_atual) || 0;
          const recAnterior = Number(p.receita_acumulada_anterior) || 0;
          const expAnterior = Number(p.despesa_acumulada_anterior) || 0;
          const obs = p.observacoes || '';
          const isLoja = p.tipo === 'loja';

          // Calculate revenue from property_payments
          let rev = recAnterior; // Start with historical balance!
          if (propertyPayments) {
            const pays = propertyPayments.filter((r: any) => r.property_id === p.id);
            pays.forEach((r: any) => {
              rev += Number(r.amount) || 0;
            });
          }

          // Calculate expenses from transactions
          let exp = expAnterior; // Start with historical expenses!
          if (transactions) {
            const exps = transactions.filter((r: any) => r.reference_id === p.id && r.type === 'out');
            exps.forEach((r: any) => {
              exp += Number(r.value) || 0;
            });
          }

          const profit = rev - exp;
          const payback = valPatrimonial > 0 ? (profit / valPatrimonial) * 100 : 0;

          let status: AssetListItem['status'] = 'Ainda não se pagou';
          if (payback >= 100) status = 'Investimento Recuperado';
          if (payback > 100) status = 'Gerando Lucro';

          items.push({
            id: p.id,
            code: p.code,
            name: p.description,
            category: isLoja ? 'Loja' : 'Kitnet',
            valorPatrimonial: valPatrimonial,
            valorAtual: valAtual,
            dataAquisicao: p.data_aquisicao || '',
            receitaAcumulada: rev,
            despesaAcumulada: exp,
            lucroLiquido: profit,
            payback: payback,
            status,
            receitaAcumuladaAnterior: recAnterior,
            despesaAcumuladaAnterior: expAnterior,
            observacoes: obs,
          });
        });
      }

      setAssets(items);

      // Calculate totals
      let totalVeh = 0;
      let totalKit = 0;
      let totalLoj = 0;
      let patVeh = 0;
      let patImov = 0;
      let recTotal = 0;
      let expTotal = 0;

      items.forEach((item) => {
        if (item.category === 'Veículo') {
          totalVeh++;
          patVeh += item.valorPatrimonial;
        } else if (item.category === 'Kitnet') {
          totalKit++;
          patImov += item.valorPatrimonial;
        } else if (item.category === 'Loja') {
          totalLoj++;
          patImov += item.valorPatrimonial;
        }
        recTotal += item.receitaAcumulada;
        expTotal += item.despesaAcumulada;
      });

      const patGeral = patVeh + patImov;
      const profitGeral = recTotal - expTotal;
      const rentGeral = patGeral > 0 ? (profitGeral / patGeral) * 100 : 0;

      setTotals({
        totalVeiculos: totalVeh,
        totalKitnets: totalKit,
        totalLojas: totalLoj,
        patrimonialVeiculos: patVeh,
        patrimonialImoveis: patImov,
        patrimonialGeral: patGeral,
        totalRecebido: recTotal,
        totalDespesas: expTotal,
        lucroTotal: profitGeral,
        rentabilidadeGeral: rentGeral,
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open Edit Modal
  const handleOpenEdit = (item: AssetListItem) => {
    // Extract plain vehicle model name if matching vehicle formatting
    let cleanName = item.name;
    if (item.category === 'Veículo') {
      const match = item.name.match(/^(.*?)\s*\(/);
      if (match) cleanName = match[1];
    }

    setEditFormData({
      id: item.id,
      code: item.code,
      name: cleanName,
      category: item.category,
      dataAquisicao: item.dataAquisicao,
      valorCompra: item.valorPatrimonial.toString(),
      valorAtual: item.valorAtual.toString(),
      observacoes: item.observacoes,
      receitaAcumuladaAnterior: item.receitaAcumuladaAnterior.toString(),
      despesaAcumuladaAnterior: item.despesaAcumuladaAnterior.toString(),
    });
    setIsEditModalOpen(true);
  };

  // Submit edits
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const valCompra = parseFloat(editFormData.valorCompra) || 0;
    const valAtual = parseFloat(editFormData.valorAtual) || 0;
    const recAnterior = parseFloat(editFormData.receitaAcumuladaAnterior) || 0;
    const expAnterior = parseFloat(editFormData.despesaAcumuladaAnterior) || 0;

    try {
      if (editFormData.category === 'Veículo') {
        const { error } = await supabase
          .from('motorcycles')
          .update({
            model: editFormData.name,
            valor_patrimonial: valCompra,
            valor_atual: valAtual,
            data_aquisicao: editFormData.dataAquisicao || null,
            observacoes: editFormData.observacoes,
            receita_acumulada_anterior: recAnterior,
            despesa_acumulada_anterior: expAnterior,
          })
          .eq('id', editFormData.id);

        if (error) throw error;
      } else {
        // Properties (Kitnet / Loja)
        const { error } = await supabase
          .from('properties')
          .update({
            description: editFormData.name,
            valor_patrimonial: valCompra,
            valor_atual: valAtual,
            data_aquisicao: editFormData.dataAquisicao || null,
            observacoes: editFormData.observacoes,
            receita_acumulada_anterior: recAnterior,
            despesa_acumulada_anterior: expAnterior,
          })
          .eq('id', editFormData.id);

        if (error) throw error;
      }

      alert('Dados patrimoniais salvos com sucesso!');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert('Erro ao salvar alterações patrimoniais: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter and Sort Assets
  const filteredAssets = assets
    .filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' ? true : a.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' ? true : a.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      } else {
        return sortOrder === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

  const handleSort = (field: keyof AssetListItem) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Código',
      'Nome',
      'Categoria',
      'Valor de Compra (R$)',
      'Valor Atual (R$)',
      'Receitas Totais (R$)',
      'Despesas Totais (R$)',
      'Lucro Líquido (R$)',
      'Payback (%)',
      'Status',
    ];

    const rows = filteredAssets.map((a) => [
      a.code,
      a.name,
      a.category,
      a.valorPatrimonial,
      a.valorAtual,
      a.receitaAcumulada,
      a.despesaAcumulada,
      a.lucroLiquido,
      a.payback.toFixed(2),
      a.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Patrimonio_Grupo3A_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Graph Data
  const categoryChartData = [
    { name: 'Veículos', value: totals.patrimonialVeiculos, color: '#F2C94C' },
    { name: 'Imóveis', value: totals.patrimonialImoveis, color: '#10B981' },
  ];

  const topProfitableData = [...assets]
    .sort((a, b) => b.lucroLiquido - a.lucroLiquido)
    .slice(0, 10)
    .map((a) => ({
      name: a.code,
      Lucro: a.lucroLiquido,
      Receita: a.receitaAcumulada,
    }));

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader
        title="🏢 Central de Patrimônio"
        description="Gestão integrada de bens patrimoniais, payback e análise financeira do Grupo 3A."
      >
        <button
          onClick={fetchData}
          className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-sm font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">sync</span> Atualizar Painel
        </button>
      </PageHeader>

      {loading ? (
        <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <span className="material-symbols-outlined animate-spin text-5xl text-primary">sync</span>
          <p className="font-bold text-sm uppercase tracking-wider">Carregando painel de patrimônio...</p>
        </div>
      ) : (
        <>
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl font-black">directions_car</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frota / Veículos</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totals.totalVeiculos}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">R$ {totals.patrimonialVeiculos.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl font-black">home</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Imóveis (Kitnets + Lojas)</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totals.totalKitnets + totals.totalLojas}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">R$ {totals.patrimonialImoveis.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 text-primary-dark dark:text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl font-black">account_balance</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Patrimonial Geral</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">R$ {totals.patrimonialGeral.toLocaleString()}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Valor Investido Consolidado</p>
              </div>
            </div>

            <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl font-black">trending_up</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rentabilidade Geral</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totals.rentabilidadeGeral.toFixed(2)}%</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Retorno Médio dos Investimentos</p>
              </div>
            </div>
          </div>

          {/* Cash Flow Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita Acumulada</p>
              <h3 className="text-2xl font-black text-success mt-2">R$ {totals.totalRecebido.toLocaleString()}</h3>
            </div>
            <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Despesa Acumulada</p>
              <h3 className="text-2xl font-black text-danger mt-2">R$ {totals.totalDespesas.toLocaleString()}</h3>
            </div>
            <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium bg-gradient-to-br from-primary/5 to-transparent">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro Líquido Geral</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">R$ {totals.lucroTotal.toLocaleString()}</h3>
            </div>
          </div>

          {/* Visual Graphs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Composição de Ativos por Valor</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Top 10 Bens Mais Lucrativos (Receitas vs Lucro)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProfitableData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} fontStyle="bold" />
                    <YAxis stroke="#94A3B8" fontSize={10} />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="Receita" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lucro" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Interactive Data Table */}
          <div className="bg-white dark:bg-brand-surface rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Lista Detalhada de Bens</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Gerenciamento, acompanhamento e exportação individual dos ativos.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial md:w-60">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar bem..."
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-xs focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-xs font-bold text-slate-500 outline-none"
                >
                  <option value="all">Todas Categorias</option>
                  <option value="Veículo">Veículos</option>
                  <option value="Kitnet">Kitnets</option>
                  <option value="Loja">Lojas Comerciais</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-xs font-bold text-slate-500 outline-none"
                >
                  <option value="all">Todos os Status</option>
                  <option value="Ainda não se pagou">Ainda não se pagou</option>
                  <option value="Investimento Recuperado">Investimento Recuperado</option>
                  <option value="Gerando Lucro">Gerando Lucro</option>
                </select>
                <button
                  onClick={exportToCSV}
                  className="p-2.5 bg-primary text-slate-900 rounded-2xl text-xs font-black shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
                  title="Exportar dados para Excel"
                >
                  <span className="material-symbols-outlined text-lg">download</span> CSV / Excel
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="w-full text-left min-w-[1000px] md:min-w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('code')}>Código {sortBy === 'code' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('name')}>Ativo {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('category')}>Categoria {sortBy === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700 text-right" onClick={() => handleSort('valorPatrimonial')}>Valor Patr. {sortBy === 'valorPatrimonial' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="px-6 py-4 text-right">Receitas</th>
                    <th className="px-6 py-4 text-right">Despesas</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700 text-right" onClick={() => handleSort('lucroLiquido')}>Lucro Líq. {sortBy === 'lucroLiquido' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700 text-right" onClick={() => handleSort('payback')}>Payback {sortBy === 'payback' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAssets.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors text-sm">
                      <td className="px-6 py-4 font-mono font-black text-slate-500">{a.code}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            a.category === 'Veículo' 
                              ? 'bg-amber-100 text-amber-600'
                              : a.category === 'Kitnet' 
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-rose-100 text-rose-600'
                          }`}>
                            <span className="material-symbols-outlined text-lg">
                              {a.category === 'Veículo' ? 'directions_car' : a.category === 'Kitnet' ? 'home' : 'store'}
                            </span>
                          </div>
                          <div>
                            <p className="font-black text-slate-800 dark:text-white uppercase truncate max-w-[200px]">{a.name}</p>
                            {a.dataAquisicao && (
                              <p className="text-[10px] text-slate-400 font-bold">Aq: {new Date(a.dataAquisicao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full ${
                          a.category === 'Veículo' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : a.category === 'Kitnet' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {a.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-white">R$ {a.valorPatrimonial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right text-success font-semibold">R$ {a.receitaAcumulada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right text-danger font-semibold">R$ {a.despesaAcumulada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-white">R$ {a.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-700 dark:text-slate-300">{a.payback.toFixed(1)}%</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full flex items-center justify-center gap-1 w-max border ${
                          a.status === 'Gerando Lucro'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : a.status === 'Investimento Recuperado'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            a.status === 'Gerando Lucro'
                              ? 'bg-blue-500 animate-pulse'
                              : a.status === 'Investimento Recuperado'
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
                          }`} />
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(a)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-black hover:scale-105 hover:bg-primary hover:text-slate-900 transition-all flex items-center gap-1 ml-auto"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">edit</span>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAssets.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-slate-400 font-bold uppercase text-xs">Nenhum bem patrimonial localizado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Asset Patrimonial Modal */}
          <Modal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title="✏️ Editar Dados Patrimoniais"
          >
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{editFormData.code}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{editFormData.category}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nome / Descrição do Bem</label>
                <input
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                  placeholder="Ex: Honda CG 160 / Casa Centro"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Valor de Compra (Investido)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editFormData.valorCompra}
                    onChange={(e) => setEditFormData({ ...editFormData, valorCompra: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Valor Patrimonial Atual</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editFormData.valorAtual}
                    onChange={(e) => setEditFormData({ ...editFormData, valorAtual: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Data de Aquisição</label>
                  <input
                    type="date"
                    value={editFormData.dataAquisicao}
                    onChange={(e) => setEditFormData({ ...editFormData, dataAquisicao: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                  />
                </div>
              </div>

              {/* Seção Financeira Histórica */}
              <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <div className="flex flex-col">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">💰 Seção Financeira Histórica</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Informe a receita e despesa acumuladas retroativas (até o último mês fechado) para compor o saldo inicial patrimonial.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Receita Acumulada Anterior</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.receitaAcumuladaAnterior}
                      onChange={(e) => setEditFormData({ ...editFormData, receitaAcumuladaAnterior: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Despesa Acumulada Anterior</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.despesaAcumuladaAnterior}
                      onChange={(e) => setEditFormData({ ...editFormData, despesaAcumuladaAnterior: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Observações</label>
                <textarea
                  value={editFormData.observacoes}
                  onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-xs h-24"
                  placeholder="Detalhamento histórico, anotações de reformas, manutenções antigas, etc."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex justify-center uppercase text-xs"
              >
                {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Salvar Alterações Patrimoniais'}
              </button>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
};

export default PatrimonioDashboard;
