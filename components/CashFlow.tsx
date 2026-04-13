import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Category, Transaction } from '../types';
import { MONTHS } from '../constants';
import PageHeader from './PageHeader';
import Modal from './Modal';

const CashFlow: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [banks, setBanks] = useState<any[]>([]);

  // Transaction Form States
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    value: '',
    type: 'in' as 'in' | 'out',
    date: new Date().toISOString().split('T')[0],
    id_conta: '',
    id: ''
  });

  // Category Form States
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    type: 'in' as 'in' | 'out'
  });
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Financial Summaries (Filtered)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Using getUTCFullYear and getUTCMonth to avoid timezone shift issues with date strings like '2026-02-20'
      const dateParts = t.date.split('-');
      const y = parseInt(dateParts[0]);
      const m = parseInt(dateParts[1]) - 1;
      
      const isDateMatch = y === selectedYear && m === selectedMonth;
      const isCategoryMatch = selectedCategoryFilter === 'all' || t.category === selectedCategoryFilter;
      
      return isDateMatch && isCategoryMatch;
    });
  }, [transactions, selectedMonth, selectedYear, selectedCategoryFilter]);

  const income = filteredTransactions.reduce((acc, t) => t.type === 'in' ? acc + Number(t.value) : acc, 0);
  const expense = filteredTransactions.reduce((acc, t) => t.type === 'out' ? acc + Number(t.value) : acc, 0);
  const balance = income - expense;

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchBanks = async () => {
    const { data } = await supabase.from('banks').select('*').order('name');
    if (data) setBanks(data);
  };

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchBanks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const val = parseFloat(formData.value) || 0;

    const dbData = {
      description: formData.description,
      category: formData.category,
      value: val,
      type: formData.type,
      date: formData.date,
      id_conta: formData.id_conta,
      origem: 'cash_flow'
    };

    if (isEditing && formData.id) {
      const { error } = await supabase
        .from('transactions')
        .update(dbData)
        .eq('id', formData.id);

      if (!error) {
        await fetchTransactions();
        handleCloseModal();
      } else {
        alert('Erro ao atualizar lançamento: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('transactions').insert([dbData]);

      if (!error) {
        await fetchTransactions();
        handleCloseModal();
      } else {
        alert('Erro ao criar lançamento: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  const handleEditTransaction = (t: Transaction) => {
    setFormData({
      description: t.description,
      category: t.category,
      value: t.value.toString(),
      type: t.type,
      date: t.date,
      id_conta: t.id_conta || '',
      id: t.id
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setFormData({
      description: '',
      category: '',
      value: '',
      type: 'in',
      date: new Date().toISOString().split('T')[0],
      id_conta: '',
      id: ''
    });
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isEditingCategory) {
      const { error } = await supabase
        .from('categories')
        .update({ name: categoryForm.name, type: categoryForm.type })
        .eq('id', categoryForm.id);

      if (!error) {
        await fetchCategories();
        setCategoryForm({ id: '', name: '', type: 'in' });
        setIsEditingCategory(false);
      } else {
        alert('Erro ao atualizar categoria: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('categories').insert([{
        name: categoryForm.name,
        type: categoryForm.type
      }]);

      if (!error) {
        await fetchCategories();
        setCategoryForm({ id: '', name: '', type: 'in' });
      } else {
        alert('Erro ao criar categoria: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  const handleEditCategory = (cat: Category) => {
    setCategoryForm({ id: cat.id, name: cat.name, type: cat.type });
    setIsEditingCategory(true);
  };

  const handleDeleteCategory = async (id: string) => {
    const password = prompt('Digite a senha para confirmar a exclusão desta categoria:');
    if (password !== '803099') {
      if (password !== null) alert('Senha incorreta!');
      return;
    }
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      fetchCategories();
    } else {
      alert('Erro ao excluir categoria: ' + error.message);
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  const handleDeleteTransaction = async (transaction: Transaction) => {
    const password = prompt('Para excluir este lançamento, insira a senha de confirmação:');
    if (password !== '803099') {
      alert('Senha incorreta. A exclusão não foi realizada.');
      return;
    }

    const { error } = await supabase.from('transactions').delete().eq('id', transaction.id);
    if (!error) {
      fetchTransactions();
    } else {
      alert('Erro ao excluir transação: ' + error.message);
    }
  };


  return (
    <div className="space-y-4 md:space-y-6 pb-8">
      <PageHeader
        title="Fluxo de Caixa"
        description="Controle detalhado de entradas e saídas financeiras."
      >
        <div className="flex flex-wrap gap-2 md:grid-cols-2 lg:flex lg:flex-nowrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="flex-1 md:flex-none px-3 py-2 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="flex-1 md:flex-none px-3 py-2 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 md:flex-none px-4 py-2 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">category</span> Categorias
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">add</span> Novo
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white dark:bg-brand-surface p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Entradas</p>
          <p className="text-lg md:text-3xl font-black text-success">
            {income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-white dark:bg-brand-surface p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saídas</p>
          <p className="text-lg md:text-3xl font-black text-danger">
            {expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-brand-surface p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 bg-primary/5">
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saldo Geral</p>
          <p className={`text-lg md:text-3xl font-black ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-danger'}`}>
            {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Lançamentos</h3>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center text-slate-400">
            <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left min-w-[600px] md:min-w-full">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Data</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Conta</th>
                  <th className="px-6 py-4">
                    <div className="flex items-center min-w-[130px]">
                      <select
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="bg-transparent outline-none cursor-pointer text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] w-full appearance-none hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title="Filtrar por Categoria"
                        style={{ background: 'none' }}
                      >
                        <option value="all">CATEGORIA ▼</option>
                        {Array.from(new Set(categories.map(c => c.name))).sort().map((catName, idx) => (
                          <option key={idx} value={catName} className="text-slate-900 dark:text-slate-100">
                            {catName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/4">Descrição</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Valor</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Tipo</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{banks.find(b => b.id === t.id_conta)?.name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">{t.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white max-w-[200px] truncate" title={t.description}>{t.description}</td>
                    <td className={`px-6 py-4 text-sm font-black text-right ${t.type === 'in' ? 'text-success' : 'text-danger'}`}>
                      {t.type === 'in' ? '+' : '-'} {Number(t.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`material-symbols-outlined ${t.type === 'in' ? 'text-success' : 'text-danger'}`}>
                        {t.type === 'in' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditTransaction(t)}
                          className="p-1 text-slate-400 hover:text-primary transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(t)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? "Editar Lançamento" : "Novo Lançamento"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'in' ? 'bg-white shadow-sm text-success' : 'text-slate-500'}`}
              onClick={() => setFormData({ ...formData, type: 'in', category: '' })}
            >
              Entrada
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'out' ? 'bg-white shadow-sm text-danger' : 'text-slate-500'}`}
              onClick={() => setFormData({ ...formData, type: 'out', category: '' })}
            >
              Saída
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
            <input
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Ex: Recebimento de Aluguel"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="">Selecione...</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              {filteredCategories.length === 0 && (
                <p className="text-[10px] text-red-500 mt-1">Nenhuma categoria encontrada. Cadastre uma nova.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Banco / Conta</label>
              <select
                required
                value={formData.id_conta}
                onChange={(e) => setFormData({ ...formData, id_conta: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="">Selecione...</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Valor (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex justify-center"
          >
            {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Salvar Lançamento'}
          </button>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Gerenciar Categorias"
      >
        <div className="space-y-6">
          <form onSubmit={handleCategorySubmit} className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              {isEditingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <input
                required
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Nome da Categoria"
                className="w-full px-4 py-2 bg-white dark:bg-brand-surface rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none text-sm"
              />
              <select
                value={categoryForm.type}
                onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as 'in' | 'out' })}
                className="w-full px-4 py-2 bg-white dark:bg-brand-surface rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none text-sm"
              >
                <option value="in">Entrada</option>
                <option value="out">Saída</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 bg-primary text-slate-900 rounded-xl text-xs font-black uppercase shadow-sm hover:shadow-md transition-all"
              >
                {isEditingCategory ? 'Atualizar' : 'Adicionar'}
              </button>
              {isEditingCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCategory(false);
                    setCategoryForm({ id: '', name: '', type: 'in' });
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black uppercase hover:bg-slate-300 transition-all"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {categories.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">Nenhuma categoria encontrada.</p>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-white dark:bg-brand-surface rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${cat.type === 'in' ? 'bg-success' : 'bg-danger'}`}></span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CashFlow;
