import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client, Motorcycle, Property, ClientAsset } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';

interface ClientManagementProps {
  initialSelectedClientId?: string;
  onProfileShown?: () => void;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ initialSelectedClientId, onProfileShown }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Selection
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientAssets, setClientAssets] = useState<ClientAsset[]>([]); // Current profile/modal assets
  const [allLinkedAssets, setAllLinkedAssets] = useState<ClientAsset[]>([]); // All assets for all clients (for cards)
  const [availableMotorcycles, setAvailableMotorcycles] = useState<Motorcycle[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [assetTypeFilter, setAssetTypeFilter] = useState<'veiculo' | 'imovel' | 'loja' | 'all'>('all');

  // Form States
  const [hasCNH, setHasCNH] = useState(true);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    cpf: '',
    phone: '',
    city: '',
    state: '',
    cnh: '',
    cnh_validade: '',
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
        cnh: item.cnh || item.cnh_numero || '',
        cnh_validade: item.cnh_validade || item.cnh_expiry || item.cnhExpiry || '',
        observation: item.observation,
        status: item.status
      }));

      // Sort: Active first, then others
      const sorted = mappedClients.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return 0; // Keep original order (created_at desc) for the rest
      });

      setClients(sorted);
    }

    // Fetch all linked assets for card display
    const { data: allLinks } = await supabase.from('cliente_ativos').select('*');
    if (allLinks) {
      setAllLinkedAssets(allLinks);
    }

    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      await fetchClients();
      await fetchAvailableAssets();

      if (initialSelectedClientId) {
        // Find the client in the current list
        const client = clients.find(c => c.id === initialSelectedClientId);
        if (client) {
          handleProfile(client);
          if (onProfileShown) onProfileShown();
        } else {
          // If not in current list (maybe pagination/loading), fetch specifically
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', initialSelectedClientId)
            .single();

          if (!error && data) {
            const mapped: Client = {
              id: data.id,
              name: data.name,
              cpf: data.cpf,
              phone: data.phone,
              city: data.city,
              state: data.state,
              cnh: data.cnh || data.cnh_numero || '',
              cnh_validade: data.cnh_validade || data.cnh_expiry || data.cnhExpiry || '',
              observation: data.observation,
              status: data.status
            };
            handleProfile(mapped);
            if (onProfileShown) onProfileShown();
          }
        }
      }
    };
    init();
  }, [initialSelectedClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const dbData = {
      name: formData.name,
      cpf: formData.cpf,
      phone: formData.phone,
      city: formData.city,
      state: formData.state,
      cnh: hasCNH ? formData.cnh : null,
      cnh_validade: hasCNH ? formData.cnh_validade : null,
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

  const handleEdit = async (client: Client) => {
    setHasCNH(!!client.cnh_validade);
    setFormData({
      id: client.id,
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      city: client.city,
      state: client.state,
      cnh: client.cnh || '',
      cnh_validade: client.cnh_validade || '',
      observation: client.observation || '',
      status: client.status as any
    });
    setSelectedClient(client);
    setIsEditing(true);
    setIsModalOpen(true);
    if (client.status === 'active') {
      await fetchClientAssets(client.id);
      await fetchAvailableAssets();
    }
  };

  const fetchClientAssets = async (clientId: string) => {
    const { data, error } = await supabase
      .from('cliente_ativos')
      .select('*')
      .eq('cliente_id', clientId);
    if (!error && data) {
      setClientAssets(data);
    }
  };

  const fetchAvailableAssets = async () => {
    // Fetch all motorcycles
    const { data: motos } = await supabase.from('motorcycles').select('*');
    if (motos) {
      setAvailableMotorcycles(motos.map((item: any) => ({
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
        clientName: item.client_name,
        type: item.type || 'moto'
      })));
    }

    // Fetch all properties
    const { data: props } = await supabase.from('properties').select('*');
    if (props) {
      setAvailableProperties(props.map((item: any) => ({
        id: item.id,
        code: item.code,
        description: item.description,
        address: item.address,
        value: item.value,
        tenant: item.tenant,
        tenantId: item.tenant_id,
        dueDay: item.due_day,
        status: item.status,
        tipo: item.tipo
      })));
    }
  };

  const handleProfile = async (client: Client) => {
    setSelectedClient(client);
    setIsProfileModalOpen(true);
    await fetchClientAssets(client.id);
    await fetchAvailableAssets();
  };

  const handleLinkAsset = async (ativoId: string, tipo: 'veiculo' | 'imovel') => {
    if (!selectedClient) return;

    // Check for duplicate
    const exists = clientAssets.some(a => a.ativo_id === ativoId && a.tipo === tipo);
    if (exists) {
      alert('Este ativo já está vinculado a este cliente.');
      return;
    }

    const { error } = await supabase.from('cliente_ativos').insert([{
      cliente_id: selectedClient.id,
      ativo_id: ativoId,
      tipo: tipo
    }]);

    if (!error) {
      await Promise.all([
        fetchClients(),
        selectedClient ? fetchClientAssets(selectedClient.id) : Promise.resolve()
      ]);
      setIsAssetSelectorOpen(false);
    } else {
      alert('Erro ao vincular ativo: ' + error.message);
    }
  };

  const handleUnlinkAsset = async (id: string) => {
    const password = prompt('Digite a senha para confirmar a remoção do vínculo:');
    if (password !== '4859') {
      if (password !== null) alert('Senha incorreta!');
      return;
    }
    const { error } = await supabase.from('cliente_ativos').delete().eq('id', id);
    if (!error && selectedClient) {
      await Promise.all([
        fetchClients(),
        fetchClientAssets(selectedClient.id)
      ]);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setHasCNH(true);
    setSelectedClient(null);
    setClientAssets([]);
    setFormData({
      id: '',
      name: '',
      cpf: '',
      phone: '',
      city: '',
      state: '',
      cnh: '',
      cnh_validade: '',
      observation: '',
      status: 'active'
    });
  };

  const handleDeleteClient = async (id: string) => {
    const password = prompt('Digite a senha para confirmar a exclusão do cliente:');
    if (password !== '4859') {
      if (password !== null) alert('Senha incorreta!');
      return;
    }
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) {
      fetchClients();
    } else {
      alert('Erro ao excluir cliente: ' + error.message);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((client) => {
            const isCnhExpired = client.cnh_validade && new Date(client.cnh_validade) < new Date();
            return (
              <div key={client.id} className={`bg-white dark:bg-brand-surface p-4 rounded-3xl shadow-sm border ${isCnhExpired ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30 dark:bg-red-900/10' : 'border-slate-100 dark:border-slate-800'} hover:shadow-xl transition-all group relative overflow-hidden`}>
                {isCnhExpired && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-red-600 text-white text-[8px] font-black px-4 py-1 rotate-45 translate-x-3 translate-y-1 shadow-md uppercase tracking-tighter">
                      Vencida
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                      <img src={`https://picsum.photos/80/80?random=${client.id}`} alt={client.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>

                    {/* Ativos Vinculados ao lado da foto */}
                    <div className="flex flex-wrap gap-1.5">
                      {allLinkedAssets.filter(a => a.cliente_id === client.id).map(asset => {
                        const isMoto = asset.tipo === 'veiculo';
                        const motoItem = isMoto ? availableMotorcycles.find(m => m.id === asset.ativo_id) : null;
                        const propItem = !isMoto ? availableProperties.find(p => p.id === asset.ativo_id) : null;

                        const finalTipo = propItem?.tipo || asset.tipo;
                        const isLoja = finalTipo === 'loja';
                        const item = isMoto ? motoItem : propItem;
                        if (!item) return null;

                        const isCarro = isMoto && (item as Motorcycle).type === 'carro';
                        const icon = isCarro ? 'directions_car' : isMoto ? 'directions_bike' : isLoja ? 'store' : 'home';
                        const bgColor = isCarro
                          ? 'bg-blue-600 text-white border-blue-700 shadow-blue-200/50'
                          : isMoto
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-200/50'
                          : isLoja
                            ? 'bg-rose-600 text-white border-rose-700 shadow-rose-200/50'
                            : 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-200/50';

                        return (
                          <div key={asset.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm text-[9px] font-black uppercase tracking-tight ${bgColor} animate-in fade-in zoom-in duration-300`}>
                            <span className="material-symbols-outlined text-[14px]">{icon}</span>
                            {isMoto ? (item as Motorcycle).code : (item as Property).code}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <span className={`shrink-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full ${getStatusColor(client.status)}`}>
                    {getStatusLabel(client.status)}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">{client.name}</h3>
                    {isCnhExpired && <span className="material-symbols-outlined text-red-600 text-sm animate-pulse">warning</span>}
                  </div>
                  <p className="text-xs font-mono text-slate-400">{client.cpf}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 space-y-2">
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
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {client.cnh || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-slate-500">event</span>
                    <span className="text-[10px] font-black uppercase text-slate-400">Validade:</span>
                    <span className={`text-xs font-bold ${client.cnh_validade && new Date(client.cnh_validade) < new Date() ? 'text-danger' : 'text-slate-700 dark:text-slate-300'}`}>
                      {client.cnh_validade ? new Date(client.cnh_validade).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}
                    </span>
                  </div>

                  {/* Info Row replaced the asset badges location */}
                </div>

                <div className="mt-4 flex gap-2">
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
            );
          })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-500">Número da CNH</label>
              </div>
              <input
                required={hasCNH}
                disabled={!hasCNH}
                value={formData.cnh}
                onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all ${!hasCNH ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="00000000000"
              />
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
                  <label htmlFor="hasCNH" className="text-xs text-slate-500 cursor-pointer">Não possui</label>
                </div>
              </div>
              <input
                type="date"
                required={hasCNH}
                disabled={!hasCNH}
                value={formData.cnh_validade}
                onChange={(e) => setFormData({ ...formData, cnh_validade: e.target.value })}
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all ${!hasCNH ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
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

          {/* Ativos Vinculados Section - For Existing Active Clients in Edit Mode */}
          {isEditing && formData.status === 'active' && selectedClient && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">inventory_2</span> Ativos Vinculados
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAssetSelectorOpen(!isAssetSelectorOpen)}
                  className="px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary hover:text-slate-900 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Adicionar Ativo
                </button>
              </div>

              {/* Asset Selector Area */}
              {isAssetSelectorOpen && (
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-primary/20 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-2">
                    {['all', 'veiculo', 'imovel', 'loja'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAssetTypeFilter(type as any)}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${assetTypeFilter === type ? 'bg-slate-900 dark:bg-primary text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900/50 text-slate-500'}`}
                      >
                        {type === 'all' ? 'Todos' : type === 'veiculo' ? 'Veículos' : type === 'imovel' ? 'Imóveis' : 'Lojas'}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                    {(assetTypeFilter === 'all' || assetTypeFilter === 'veiculo') && availableMotorcycles.map(moto => (
                      <button
                        key={moto.id}
                        type="button"
                        onClick={() => handleLinkAsset(moto.id, 'veiculo')}
                        className="w-full p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl flex items-center justify-between group transition-all"
                      >
                        <div className="flex items-center gap-2 text-left">
                          <span className="material-symbols-outlined text-lg text-slate-400 group-hover:text-primary">
                            {moto.type === 'carro' ? 'directions_car' : 'directions_bike'}
                          </span>
                          <div>
                            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">{moto.code}</p>
                            <p className="text-[9px] text-slate-400 font-bold">{moto.model}</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-sm text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all">add_circle</span>
                      </button>
                    ))}

                    {(assetTypeFilter === 'all' || assetTypeFilter === 'imovel' || assetTypeFilter === 'loja') && availableProperties.map(prop => (
                      <div key={prop.id} className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl group transition-all">
                        <div className="flex items-center gap-2 text-left">
                          <span className="material-symbols-outlined text-lg text-slate-400 group-hover:text-blue-500">domain</span>
                          <div>
                            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">{prop.code}</p>
                            <p className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">{prop.address}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {(assetTypeFilter === 'all' || assetTypeFilter === 'imovel') && (
                            <button
                              type="button"
                              onClick={() => handleLinkAsset(prop.id, 'imovel')}
                              className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all"
                            >
                              Casa
                            </button>
                          )}
                          {(assetTypeFilter === 'all' || assetTypeFilter === 'loja') && (
                            <button
                              type="button"
                              onClick={() => handleLinkAsset(prop.id, 'loja')}
                              className="px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-[8px] font-black uppercase hover:bg-orange-500 hover:text-white transition-all"
                            >
                              Loja
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Assets List */}
              <div className="grid grid-cols-1 gap-2">
                {clientAssets.length === 0 ? (
                  <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-slate-400">Nenhum ativo vinculado.</p>
                  </div>
                ) : (
                  clientAssets.map(asset => {
                    const isMoto = asset.tipo === 'veiculo';
                    const item = isMoto
                      ? availableMotorcycles.find(m => m.id === asset.ativo_id)
                      : availableProperties.find(p => p.id === asset.ativo_id);

                    if (!item) return null;

                    return (
                      <div key={asset.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${isMoto ? 'bg-primary/10 text-primary' : asset.tipo === 'loja' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            <span className="material-symbols-outlined text-lg">
                              {isMoto ? ((item as Motorcycle).type === 'carro' ? 'directions_car' : 'directions_bike') : asset.tipo === 'loja' ? 'store' : 'home'}
                            </span>
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white">
                              {isMoto ? (item as Motorcycle).code : (item as Property).code}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold">
                              {isMoto ? (item as Motorcycle).model : (item as Property).description}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnlinkAsset(asset.id)}
                          className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 text-slate-300 hover:text-red-500 shadow-sm border border-slate-100 dark:border-slate-700 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-lg">link_off</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

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
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número CNH</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">{selectedClient.cnh || 'N/A'}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento CNH</span>
                <p className={`font-bold ${selectedClient.cnh_validade && new Date(selectedClient.cnh_validade) < new Date() ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  {selectedClient.cnh_validade ? new Date(selectedClient.cnh_validade).toLocaleDateString('pt-BR') : 'N/A'}
                </p>
              </div>
              {selectedClient.observation && (
                <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</span>
                  <p className="font-medium text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{selectedClient.observation}</p>
                </div>
              )}

              {/* Ativos Vinculados Section - Only for Active Clients */}
              {selectedClient.status === 'active' && (
                <div className="col-span-2 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">inventory_2</span> Ativos Vinculados
                    </h4>
                    <button
                      onClick={() => setIsAssetSelectorOpen(!isAssetSelectorOpen)}
                      className="px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary hover:text-slate-900 transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Adicionar Ativo
                    </button>
                  </div>

                  {/* Asset Selector Dropdown/Modal Area */}
                  {isAssetSelectorOpen && (
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-primary/20 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex gap-2">
                        {['all', 'veiculo', 'imovel', 'loja'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setAssetTypeFilter(type as any)}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${assetTypeFilter === type ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {type === 'all' ? 'Todos' : type === 'veiculo' ? 'Veículos' : type === 'imovel' ? 'Imóveis' : 'Lojas'}
                          </button>
                        ))}
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                        {(assetTypeFilter === 'all' || assetTypeFilter === 'veiculo') && availableMotorcycles.map(moto => (
                          <button
                            key={moto.id}
                            onClick={() => handleLinkAsset(moto.id, 'veiculo')}
                            className="w-full p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg text-slate-400 group-hover:text-primary">
                                {moto.type === 'carro' ? 'directions_car' : 'directions_bike'}
                              </span>
                              <div className="text-left">
                                <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">{moto.code}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{moto.model}</p>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-sm text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all">add_circle</span>
                          </button>
                        ))}

                        {(assetTypeFilter === 'all' || assetTypeFilter === 'imovel' || assetTypeFilter === 'loja') && availableProperties.map(prop => (
                          <div key={prop.id} className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl group transition-all">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg text-slate-400 group-hover:text-blue-500">domain</span>
                              <div className="text-left">
                                <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">{prop.code}</p>
                                <p className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">{prop.address}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {(assetTypeFilter === 'all' || assetTypeFilter === 'imovel') && (
                                <button
                                  onClick={() => handleLinkAsset(prop.id, 'imovel')}
                                  className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all"
                                >
                                  Casa
                                </button>
                              )}
                              {(assetTypeFilter === 'all' || assetTypeFilter === 'loja') && (
                                <button
                                  onClick={() => handleLinkAsset(prop.id, 'loja')}
                                  className="px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-[8px] font-black uppercase hover:bg-orange-500 hover:text-white transition-all"
                                >
                                  Loja
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    {clientAssets.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                        <p className="text-[10px] font-bold text-slate-400">Nenhum ativo vinculado a este cliente.</p>
                      </div>
                    ) : (
                      clientAssets.map(asset => {
                        const isMoto = asset.tipo === 'veiculo';
                        const item = isMoto
                          ? availableMotorcycles.find(m => m.id === asset.ativo_id)
                          : availableProperties.find(p => p.id === asset.ativo_id);

                        if (!item) return null;

                        return (
                          <div key={asset.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isMoto ? 'bg-primary/10 text-primary' : asset.tipo === 'loja' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                <span className="material-symbols-outlined text-xl">
                                  {isMoto ? ((item as Motorcycle).type === 'carro' ? 'directions_car' : 'directions_bike') : asset.tipo === 'loja' ? 'store' : 'home'}
                                </span>
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-900 dark:text-white">
                                  {isMoto ? (item as Motorcycle).code : (item as Property).code}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold">
                                  {isMoto ? (item as Motorcycle).model : (item as Property).description}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnlinkAsset(asset.id)}
                              className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 text-slate-300 hover:text-red-500 shadow-sm border border-slate-100 dark:border-slate-700 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <span className="material-symbols-outlined text-lg">link_off</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
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
