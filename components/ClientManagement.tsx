import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';

const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Selection
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form States
  const [hasCNH, setHasCNH] = useState(true);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    cpf: '',
    phone: '',
    city: '',
    state: '',
    cnhExpiry: '',
    observation: '',
    status: 'active' as 'active' | 'approved' | 'not_approved' | 'good_history' | 'bad_history'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mappedClients: Client[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        cpf: item.cpf,
        phone: item.phone,
        city: item.city,
        state: item.state,
        cnhExpiry: item.cnh_expiry,
        observation: item.observation,
        status: item.status
      }));
      setClients(mappedClients);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const dbData = {
      name: formData.name,
      cpf: formData.cpf,
      phone: formData.phone,
      city: formData.city,
      state: formData.state,
      cnh_expiry: hasCNH ? formData.cnhExpiry : null,
      observation: formData.observation,
      status: formData.status
    };

    if (isEditing) {
      const { error } = await supabase
        .from('clients')
        .update(dbData)
        .eq('id', formData.id);

      if (!error) {
        await fetchClients();
        handleCloseModal();
      } else {
        alert('Erro ao atualizar cliente: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('clients').insert([dbData]);

      if (!error) {
        await fetchClients();
        handleCloseModal();
      } else {
        alert('Erro ao criar cliente: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  const handleEdit = (client: Client) => {
    setHasCNH(!!client.cnhExpiry);
    setFormData({
      id: client.id,
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      city: client.city,
      state: client.state,
      cnhExpiry: client.cnhExpiry || '',
      observation: client.observation || '',
      status: client.status as any
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleProfile = (client: Client) => {
    setSelectedClient(client);
    setIsProfileModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setHasCNH(true);
    setFormData({
      id: '',
      name: '',
      cpf: '',
      phone: '',
      city: '',
      state: '',
      cnhExpiry: '',
      observation: '',
      status: 'active'
    });
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (!error) {
        fetchClients();
      } else {
        alert('Erro ao excluir cliente: ' + error.message);
      }
    }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'approved': return 'bg-green-500 text-white'; // Green for Approved
      case 'not_approved': return 'bg-red-600 text-white font-black uppercase'; // Red, Bold, Uppercase for Not Approved
      case 'good_history': return 'bg-blue-100 text-blue-700';
      case 'bad_history': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'approved': return 'Aprovado';
      case 'not_approved': return 'NÃO APROVADO';
      case 'good_history': return 'Já foi cliente bom';
      case 'bad_history': return 'Já foi cliente ruim';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Clientes"
        description="Gestão de cadastro de locatários e parceiros."
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">person_add</span> Novo Cliente
        </button>
      </PageHeader>

      <div className="bg-white dark:bg-brand-surface p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white"
          />
        </div>
        <select className="h-12 px-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300">
          <option>Status: Todos</option>
          <option>Ativos</option>
          <option>Aprovados</option>
          <option>Não Aprovados</option>
          <option>Histórico</option>
        </select>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-400">
          <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((client) => (
            <div key={client.id} className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                  <img src={`https://picsum.photos/100/100?random=${client.id}`} alt={client.name} className="w-full h-full object-cover" />
                </div>
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-full ${getStatusColor(client.status)}`}>
                  {getStatusLabel(client.status)}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">{client.name}</h3>
                <p className="text-xs font-mono text-slate-400">{client.cpf}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-sm">phone</span>
                  <span className="text-xs font-bold">{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span className="text-xs font-bold">{client.city} - {client.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-slate-500">calendar_today</span>
                  <span className="text-[10px] font-black uppercase text-slate-400">CNH:</span>
                  <span className={`text-xs font-bold ${client.cnhExpiry && new Date(client.cnhExpiry) < new Date() ? 'text-danger' : 'text-slate-700 dark:text-slate-300'}`}>
                    {client.cnhExpiry ? new Date(client.cnhExpiry).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => handleProfile(client)}
                  className="flex-1 py-2 bg-slate-900 dark:bg-slate-800 text-white dark:text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all"
                >
                  Perfil
                </button>
                <button
                  onClick={() => handleEdit(client)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-xl hover:text-primary transition-all"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button
                  onClick={() => handleDeleteClient(client.id)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-xl hover:text-red-500 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
              <p>Nenhum cliente encontrado.</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? "Editar Cliente" : "Adicionar Novo Cliente"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">CPF</label>
              <input
                required
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
              <input
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Cidade</label>
              <input
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Ex: São Paulo"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
              <input
                required
                maxLength={2}
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="UF"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-500">Validade CNH</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasCNH"
                  checked={!hasCNH}
                  onChange={(e) => setHasCNH(!e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="hasCNH" className="text-xs text-slate-500 cursor-pointer">Não possui CNH</label>
              </div>
            </div>
            <input
              type="date"
              required={hasCNH}
              disabled={!hasCNH}
              value={formData.cnhExpiry}
              onChange={(e) => setFormData({ ...formData, cnhExpiry: e.target.value })}
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all ${!hasCNH ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
            >
              <option value="active">Ativo</option>
              <option value="approved">Aprovado</option>
              <option value="not_approved">NÃO APROVADO</option>
              <option value="good_history">Já foi cliente bom</option>
              <option value="bad_history">Já foi cliente ruim</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Observações</label>
            <textarea
              rows={3}
              value={formData.observation}
              onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
              placeholder="Informações adicionais sobre o cliente..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex justify-center"
          >
            {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : (isEditing ? 'Atualizar Cliente' : 'Cadastrar Cliente')}
          </button>
        </form>
      </Modal>

      {/* Profile Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Perfil do Cliente"
      >
        {selectedClient && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img src={`https://picsum.photos/100/100?random=${selectedClient.id}`} alt={selectedClient.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedClient.name}</h3>
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${getStatusColor(selectedClient.status)}`}>
                  {getStatusLabel(selectedClient.status)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">{selectedClient.cpf}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">{selectedClient.phone}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">{selectedClient.city} - {selectedClient.state}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento CNH</span>
                <p className={`font-bold ${selectedClient.cnhExpiry && new Date(selectedClient.cnhExpiry) < new Date() ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  {selectedClient.cnhExpiry ? new Date(selectedClient.cnhExpiry).toLocaleDateString('pt-BR') : 'N/A'}
                </p>
              </div>
              {selectedClient.observation && (
                <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</span>
                  <p className="font-medium text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{selectedClient.observation}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClientManagement;
