import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Charge, Category, ChargeEditLog } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';

// Helper to get days of the current week based on a reference date
const getDaysOfWeek = (current: Date) => {
  const week = [];
  const start = new Date(current);
  start.setDate(start.getDate() - start.getDay()); // Start on Sunday

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    week.push(day);
  }
  return week;
};

const ChargesSchedule: React.FC = () => {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    id: '',
    clientName: '',
    id_categoria_financeira: '',
    valor_cobranca: '',
    date: new Date().toISOString().split('T')[0],
    frequency: 'weekly' as 'weekly' | 'monthly' | 'fixed',
    dayOfWeek: 1, // Default to Monday
    dayOfMonth: 1,
    isRecurring: true,
    observation: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Derived state
  const weekDays = getDaysOfWeek(currentDate);
  const startOfWeek = weekDays[0];
  const endOfWeek = weekDays[6];

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (!error && data) setCategories(data);
  };

  const fetchCharges = async () => {
    setLoading(true);
    const startStr = startOfWeek.toISOString().split('T')[0];
    const endStr = endOfWeek.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('charges')
      .select(`
        *,
        categories (
          name
        )
      `)
      .gte('due_date', startStr)
      .lte('due_date', endStr);

    console.log('Fetch Charges Result:', { data, error, startStr, endStr });

    if (error) {
      console.error('Erro ao buscar cobranças:', error);
      // Try to fetch without join as fallback
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('charges')
        .select('*')
        .gte('due_date', startStr)
        .lte('due_date', endStr);
      
      if (!fallbackError && fallbackData) {
        console.warn('Busca realizada sem o join de categorias devido a erro.');
        processCharges(fallbackData);
      }
    } else if (data) {
      processCharges(data);
    }
    setLoading(false);
  };

  const processCharges = (data: any[]) => {
      const mapped: Charge[] = data.map((item: any) => ({
        id: item.id,
        clientName: item.client_name,
        ref: item.ref,
        id_categoria_financeira: item.id_categoria_financeira || item.category_id,
        category_name: item.categories?.name || item.ref || 'Sem Categoria',
        valor_cobranca: Number(item.valor_cobranca || item.value || 0),
        date: item.due_date,
        time: item.time,
        status: item.status,
        receivedAt: item.received_at,
        frequency: item.frequency || 'weekly',
        dayOfWeek: item.day_of_week,
        dayOfMonth: item.day_of_month,
        isRecurring: item.is_recurring,
        observation: item.observation
      }));
      setCharges(mapped);
  };

  useEffect(() => {
    fetchCharges();
    fetchCategories();
  }, [currentDate]);

  const toggleCharge = async (charge: Charge) => {
    const newStatus = charge.status === 'received' ? 'pending' : 'received';
    const receivedAt = newStatus === 'received' ? new Date().toISOString() : null;

    // Optimistic update
    setCharges(prev => prev.map(c =>
      c.id === charge.id ? { ...c, status: newStatus, receivedAt: receivedAt || undefined } : c
    ));

    // 1. Update Charge Status
    const { error } = await supabase
      .from('charges')
      .update({
        status: newStatus,
        received_at: receivedAt
      })
      .eq('id', charge.id);

    if (error) {
      alert('Erro ao atualizar status: ' + error.message);
      fetchCharges();
      return;
    }

    // 2. Integration: Charges -> Cash Flow
    if (newStatus === 'received') {
      // Check if transaction already exists for this charge
      const { data: existingTrans } = await supabase
        .from('transactions')
        .select('id')
        .eq('referencia_id', charge.id)
        .eq('value', charge.valor_cobranca)
        .maybeSingle();

      if (!existingTrans) {
        // Robust category lookup
        const chargeCatId = charge.id_categoria_financeira || charge.category_id;
        const selectedCategory = categories.find(cat => cat.id === chargeCatId);
        
        const { error: transError } = await supabase.from('transactions').insert([{
          description: `Cobrança - ${charge.clientName} - Escala`,
          category: selectedCategory?.name || charge.category_name || 'Recebimento de Cobrança', 
          value: charge.valor_cobranca,
          type: selectedCategory?.type || 'in',
          date: new Date().toISOString().split('T')[0],
          referencia_id: charge.id,
          origem: 'escala_cobranca'
        }]);

        if (transError) {
          console.error('Erro ao gerar lançamento no fluxo de caixa:', transError.message);
          alert('Atenção: A cobrança foi marcada como paga, mas houve um erro ao registrar no Fluxo de Caixa: ' + transError.message);
        } else {
          alert('Sucesso! Cobrança recebida e registrada no Fluxo de Caixa.');
        }
      }
    }

    // 3. Handle Recurrence
    if (newStatus === 'received' && charge.isRecurring) {
      // Automatic recurrence logic
      const calculateNextDate = (dateStr: string, frequency: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        if (frequency === 'weekly') d.setDate(d.getDate() + 7);
        else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
        else d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
      };

      const nextDate = calculateNextDate(charge.date, charge.frequency || 'weekly');

      const { data: existingNext } = await supabase
        .from('charges')
        .select('id')
        .eq('client_name', charge.clientName)
        .eq('due_date', nextDate)
        .eq('ref', charge.ref)
        .maybeSingle();

      if (!existingNext) {
        await supabase.from('charges').insert([{
          client_name: charge.clientName,
          ref: charge.ref,
          valor_cobranca: charge.valor_cobranca,
          value: charge.valor_cobranca, // Keep for compatibility
          due_date: nextDate,
          status: 'pending',
          frequency: charge.frequency,
          day_of_week: charge.dayOfWeek,
          day_of_month: charge.dayOfMonth,
          is_recurring: true,
          id_categoria_financeira: charge.id_categoria_financeira,
          category_id: charge.id_categoria_financeira // Keep for compatibility
        }]);
        fetchCharges();
      }
    }
  };

  const handleEditCharge = (charge: Charge, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCharge(charge);
    setIsEditMode(true);
    setFormData({
      id: charge.id,
      clientName: charge.clientName,
      id_categoria_financeira: charge.id_categoria_financeira || '',
      valor_cobranca: charge.valor_cobranca.toString(),
      date: charge.date,
      frequency: charge.frequency as any || 'weekly',
      dayOfWeek: charge.dayOfWeek || 1,
      dayOfMonth: charge.dayOfMonth || 1,
      isRecurring: charge.isRecurring ?? true,
      observation: charge.observation || ''
    });
    setIsModalOpen(true);
  };

  const logChange = async (chargeId: string, changes: { field: string, old: any, new: any }[]) => {
    const logs = changes.map(c => ({
      id_cobranca: chargeId,
      usuario: 'Usuário Atual', // Em um sistema real, viria do contexto de autenticação
      campo_editado: c.field,
      valor_antigo: String(c.old),
      valor_novo: String(c.new)
    }));
    if (logs.length > 0) {
      await supabase.from('log_edicao_cobrancas').insert(logs);
    }
  };

  const handlePauseCharge = async (charge: Charge, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = charge.status === 'pending' ? 'paused' : 'pending';
    const { error } = await supabase.from('charges').update({ status: newStatus }).eq('id', charge.id);
    if (!error) fetchCharges();
    else alert('Erro ao alterar status: ' + error.message);
  };

  const handleDeleteCharge = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const password = prompt('Digite a senha para confirmar a exclusão:');
    if (password !== '4859') {
      if (password !== null) alert('Senha incorreta!');
      return;
    }

    const { error } = await supabase.from('charges').delete().eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      fetchCharges();
    }
  };

  const handleEmitReceipt = (charge: Charge, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // As requested by business rule: Emitir recibo -> NÃO registra no caixa
    const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
    const year = new Date(charge.date).getFullYear();
    const monthName = monthFormatter.format(new Date(charge.date));
    
    alert('Recibo emitido com sucesso! (Nenhum lançamento no caixa foi criado para evitar duplicidade).');

    const msg = encodeURIComponent(`Olá ${charge.clientName}, aqui está a confirmação de recebimento no valor de R$ ${Number(charge.valor_cobranca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente a ${charge.category_name || charge.ref}. Data: ${new Date().toLocaleDateString('pt-BR')}.`);
    
    if (confirm('Deseja enviar a confirmação de recebimento por WhatsApp?')) {
      // In a real scenario you would have the client's phone number here.
      // We open a generic WhatsApp link that allows the user to pick the contact.
      window.open(`https://wa.me/?text=${msg}`, '_blank');
    }
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const val = parseFloat(formData.valor_cobranca) || 0;
    const clientNameClean = formData.clientName.trim();
    const selectedCategory = categories.find(c => c.id === formData.id_categoria_financeira);

    const dbData = {
      client_name: clientNameClean,
      ref: selectedCategory?.name || 'Sem Categoria',
      id_categoria_financeira: formData.id_categoria_financeira,
      category_id: formData.id_categoria_financeira, // Compatibilidade
      valor_cobranca: val,
      value: val, // Compatibilidade
      due_date: formData.date,
      status: isEditMode ? editingCharge?.status : 'pending',
      frequency: formData.frequency,
      day_of_week: formData.frequency === 'weekly' ? formData.dayOfWeek : null,
      day_of_month: formData.frequency === 'monthly' ? formData.dayOfMonth : null,
      is_recurring: formData.isRecurring,
      observation: formData.observation
    };

    if (isEditMode && editingCharge) {
      const changes = [];
      if (editingCharge.clientName !== clientNameClean) changes.push({ field: 'client_name', old: editingCharge.clientName, new: clientNameClean });
      const oldCategoryId = editingCharge.id_categoria_financeira || editingCharge.category_id;
      if (oldCategoryId !== formData.id_categoria_financeira) changes.push({ field: 'id_categoria_financeira', old: oldCategoryId, new: formData.id_categoria_financeira });
      if (editingCharge.valor_cobranca !== val) changes.push({ field: 'valor_cobranca', old: editingCharge.valor_cobranca, new: val });
      if (editingCharge.date !== formData.date) changes.push({ field: 'due_date', old: editingCharge.date, new: formData.date });
      if (editingCharge.frequency !== formData.frequency) changes.push({ field: 'frequency', old: editingCharge.frequency, new: formData.frequency });
      if (editingCharge.observation !== formData.observation) changes.push({ field: 'observation', old: editingCharge.observation, new: formData.observation });

      const { error } = await supabase.from('charges').update(dbData).eq('id', editingCharge.id);
      if (!error) {
        await logChange(editingCharge.id, changes);
        
        // Integration: Update linked transaction in Cash Flow if exists
        const { data: existingTrans } = await supabase
          .from('transactions')
          .select('id')
          .eq('referencia_id', editingCharge.id)
          .maybeSingle();

        if (existingTrans) {
          await supabase.from('transactions').update({
            description: `Cobrança recorrente - Escala de Cobrança`,
            category: selectedCategory?.name || 'Recebimento de Cobrança',
            value: val,
            type: selectedCategory?.type || 'in',
            date: formData.date
          }).eq('id', existingTrans.id);
        }

        await fetchCharges();
        handleCloseModal();
      } else {
        alert('Erro ao atualizar cobrança: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('charges').insert([dbData]);
      if (!error) {
        await fetchCharges();
        handleCloseModal();
      } else {
        alert('Erro ao criar cobrança: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingCharge(null);
    setFormData({
      id: '',
      clientName: '',
      id_categoria_financeira: '',
      valor_cobranca: '',
      date: new Date().toISOString().split('T')[0],
      frequency: 'weekly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      isRecurring: true,
      observation: ''
    });
  };

  // Summaries
  const totalWeek = charges.reduce((acc, c) => acc + Number(c.valor_cobranca), 0);
  const totalReceived = charges.filter(c => c.status === 'received').reduce((acc, c) => acc + Number(c.valor_cobranca), 0);
  const totalPending = charges.filter(c => c.status === 'pending').reduce((acc, c) => acc + Number(c.valor_cobranca), 0);

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Escala de Cobrança"
        description="Calendário de recebimentos da semana corrente."
      >
        <div className="flex gap-2">
          <div className="flex bg-white dark:bg-brand-surface p-1 rounded-xl border border-slate-200 dark:border-slate-800 mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-primary text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Calendário
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-primary text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Lista
            </button>
          </div>
          <button
            onClick={handlePreviousWeek}
            className="px-5 py-2.5 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 transition-all font-mono"
          >
            &lt;
          </button>
          <button
            onClick={handleNextWeek}
            className="px-5 py-2.5 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 transition-all font-mono"
          >
            &gt;
          </button>
        </div>
      </PageHeader>

      {/* Weekly View Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day, idx) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayCharges = charges.filter(c => c.date.split('T')[0] === day.toISOString().split('T')[0]);

            return (
              <div key={idx} className={`flex flex-col min-h-[400px] bg-white dark:bg-brand-surface rounded-3xl border ${isToday ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-slate-100 dark:border-slate-800'} overflow-hidden`}>
                <div className={`p-4 text-center border-b ${isToday ? 'bg-primary/10 border-primary/20' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-primary-dark' : 'text-slate-400'}`}>
                    {dayNames[idx]}
                  </p>
                  <p className={`text-xl font-black ${isToday ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-400'}`}>
                    {day.getDate()}
                  </p>
                </div>

                <div className="flex-1 p-3 space-y-3 custom-scrollbar overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-4"><span className="material-symbols-outlined animate-spin text-slate-300">sync</span></div>
                  ) : dayCharges.length > 0 ? (
                    dayCharges.map((charge) => {
                      const isDone = charge.status === 'received';
                      return (
                        <div
                          key={charge.id}
                          onClick={() => toggleCharge(charge)}
                          className={`relative p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-2 ${isDone
                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
                            : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-primary/50'
                            }`}
                        >
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                            <button onClick={(e) => handleEditCharge(charge, e)} className="p-1 text-slate-400 hover:text-primary rounded-full hover:bg-slate-100" title="Editar">
                              <span className="material-symbols-outlined text-xs font-bold">edit</span>
                            </button>
                            <button onClick={(e) => handlePauseCharge(charge, e)} className={`p-1 rounded-full hover:bg-slate-100 transition-all ${charge.status === 'paused' ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`} title={charge.status === 'paused' ? 'Reativar' : 'Pausar'}>
                              <span className="material-symbols-outlined text-xs font-bold">{charge.status === 'paused' ? 'play_arrow' : 'pause'}</span>
                            </button>
                            <button onClick={(e) => handleDeleteCharge(charge.id, e)} className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100" title="Excluir">
                              <span className="material-symbols-outlined text-xs font-bold">delete</span>
                            </button>
                            {isDone && (
                              <button onClick={(e) => handleEmitReceipt(charge, e)} className="p-1 text-slate-400 hover:text-success rounded-full hover:bg-slate-100" title="Emitir Recibo">
                                <span className="material-symbols-outlined text-xs font-bold">receipt_long</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-4">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className={`text-xs font-black transition-all ${isDone ? 'text-green-700 dark:text-green-400 line-through opacity-50' : 'text-slate-900 dark:text-white'}`}>
                                  {charge.clientName}
                                </p>
                                {charge.isRecurring && (
                                  <span className="material-symbols-outlined text-[10px] text-primary animate-pulse">sync</span>
                                )}
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{charge.category_name || charge.ref}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isDone ? 'bg-success border-success text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                              {isDone && <span className="material-symbols-outlined text-xs font-black">check</span>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-black text-slate-900 dark:text-white">R$ {Number(charge.valor_cobranca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                      <span className="material-symbols-outlined text-3xl">event_busy</span>
                      <span className="text-[8px] font-black uppercase tracking-tighter mt-1">Vazio</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Cliente</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Categoria</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Valor</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Frequência</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Próxima cobrança</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Status</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center"><span className="material-symbols-outlined animate-spin text-slate-300">sync</span></td></tr>
              ) : charges.length > 0 ? (
                charges.map(charge => (
                  <tr key={charge.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-5 text-sm font-black text-slate-900 dark:text-white capitalize">{charge.clientName}</td>
                    <td className="p-5">
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                        {charge.category_name || charge.ref}
                      </span>
                    </td>
                    <td className="p-5 text-sm font-black text-slate-900 dark:text-white">R$ {Number(charge.valor_cobranca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{charge.frequency === 'weekly' ? 'Semanal' : charge.frequency === 'monthly' ? 'Mensal' : 'Fixo'}</span>
                    </td>
                    <td className="p-5 text-sm font-bold text-slate-600 dark:text-slate-400">{new Date(charge.date).toLocaleDateString('pt-BR')}</td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${charge.status === 'received' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {charge.status === 'received' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={(e) => toggleCharge(charge)} className={`p-1.5 rounded-lg transition-all ${charge.status === 'received' ? 'text-slate-300' : 'text-success hover:bg-green-50'}`} title="Marcar como Pago">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                        </button>
                        <button onClick={(e) => handleEditCharge(charge, e)} className="p-1.5 text-slate-400 hover:text-primary transition-all" title="Editar">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onClick={(e) => handleDeleteCharge(charge.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 transition-all" title="Excluir">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                        {charge.status === 'received' && (
                          <button onClick={(e) => handleEmitReceipt(charge, e)} className="p-1.5 text-slate-400 hover:text-success transition-all" title="Emitir Recibo">
                            <span className="material-symbols-outlined text-sm">receipt_long</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400 text-sm">Nenhuma cobrança encontrada para este período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap gap-8 items-center justify-between">
        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Semana</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">{totalWeek.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Já Recebido</span>
            <span className="text-xl font-black text-success">{totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendente</span>
            <span className="text-xl font-black text-warning">{totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-xl text-xs font-black shadow-lg shadow-success/20">
            <span className="material-symbols-outlined text-sm">print</span> Imprimir Escala
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-primary text-white dark:text-slate-900 rounded-xl text-xs font-black"
          >
            <span className="material-symbols-outlined text-sm">add</span> Nova Cobrança
          </button>
        </div>
      </div>

      {/* Edit/Add Charge Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditMode ? "Editar Cobrança" : "Nova Cobrança"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Cliente</label>
            <input
              required
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Ex: João da Silva"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria Financeira</label>
              <select
                required
                value={formData.id_categoria_financeira}
                onChange={(e) => setFormData({ ...formData, id_categoria_financeira: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name} ({cat.type === 'in' ? 'Receita' : 'Despesa'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Valor</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={formData.valor_cobranca}
                  onChange={(e) => setFormData({ ...formData, valor_cobranca: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Frequência</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
          </div>

          {formData.frequency === 'weekly' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Dia da Semana</label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                {dayNames.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {formData.frequency === 'monthly' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Dia do Mês</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfMonth}
                  onChange={(e) => setFormData({ ...formData, dayOfMonth: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Ano</label>
                <input
                  type="number"
                  value={new Date(formData.date).getFullYear()}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-500 font-bold"
                />
              </div>
            </div>
          )}

          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Observação</label>
            <textarea
              value={formData.observation}
              onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all resize-none h-20"
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <label htmlFor="isRecurring" className="text-xs font-bold text-slate-500">Cobrança Recorrente</label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex justify-center"
          >
            {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : (isEditMode ? 'Salvar Alterações' : 'Agendar Cobrança')}
          </button>
        </form>
      </Modal>
    </div >
  );
};

export default ChargesSchedule;
