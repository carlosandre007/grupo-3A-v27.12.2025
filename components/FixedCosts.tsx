import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FixedCost, Category } from '../types';
import { MONTHS } from '../constants';
import PageHeader from './PageHeader';
import Modal from './Modal';

const FixedCosts: React.FC = () => {
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    due_day: now.getDate().toString(),
    price: '',
    carry_forward_value: false
  });

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').eq('type', 'out').order('name');
      if (error) throw error;
      if (data) setCategories(data);
    } catch (err: any) {
      console.error('Erro ao buscar categorias:', err.message);
    }
  };

  const fetchCosts = async () => {
    setLoading(true);
    try {
      // 1. Fetch current month's costs
      const { data: currentData, error: currentError } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('due_date', { ascending: true });

      if (currentError) throw currentError;

      // 2. Automation: Replicate recurrent costs from previous records if current month is empty
      if (currentData && currentData.length === 0) {
        const { data: recurrentTemplates } = await supabase
          .from('fixed_costs')
          .select('*')
          .eq('is_recurrent', true)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(100);

        if (recurrentTemplates && recurrentTemplates.length > 0) {
          const uniqueNames = Array.from(new Set(recurrentTemplates.map(t => t.name)));
          const newCosts = uniqueNames.map(name => {
            const template = recurrentTemplates.find(t => t.name === name);
            const dueParts = template.due_date.split('-');
            const dueDay = parseInt(dueParts[2]) || 1;
            const newDueDate = new Date(currentYear, currentMonth, dueDay);
            
            return {
              name: template.name,
              category: template.category,
              price: template.carry_forward_value ? Number(template.price) : 0,
              carry_forward_value: template.carry_forward_value,
              qty: 1,
              due_date: newDueDate.toISOString().split('T')[0],
              month: currentMonth,
              year: currentYear,
              is_recurrent: true,
              status: 'pending'
            };
          });

          if (newCosts.length > 0) {
            const { error: insertError } = await supabase.from('fixed_costs').insert(newCosts);
            if (insertError) throw insertError;
            
            const { data: refreshedData } = await supabase
              .from('fixed_costs')
              .select('*')
              .eq('month', currentMonth)
              .eq('year', currentYear)
              .order('due_date', { ascending: true });
            if (refreshedData) setCosts(refreshedData);
          }
        } else {
          setCosts([]);
        }
      } else {
        setCosts(currentData || []);
      }
    } catch (err: any) {
      alert('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
    fetchCategories();
  }, []);

  const totalMonth = costs.reduce((acc, c) => acc + Number(c.price || 0), 0);
  const totalPaid = costs.filter(c => c.status === 'paid').reduce((acc, c) => acc + Number(c.price || 0), 0);

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    setCosts(prev => prev.map(c => c.id === id ? { ...c, price: newPrice } : c));
    await supabase.from('fixed_costs').update({ price: newPrice }).eq('id', id);
  };

  const handleEdit = (cost: FixedCost) => {
    const dueParts = cost.due_date.split('-');
    const day = parseInt(dueParts[2]) || 1;
    
    setFormData({
      name: cost.name,
      category: cost.category || '',
      due_day: day.toString(),
      price: cost.price.toString(),
      carry_forward_value: !!cost.carry_forward_value
    });
    setEditingId(cost.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', category: '', due_day: now.getDate().toString(), price: '', carry_forward_value: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const dueDayVal = parseInt(formData.due_day) || 1;
      const dueDate = new Date(currentYear, currentMonth, dueDayVal).toISOString().split('T')[0];

      const dbData = {
        name: formData.name,
        category: formData.category,
        due_date: dueDate,
        price: Number(formData.price) || 0,
        carry_forward_value: formData.carry_forward_value,
      };

      if (isEditing && editingId) {
        const { error } = await supabase.from('fixed_costs').update(dbData).eq('id', editingId);
        if (error) throw error;
      } else {
        const insertData = {
          ...dbData,
          price: 0,
          qty: 1,
          month: currentMonth,
          year: currentYear,
          is_recurrent: true,
          status: 'pending'
        };
        const { error } = await supabase.from('fixed_costs').insert([insertData]);
        if (error) throw error;
      }

      await fetchCosts();
      handleCloseModal();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (cost: FixedCost) => {
    if (cost.status === 'paid') return;
    
    const priceVal = Number(cost.price);
    if (!priceVal || priceVal <= 0) {
      alert('Por favor, preencha o valor do mês antes de registrar o pagamento.');
      return;
    }

    if (!confirm(`Confirmar pagamento de "${cost.name}" no valor de R$ ${priceVal.toLocaleString('pt-BR')}?`)) return;

    setSubmitting(true);
    const paymentHash = `fixed_costs_${cost.id}_${currentMonth}_${currentYear}_${priceVal}`;

    try {
      const { data: existing, error: checkError } = await supabase
        .from('transactions')
        .select('id')
        .eq('payment_hash', paymentHash)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existing) {
        const { data: { user } } = await supabase.auth.getUser();
        const userName = user?.email || 'Sistema';

        const { error: transError } = await supabase.from('transactions').insert([{
          description: `Custo Fixo: ${cost.name}`,
          category: cost.category || 'Custo Fixo',
          value: priceVal,
          type: 'out',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('pt-BR', { hour12: false }).substring(0, 5),
          source_module: 'fixed_costs',
          reference_id: cost.id,
          payment_hash: paymentHash,
          payment_registered: true,
          created_by: userName,
          responsible: userName,
          audit_log: [{
            user: userName,
            date: new Date().toISOString(),
            changes: 'Pagamento de custo fixo registrado'
          }]
        }]);
        if (transError) throw transError;
      }

      const { error: costError } = await supabase
        .from('fixed_costs')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', cost.id);

      if (costError) throw costError;

      await fetchCosts();
      alert('Pagamento registrado com sucesso!');
    } catch (err: any) {
      alert('Erro no pagamento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const password = prompt('Digite a senha para confirmar a exclusão:');
    if (password !== '4859') {
      if (password !== null) alert('Senha incorreta!');
      return;
    }
    
    if (!confirm('Excluir este custo mensal?')) return;
    try {
      const { error } = await supabase.from('fixed_costs').delete().eq('id', id);
      if (error) throw error;
      fetchCosts();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`Custos Fixos - ${MONTHS[currentMonth]} / ${currentYear}`}
        description="Contas recorrentes com controle de repetição de valor."
      >
        <button
          onClick={() => { setIsEditing(false); setIsModalOpen(true); }}
          className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">add</span> Configurar Nova Conta
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Estimado (Mês)</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {totalMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-2xl">calculate</span>
          </div>
        </div>
        <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between border-l-4 border-l-success">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Realizado / Pago</p>
            <p className="text-3xl font-black text-success">
              {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center text-success">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-slate-400">
            <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Venc.</th>
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Descrição</th>
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Categoria</th>
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 w-40">Valor do Mês</th>
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Status</th>
                  <th className="p-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {costs.map((cost) => (
                  <tr key={cost.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="p-5">
                      <span className="text-xs font-black px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                        DIA {cost.due_date.split('-')[2]}
                      </span>
                    </td>
                    <td className="p-5">
                      <p className="font-black text-slate-900 dark:text-white text-sm">{cost.name}</p>
                      <div className="flex gap-1 mt-1">
                        {cost.carry_forward_value ? (
                          <span className="text-[7px] font-black bg-blue-100 text-blue-700 px-1 py-0.5 rounded uppercase">Repete Valor</span>
                        ) : (
                          <span className="text-[7px] font-black bg-orange-100 text-orange-700 px-1 py-0.5 rounded uppercase">Manual</span>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cost.category}</span>
                    </td>
                    <td className="p-5">
                      {cost.status === 'paid' ? (
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {Number(cost.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      ) : (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={cost.price || ''}
                            onChange={(e) => handleUpdatePrice(cost.id, parseFloat(e.target.value) || 0)}
                            placeholder="0,00"
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        cost.status === 'paid' 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>
                        {cost.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {cost.status === 'pending' && (
                          <button
                            onClick={() => handleMarkAsPaid(cost)}
                            disabled={!cost.price || Number(cost.price) <= 0 || submitting}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-md ${
                              !cost.price || Number(cost.price) <= 0
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-success text-white hover:scale-105 shadow-success/20'
                            }`}
                          >
                            Pagar
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(cost)}
                          className="p-2 text-slate-300 hover:text-primary transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(cost.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {costs.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-400 text-sm italic">Nenhuma conta recorrente configurada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? "Editar Conta Recorrente" : "Nova Conta Recorrente"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Nome da Conta / Fornecedor</label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Ex: Energia (Equatorial)"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Categoria (Fluxo de Caixa)</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
            >
              <option value="">Selecione...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Dia do Vencimento</label>
            <input
              required
              type="number"
              min="1"
              max="31"
              value={formData.due_day}
              onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all font-black"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Valor do Custo (R$)</label>
            <input
              required
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all font-black"
              placeholder="0,00"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Configuração do Próximo Mês</label>
            <div className="grid grid-cols-1 gap-2">
              <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${!formData.carry_forward_value ? 'bg-primary/10 border-primary shadow-sm' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'}`}>
                <input
                  type="radio"
                  name="carry_forward"
                  checked={!formData.carry_forward_value}
                  onChange={() => setFormData({ ...formData, carry_forward_value: false })}
                  className="w-4 h-4 text-primary"
                />
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase">Preencher manualmente</p>
                  <p className="text-[10px] text-slate-500 font-bold">O valor começará zerado (Ex: Água, Luz)</p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${formData.carry_forward_value ? 'bg-primary/10 border-primary shadow-sm' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'}`}>
                <input
                  type="radio"
                  name="carry_forward"
                  checked={formData.carry_forward_value}
                  onChange={() => setFormData({ ...formData, carry_forward_value: true })}
                  className="w-4 h-4 text-primary"
                />
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase">Repetir último valor</p>
                  <p className="text-[10px] text-slate-500 font-bold">Copia o valor do mês anterior (Ex: Internet, Contador)</p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex justify-center uppercase tracking-widest"
          >
            {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : (isEditing ? 'Salvar Alterações' : 'Confirmar Configuração')}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default FixedCosts;
