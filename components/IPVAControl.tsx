import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { IPVARecord, Motorcycle } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';

const IPVAControl: React.FC = () => {
  const [records, setRecords] = useState<IPVARecord[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const [formData, setFormData] = useState({
    id: '',
    motorcycleId: '',
    vehicle: '',
    type: 'Motocicleta',
    plate: '',
    year: new Date().getFullYear().toString(),
    value: '',
    dueDate: '',
    status: 'pending' as 'paid' | 'pending' | 'overdue' | 'upcoming'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Financial Summaries
  const totalToPay = records.filter(r => ['pending', 'overdue', 'upcoming'].includes(r.status)).reduce((acc, r) => acc + Number(r.value), 0);
  const totalPaid = records.filter(r => r.status === 'paid').reduce((acc, r) => acc + Number(r.value), 0);
  const dueSoonCount = records.filter(r => {
    const due = new Date(r.dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return r.status === 'pending' && diffDays <= 30 && diffDays >= 0;
  }).length;

  const fetchRecords = async () => {
    setLoading(true);
    const { data: ipvaData, error: ipvaError } = await supabase
      .from('ipva_records')
      .select('*')
      .order('due_date', { ascending: true });

    if (!ipvaError && ipvaData) {
      const mapped: IPVARecord[] = ipvaData.map((item: any) => ({
        id: item.id,
        vehicle: item.vehicle,
        type: item.type,
        plate: item.plate,
        year: item.year,
        value: item.value,
        dueDate: item.due_date,
        status: item.status
      }));
      setRecords(mapped);
    }
    setLoading(false);
  };

  const fetchMotorcycles = async () => {
    const { data, error } = await supabase
      .from('motorcycles')
      .select('*')
      .order('plate');

    if (!error && data) {
      const mapped: Motorcycle[] = data.map((item: any) => ({
        id: item.id,
        code: item.code,
        model: item.model,
        color: item.color,
        plate: item.plate,
        year: item.year,
        status: item.status,
        km: item.km
      }));
      setMotorcycles(mapped);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchMotorcycles();
  }, []);

  const handleMotorcycleSelect = (motoId: string) => {
    const selectedMoto = motorcycles.find(m => m.id === motoId);
    if (selectedMoto) {
      setFormData({
        ...formData,
        motorcycleId: selectedMoto.id,
        vehicle: `[${selectedMoto.code}] ${selectedMoto.model} - ${selectedMoto.color}`,
        plate: selectedMoto.plate,
        type: 'Motocicleta' // Default to Motocicleta as per user request context
      });
    } else {
      setFormData({
        ...formData,
        motorcycleId: '',
        vehicle: '',
        plate: '',
        type: 'Motocicleta'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const val = parseFloat(formData.value) || 0;

    const dbData = {
      vehicle: formData.vehicle,
      type: formData.type,
      plate: formData.plate.toUpperCase(),
      year: parseInt(formData.year),
      value: val,
      due_date: formData.dueDate,
      status: formData.status
    };

    if (isEditing) {
      const { error } = await supabase
        .from('ipva_records')
        .update(dbData)
        .eq('id', formData.id);

      if (!error) {
        await fetchRecords();
        handleCloseModal();
      } else {
        alert('Erro ao atualizar IPVA: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('ipva_records').insert([dbData]);

      if (!error) {
        await fetchRecords();
        handleCloseModal();
      } else {
        alert('Erro ao criar lançamento de IPVA: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  const handleEdit = (record: IPVARecord) => {
    // Attempt to find matching motorcycle by plate if possible, though strict linking isn't in DB yet
    const matchingMoto = motorcycles.find(m => m.plate === record.plate);

    setFormData({
      id: record.id,
      motorcycleId: matchingMoto ? matchingMoto.id : '',
      vehicle: record.vehicle,
      type: record.type,
      plate: record.plate,
      year: record.year.toString(),
      value: record.value.toString(),
      dueDate: record.dueDate,
      status: record.status
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleMarkAsPaid = async (id: string) => {
    if (confirm('Deseja marcar este IPVA como PAGO?')) {
      const { error } = await supabase
        .from('ipva_records')
        .update({ status: 'paid' })
        .eq('id', id);

      if (!error) {
        fetchRecords();
      } else {
        alert('Erro ao atualizar status: ' + error.message);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setFormData({
      id: '',
      motorcycleId: '',
      vehicle: '',
      type: 'Motocicleta',
      plate: '',
      year: new Date().getFullYear().toString(),
      value: '',
      dueDate: '',
      status: 'pending'
    });
  };

  const filtered = records.filter(r => {
    const matchesSearch = r.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.plate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = selectedMonth ? r.dueDate.startsWith(selectedMonth) : true;
    return matchesSearch && matchesMonth;
  });

  return (
    <div className="space-y-6 pb-8">
      <div>
        <nav className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
          <span className="hover:text-primary cursor-pointer transition-colors">Home</span>
          <span>/</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Financeiro</span>
          <span>/</span>
          <span className="text-slate-900 dark:text-white">IPVA</span>
        </nav>
        <PageHeader
          title="Controle de IPVA"
          description="Gerencie os pagamentos de impostos da frota de veículos."
        >
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">add</span> Novo Lançamento IPVA
          </button>
        </PageHeader>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
            <span className="material-symbols-outlined text-lg">account_balance_wallet</span> Total a Pagar
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border-l-4 border-l-primary border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
              <span className="material-symbols-outlined text-lg text-primary fill">notification_important</span> Vencendo em 30 Dias
            </div>
            <span className="bg-primary/20 text-primary-dark text-[10px] font-black px-2 py-0.5 rounded-full">Automático</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{dueSoonCount}</p>
        </div>
        <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
            <span className="material-symbols-outlined text-lg">check_circle</span> Total Pago
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-end gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buscar Veículo</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Código, Placa ou Modelo..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white"
            />
          </div>
        </div>
        <div className="w-full md:w-64 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mês de Vencimento</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white"
          />
        </div>
        <button
          onClick={() => { setSearchTerm(''); setSelectedMonth(''); }}
          className="w-full md:w-auto px-10 py-3 bg-slate-900 dark:bg-slate-800 text-white dark:text-primary font-black text-sm rounded-2xl hover:bg-black transition-all"
        >
          Limpar Filtros
        </button>
      </div>

      <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-slate-400">
            <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-5 w-12"><input type="checkbox" className="rounded-md border-slate-300 text-primary focus:ring-primary h-5 w-5" /></th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Veículo</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Placa / ID</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Valor</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Vencimento</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Status</th>
                <th className="p-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="p-5"><input type="checkbox" className="rounded-md border-slate-300 text-primary focus:ring-primary h-5 w-5" /></td>
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-2xl">{row.type === 'Motocicleta' ? 'two_wheeler' : 'airport_shuttle'}</span>
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white text-sm">{row.vehicle}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{row.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 font-mono text-sm font-black text-slate-600 dark:text-slate-400">{row.plate}</td>
                  <td className="p-5 font-black text-slate-900 dark:text-white text-sm">R$ {Number(row.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black ${row.status === 'overdue' ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}>
                        {new Date(row.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </span>
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${row.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                      row.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        row.status === 'overdue' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                      <span className="material-symbols-outlined text-sm">{
                        row.status === 'paid' ? 'check' :
                          row.status === 'pending' ? 'warning' :
                            row.status === 'overdue' ? 'error' : 'schedule'
                      }</span>
                      {row.status === 'paid' ? 'Pago' :
                        row.status === 'pending' ? 'Pendente' :
                          row.status === 'overdue' ? 'Atrasado' : 'Em dia'}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {row.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkAsPaid(row.id)}
                          title="Marcar como Pago"
                          className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(row)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400 text-sm">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit IPVA Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? "Editar Lançamento IPVA" : "Novo Lançamento IPVA"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Motocicleta Cadastrada</label>
            <select
              required={!isEditing} // Only required if new, or always required if we want to enforce it
              value={formData.motorcycleId}
              onChange={(e) => handleMotorcycleSelect(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
            >
              <option value="">Selecione a Moto...</option>
              {motorcycles.map(moto => (
                <option key={moto.id} value={moto.id}>
                  {moto.code} - {moto.model} ({moto.plate})
                </option>
              ))}
            </select>
          </div>

          <div>
            {/* Read only info fields to visually confirm selection */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs space-y-1 mb-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Veículo:</span>
                <span className="text-slate-900 dark:text-white font-black">{formData.vehicle || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Placa:</span>
                <span className="text-slate-900 dark:text-white font-black">{formData.plate || '-'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Ano Ref.</label>
              <input
                required
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="2024"
              />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Vencimento</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Atrasado</option>
                <option value="upcoming">A vencer</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex justify-center"
          >
            {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : (isEditing ? 'Atualizar' : 'Salvar')}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default IPVAControl;
