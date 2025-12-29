import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Motorcycle, Client } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';

const FleetManagement: React.FC = () => {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    id: '',
    code: '',
    model: '',
    color: '',
    plate: '',
    year: new Date().getFullYear().toString(),
    status: 'available' as 'available' | 'rented' | 'maintenance',
    km: '',
    // photoUrl removed
    purchaseValue: '',
    purchaseKm: '',
    clientId: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Maintenance State
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [newMaintenance, setNewMaintenance] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    value: '',
    type: 'debit' as 'credit' | 'debit' // credit = receita, debit = despesa
  });
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const fetchMotorcycles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('motorcycles')
      .select('*')
      .order('code', { ascending: true });

    if (!error && data) {
      const mapped = data.map((item: any) => ({
        id: item.id,
        code: item.code,
        model: item.model,
        color: item.color,
        plate: item.plate,
        year: item.year,
        status: item.status,
        km: item.km,
        purchaseValue: item.purchase_value,
        purchaseKm: item.purchase_km,
        clientId: item.client_id,
        clientName: item.client_name
      }));
      setMotorcycles(mapped);
    }
    setLoading(false);
  };

  const fetchMaintenance = async (motoId: string) => {
    setMaintenanceLoading(true);
    const { data, error } = await supabase
      .from('motorcycle_maintenance')
      .select('*')
      .eq('motorcycle_id', motoId)
      .order('date', { ascending: false });

    if (!error && data) {
      setMaintenanceRecords(data);
    } else {
      setMaintenanceRecords([]);
    }
    setMaintenanceLoading(false);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .order('name');

    if (!error && data) {
      setClients(data as Client[]);
    }
  };

  useEffect(() => {
    fetchMotorcycles();
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const dbData = {
      code: formData.code,
      model: formData.model,
      color: formData.color,
      plate: formData.plate.toUpperCase(),
      year: parseInt(formData.year),
      status: formData.status,
      km: parseInt(formData.km),
      purchase_value: formData.purchaseValue ? parseFloat(formData.purchaseValue) : 0,
      purchase_km: formData.purchaseKm ? parseInt(formData.purchaseKm) : 0,
      client_id: formData.status === 'rented' ? (formData.clientId || null) : null,
      client_name: formData.status === 'rented' ? (clients.find(c => c.id === formData.clientId)?.name || null) : null
    };

    if (isEditing) {
      const { error } = await supabase
        .from('motorcycles')
        .update(dbData)
        .eq('id', formData.id);

      if (!error) {
        await fetchMotorcycles();
        handleCloseModal();
      } else {
        alert('Erro ao atualizar moto: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('motorcycles').insert([dbData]);

      if (!error) {
        await fetchMotorcycles();
        handleCloseModal();
      } else {
        alert('Erro ao criar moto: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  const handleAddMaintenance = async () => {
    if (!formData.id) return; // Should not happen if editing
    if (!newMaintenance.description || !newMaintenance.value) {
      alert('Preencha descrição e valor.');
      return;
    }

    const val = parseFloat(newMaintenance.value) || 0;

    const { error } = await supabase.from('motorcycle_maintenance').insert([{
      motorcycle_id: formData.id,
      date: newMaintenance.date,
      description: newMaintenance.description,
      value: val,
      type: newMaintenance.type
    }]);

    if (!error) {
      await fetchMaintenance(formData.id);
      setNewMaintenance({
        date: new Date().toISOString().split('T')[0],
        description: '',
        value: '',
        type: 'debit'
      });
    } else {
      alert('Erro ao adicionar registro: ' + error.message);
    }
  };

  const handleDeleteMaintenance = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    const { error } = await supabase.from('motorcycle_maintenance').delete().eq('id', id);
    if (!error) {
      fetchMaintenance(formData.id);
    }
  };

  const handleEdit = (moto: Motorcycle) => {
    setFormData({
      id: moto.id,
      code: moto.code,
      model: moto.model,
      color: moto.color,
      plate: moto.plate,
      year: moto.year.toString(),
      status: moto.status,
      km: moto.km.toString(),
      purchaseValue: moto.purchaseValue?.toString() || '',
      purchaseKm: moto.purchaseKm?.toString() || '',
      clientId: moto.clientId || ''
    });
    fetchMaintenance(moto.id); // Fetch records for this moto
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setMaintenanceRecords([]);
    setFormData({
      id: '',
      code: '',
      model: '',
      color: '',
      plate: '',
      year: new Date().getFullYear().toString(),
      status: 'available',
      km: '',
      purchaseValue: '',
      purchaseKm: '',
      clientId: ''
    });
  };

  const filtered = motorcycles.filter(m =>
    m.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to map color text to CSS color class or hex
  const getAvatarColor = (colorName: string) => {
    const c = colorName.toLowerCase();
    if (c.includes('preta') || c.includes('preto')) return 'text-slate-900 dark:text-slate-200';
    if (c.includes('azul')) return 'text-blue-600 dark:text-blue-400';
    if (c.includes('vermelha') || c.includes('vermelho')) return 'text-red-600 dark:text-red-400';
    if (c.includes('branca') || c.includes('branco')) return 'text-slate-400 dark:text-white';
    if (c.includes('prata')) return 'text-slate-400';
    return 'text-primary';
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Gerenciar Frota"
        description="Controle de motocicletas LOC MOTTUS"
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span> Cadastrar Motocicleta
        </button>
      </PageHeader>

      <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-black">list_alt</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Frota Atual</h3>
          </div>
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa ou modelo..."
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center text-slate-400">
            <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Veículo</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Placa</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest pl-10">Status / Cliente</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">KM</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-black text-slate-900 dark:text-white leading-none">{m.code}</span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{m.model}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{m.color} • {m.year}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-16 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                        <span className={`material-symbols-outlined text-4xl ${getAvatarColor(m.color)}`}>
                          two_wheeler
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{m.plate}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${m.status === 'rented' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          m.status === 'maintenance' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          {m.status === 'rented' ? 'Alugada' : m.status === 'maintenance' ? 'Manutenção' : 'Disponível'}
                        </span>
                        {m.status === 'rented' && m.clientName && (
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded ml-1">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            {m.clientName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-700 dark:text-slate-300">
                      {m.km.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400">km</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(m)}
                        className="text-slate-300 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined font-black">edit_note</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">
                      Nenhuma motocicleta encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Motorcycle Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? "Editar Motocicleta" : "Cadastrar Nova Motocicleta"}
      >
        <div className="space-y-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Código</label>
                <input
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Ex: M001"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Modelo</label>
                <input
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Ex: Honda CG 160"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Ano</label>
                <input
                  required
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="2024"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Placa</label>
                <input
                  required
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all uppercase"
                  placeholder="ABC-1234"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cor</label>
                <select
                  required
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="Preta">Preta</option>
                  <option value="Vermelha">Vermelha</option>
                  <option value="Azul">Azul</option>
                  <option value="Branca">Branca</option>
                  <option value="Prata">Prata</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="available">Disponível</option>
                  <option value="rented">Alugada</option>
                  <option value="maintenance">Manutenção</option>
                </select>
              </div>
            </div>

            {formData.status === 'rented' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cliente Responsável</label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="">Selecione o Cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor Compra</label>
                <input
                  value={formData.purchaseValue}
                  onChange={(e) => setFormData({ ...formData, purchaseValue: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">KM Compra</label>
                <input
                  type="number"
                  value={formData.purchaseKm}
                  onChange={(e) => setFormData({ ...formData, purchaseKm: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">KM Atual</label>
                <input
                  required
                  type="number"
                  value={formData.km}
                  onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center"
            >
              {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : (isEditing ? 'Atualizar Moto' : 'Cadastrar Moto')}
            </button>
          </form>

          {isEditing && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4">Diário de Manutenção / Receitas</h4>

              {/* Form de Adição Rapida */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-3 mb-4">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <input
                      type="date"
                      value={newMaintenance.date}
                      onChange={e => setNewMaintenance({ ...newMaintenance, date: e.target.value })}
                      className="w-full p-2 text-xs rounded-lg border-none"
                    />
                  </div>
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Descrição (ex: Troca de óleo, Semanal)"
                      value={newMaintenance.description}
                      onChange={e => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                      className="w-full p-2 text-xs rounded-lg border-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="R$ 0,00"
                      value={newMaintenance.value}
                      onChange={e => setNewMaintenance({ ...newMaintenance, value: e.target.value })}
                      className="w-full p-2 text-xs rounded-lg border-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => setNewMaintenance({
                        ...newMaintenance,
                        type: newMaintenance.type === 'credit' ? 'debit' : 'credit'
                      })}
                      className={`w-full h-full rounded-lg flex items-center justify-center text-white font-bold transition-colors ${newMaintenance.type === 'credit' ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      <span className="material-symbols-outlined text-sm">{newMaintenance.type === 'credit' ? 'add' : 'remove'}</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAddMaintenance}
                  className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
                >
                  Adicionar Registro
                </button>
              </div>

              {/* Lista */}
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {maintenanceLoading ? (
                  <p className="text-center text-xs text-slate-400">Carregando...</p>
                ) : maintenanceRecords.length > 0 ? (
                  maintenanceRecords.map(rec => (
                    <div key={rec.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-xs">
                      <span className="text-slate-400 font-mono">{new Date(rec.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                      <span className="flex-1 px-4 font-bold text-slate-700 dark:text-slate-300">{rec.description}</span>
                      <span className={`font-black ${rec.type === 'debit' ? 'text-red-500' : 'text-green-500'}`}>
                        {rec.type === 'debit' ? '-' : '+'} R$ {Number(rec.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button onClick={() => handleDeleteMaintenance(rec.id)} className="ml-3 text-slate-300 hover:text-red-500">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-4">Nenhum registro encontrado.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default FleetManagement;
