import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';

interface Transaction {
  id: string;
  description: string;
  category: string;
  value: number;
  type: 'in' | 'out';
  date: string;
}

const CashFlow: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Transaction Form States
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    value: '',
    type: 'in' as 'in' | 'out',
    date: new Date().toISOString().split('T')[0]
  });

  // Category Form States
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    type: 'in' as 'in' | 'out'
  });
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Financial Summaries
  const income = transactions.reduce((acc, t) => t.type === 'in' ? acc + Number(t.value) : acc, 0);
  const expense = transactions.reduce((acc, t) => t.type === 'out' ? acc + Number(t.value) : acc, 0);
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

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const val = parseFloat(formData.value.replace('R$', '').replace('.', '').replace(',', '.'));

    const { error } = await supabase.from('transactions').insert([{
      description: formData.description,
      category: formData.category,
      value: val,
      type: formData.type,
      date: formData.date
    }]);

    if (!error) {
      await fetchTransactions();
      setIsModalOpen(false);
      setFormData({
        description: '',
        category: '',
        value: '',
        type: 'in',
        date: new Date().toISOString().split('T')[0]
      });
    } else {
      alert('Erro ao criar lançamento: ' + error.message);
    }
    setSubmitting(false);
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
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) {
        fetchCategories();
      } else {
        alert('Erro ao excluir categoria: ' + error.message);
      }
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Fluxo de Caixa"
        description="Controle detalhado de entradas e saídas financeiras."
      >
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="px-6 py-2.5 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">category</span> Categorias
        </button>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">add</span> Novo Lançamento
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Entradas (Total)</p>
          <p className="text-3xl font-black text-success">
            {income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saídas (Total)</p>
          <p className="text-3xl font-black text-danger">
            {expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 bg-primary/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saldo Geral</p>
          <p className={`text-3xl font-black ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-danger'}`}>
            {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Lançamentos Recentes</h3>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center text-slate-400">
            <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Data</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoria</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Descrição</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Valor</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">{t.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white">{t.description}</td>
                    <td className={`px-6 py-4 text-sm font-black text-right ${t.type === 'in' ? 'text-success' : 'text-danger'}`}>
                      {t.type === 'in' ? '+' : '-'} {Number(t.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`material-symbols-outlined ${t.type === 'in' ? 'text-success' : 'text-danger'}`}>
                        {t.type === 'in' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
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
        onClose={() => setIsModalOpen(false)}
        title="Novo Lançamento"
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
