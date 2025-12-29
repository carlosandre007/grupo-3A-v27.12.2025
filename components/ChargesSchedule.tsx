import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Charge } from '../types';
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    ref: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'received',
    frequency: 'fixed' as 'fixed' | 'weekly' | 'monthly',
    dayOfWeek: 1, // Default to Monday
    dayOfMonth: 1,
    isRecurring: true
  });
  const [submitting, setSubmitting] = useState(false);

  // Derived state
  const weekDays = getDaysOfWeek(currentDate);
  const startOfWeek = weekDays[0];
  const endOfWeek = weekDays[6];

  const fetchCharges = async () => {
    setLoading(true);
    // Adjust dates for query to ensure we cover the whole day in UTC if needed, 
    // but simply comparing string YYYY-MM-DD works well for 'date' type columns.
    const startStr = startOfWeek.toISOString().split('T')[0];
    const endStr = endOfWeek.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('charges')
      .select('*')
      .gte('due_date', startStr)
      .lte('due_date', endStr);

    if (!error && data) {
      const mapped: Charge[] = data.map((item: any) => ({
        id: item.id,
        clientName: item.client_name,
        ref: item.ref,
        value: item.value,
        date: item.due_date,
        time: item.time,
        status: item.status,
        receivedAt: item.received_at,
        frequency: item.frequency,
        dayOfWeek: item.day_of_week,
        dayOfMonth: item.day_of_month,
        isRecurring: item.is_recurring
      }));
      setCharges(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharges();
  }, [currentDate]);

  const toggleCharge = async (charge: Charge) => {
    const newStatus = charge.status === 'received' ? 'pending' : 'received';
    const receivedAt = newStatus === 'received' ? new Date().toISOString() : null;

    // Optimistic update
    setCharges(prev => prev.map(c =>
      c.id === charge.id ? { ...c, status: newStatus, receivedAt: receivedAt || undefined } : c
    ));

    const { error } = await supabase
      .from('charges')
      .update({
        status: newStatus,
        received_at: receivedAt
      })
      .eq('id', charge.id);

    if (!error && newStatus === 'received' && charge.isRecurring) {
      // Automatic recurrence: create next record
      const calculateNextDate = (dateStr: string, frequency: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        if (frequency === 'weekly') d.setDate(d.getDate() + 7);
        else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
        else d.setDate(d.getDate() + 7); // Default fallback for recurring
        return d.toISOString().split('T')[0];
      };

      const nextDate = calculateNextDate(charge.date, charge.frequency || 'weekly');

      await supabase.from('charges').insert([{
        client_name: charge.clientName,
        ref: charge.ref,
        value: charge.value,
        due_date: nextDate,
        status: 'pending',
        frequency: charge.frequency,
        day_of_week: charge.dayOfWeek,
        day_of_month: charge.dayOfMonth,
        is_recurring: true
      }]);

      fetchCharges(); // Refresh to show the next one if it lands in the same week
    }

    if (error) {
      // Revert if error
      alert('Erro ao atualizar status: ' + error.message);
      fetchCharges();
    }
  };

  const handleDeleteCharge = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta cobrança?')) return;

    const { error } = await supabase.from('charges').delete().eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      fetchCharges();
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

    const val = parseFloat(formData.value) || 0;

    const { error } = await supabase.from('charges').insert([{
      client_name: formData.clientName,
      ref: formData.ref,
      value: val,
      due_date: formData.date,
      time: null,
      status: formData.status,
      frequency: formData.frequency,
      day_of_week: formData.frequency === 'weekly' ? formData.dayOfWeek : null,
      day_of_month: formData.frequency === 'monthly' ? formData.dayOfMonth : null,
      is_recurring: formData.isRecurring
    }]);

    if (!error) {
      await fetchCharges();
      setIsModalOpen(false);
      setFormData({
        clientName: '',
        ref: '',
        value: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        frequency: 'fixed',
        dayOfWeek: 1,
        dayOfMonth: 1,
        isRecurring: true
      });
    } else {
      alert('Erro ao criar cobrança: ' + error.message);
    }
    setSubmitting(false);
  };

  // Summaries
  const totalWeek = charges.reduce((acc, c) => acc + Number(c.value), 0);
  const totalReceived = charges.filter(c => c.status === 'received').reduce((acc, c) => acc + Number(c.value), 0);
  const totalPending = charges.filter(c => c.status === 'pending').reduce((acc, c) => acc + Number(c.value), 0);

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Escala de Cobrança"
        description="Calendário de recebimentos da semana corrente."
      >
        <button
          onClick={handlePreviousWeek}
          className="px-5 py-2.5 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 transition-all"
        >
          Semana Anterior
        </button>
        <button
          onClick={handleNextWeek}
          className="px-5 py-2.5 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 transition-all"
        >
          Próxima Semana
        </button>
      </PageHeader>

      {/* Weekly View Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day, idx) => {
          const isToday = day.toDateString() === new Date().toDateString();
          // Filter charges for this day. 
          // Note: ensuring date string comparison works regardless of time component by using split
          const dayCharges = charges.filter(c => {
            // c.date is YYYY-MM-DD string from db usually, or ISO. 
            // If it comes from DB as '2025-12-26', we can compare.
            // If it comes as full ISO, we split.
            return c.date.split('T')[0] === day.toISOString().split('T')[0];
          });

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
                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteCharge(charge.id, e)}
                          className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100 z-10"
                          title="Excluir cobrança"
                        >
                          <span className="material-symbols-outlined text-xs font-bold">delete</span>
                        </button>

                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <p className={`text-xs font-black transition-all ${isDone ? 'text-green-700 dark:text-green-400 line-through opacity-50' : 'text-slate-900 dark:text-white'}`}>
                              {charge.clientName}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{charge.ref}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isDone ? 'bg-success border-success text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                            }`}>
                            {isDone && <span className="material-symbols-outlined text-xs font-black">check</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] font-black text-slate-900 dark:text-white">R$ {Number(charge.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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

      {/* Add Charge Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Cobrança"
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
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Referência</label>
            <input
              required
              value={formData.ref}
              onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Ex: Aluguel Semana 4"
            />
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
                <option value="fixed">Única</option>
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
            <label className="block text-xs font-bold text-slate-500 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="0,00"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            />
            <label htmlFor="isRecurring" className="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              Cobrança Recorrente
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex justify-center"
          >
            {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Agendar Cobrança'}
          </button>
        </form>
      </Modal>
    </div >
  );
};

export default ChargesSchedule;
