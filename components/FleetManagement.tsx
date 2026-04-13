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
    type: 'moto' as 'moto' | 'carro',
    purchaseValue: '',
    purchaseKm: '',
    clientId: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Maintenance State
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [maintenanceSearch, setMaintenanceSearch] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [newMaintenance, setNewMaintenance] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    value: '',
    km_atual: '',
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
        type: item.type || 'moto',
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
      type: formData.type || 'moto',
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
        alert('Erro ao atualizar veículo: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('motorcycles').insert([dbData]);

      if (!error) {
        await fetchMotorcycles();
        handleCloseModal();
      } else {
        alert('Erro ao criar veículo: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  const handleAddMaintenance = async () => {
    if (!formData.id) return;
    if (!newMaintenance.description || !newMaintenance.value || !newMaintenance.km_atual) {
      alert('KM atual é obrigatório!');
      return;
    }

    const val = parseFloat(newMaintenance.value) || 0;
    const kmVal = parseInt(newMaintenance.km_atual) || 0;

    const { error: maintenanceError } = await supabase.from('motorcycle_maintenance').insert([{
      motorcycle_id: formData.id,
      date: newMaintenance.date,
      description: newMaintenance.description,
      value: val,
      km_atual: kmVal,
      type: newMaintenance.type
    }]);

    if (maintenanceError) {
      alert('Erro ao adicionar registro: ' + maintenanceError.message);
      return;
    }

    if (kmVal > parseInt(formData.km)) {
      await supabase.from('motorcycles').update({ km: kmVal }).eq('id', formData.id);
      fetchMotorcycles();
    }

    await supabase.from('transactions').insert([{
      date: newMaintenance.date,
      description: `${newMaintenance.type === 'credit' ? 'Receita' : 'Manutenção'}: ${newMaintenance.description} (${formData.plate})`,
      value: val,
      type: newMaintenance.type === 'credit' ? 'in' : 'out',
      category: 'LOC MOTTUS'
    }]);

    await fetchMaintenance(formData.id);
    alert('Registro adicionado com sucesso!');
    setNewMaintenance({
      date: new Date().toISOString().split('T')[0],
      description: '',
      value: '',
      km_atual: '',
      type: 'debit'
    });
  };

  const handleDeleteMaintenance = async (id: string) => {
    const password = prompt('Senha para excluir:');
    if (password !== '4859') return;
    const { error } = await supabase.from('motorcycle_maintenance').delete().eq('id', id);
    if (!error) fetchMaintenance(formData.id);
  };

  const handleEdit = (moto: Motorcycle) => {
    setFormData({
      id: moto.id, code: moto.code, model: moto.model, color: moto.color,
      plate: moto.plate, year: moto.year.toString(), status: moto.status,
      km: moto.km.toString(), type: moto.type || 'moto',
      purchaseValue: moto.purchaseValue?.toString() || '',
      purchaseKm: moto.purchaseKm?.toString() || '',
      clientId: moto.clientId || ''
    });
    fetchMaintenance(moto.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setMaintenanceRecords([]);
    setMaintenanceSearch('');
    setFormData({
      id: '', code: '', model: '', color: '', plate: '',
      year: new Date().getFullYear().toString(),
      status: 'available', km: '', type: 'moto',
      purchaseValue: '', purchaseKm: '', clientId: ''
    });
  };

  const filtered = motorcycles.filter(m =>
    m.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMaintenance = maintenanceRecords.filter(rec =>
    rec.description.toLowerCase().includes(maintenanceSearch.toLowerCase())
  );

  const getAvatarColor = (colorName: string) => {
    const c = (colorName || '').toLowerCase();
    if (c.includes('preta')) return 'text-slate-900 dark:text-slate-200';
    if (c.includes('azul')) return 'text-blue-600 dark:text-blue-400';
    if (c.includes('vermelha')) return 'text-red-600 dark:text-red-400';
    if (c.includes('branca')) return 'text-slate-400 dark:text-white';
    return 'text-primary';
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Gerenciar Frota" description="Controle de Veículos LOC MOTTUS">
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">add_circle</span> Cadastrar Veículo
        </button>
      </PageHeader>

      <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 md:px-8 md:py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-black">directions_car</span>
            <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Frota</h3>
          </div>
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Busca por código ou placa..." className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all" />
          </div>
        </div>

        <div className="table-responsive">
          <table className="w-full text-left min-w-[700px] md:min-w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-6 py-4">Detalhes</th>
                <th className="px-6 py-4">Ícone</th>
                <th className="px-6 py-4">Placa</th>
                <th className="px-6 py-4">Status / Cliente</th>
                <th className="px-6 py-4 text-right">KM</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group text-sm">
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-900 dark:text-white uppercase">{m.code} • {m.model}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{m.color} • {m.year}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-12 h-10 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                      <span className={`material-symbols-outlined text-3xl ${getAvatarColor(m.color)}`}>
                        {m.type === 'carro' ? 'directions_car' : 'two_wheeler'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-500 uppercase">{m.plate}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full ${m.status === 'rented' ? 'bg-emerald-100 text-emerald-700' : m.status === 'maintenance' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-700'}`}>
                      {m.status === 'rented' ? 'Alugado' : m.status === 'maintenance' ? 'Oficina' : 'Livre'}
                    </span>
                    {m.status === 'rented' && <p className="text-[10px] font-black text-slate-400 mt-1 uppercase">{m.clientName}</p>}
                  </td>
                  <td className="px-6 py-4 text-right font-black">{m.km.toLocaleString('pt-BR')} KM</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => handleEdit(m)} className="text-slate-200 hover:text-primary transition-colors"><span className="material-symbols-outlined">edit_note</span></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditing ? "Editar Veículo" : "Novo Veículo"}>
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Código</label><input required value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold" /></div>
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Modelo</label><input required value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold" /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tipo</label><select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as any})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold"><option value="moto">Moto</option><option value="carro">Carro</option></select></div>
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Ano</label><input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold" /></div>
              <div className="col-span-2 sm:col-span-1"><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Placa</label><input required value={formData.plate} onChange={(e) => setFormData({...formData, plate: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold uppercase" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cor</label><select value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold"><option value="Preta">Preta</option><option value="Vermelha">Vermelha</option><option value="Azul">Azul</option><option value="Branca">Branca</option></select></div>
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Status</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold"><option value="available">Livre</option><option value="rented">Alugado</option><option value="maintenance">Oficina</option></select></div>
            </div>
            {formData.status === 'rented' && (
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cliente</label><select required value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold"><option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Valor Venda</label><input value={formData.purchaseValue} onChange={(e) => setFormData({...formData, purchaseValue: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold" /></div>
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">KM Compra</label><input type="number" value={formData.purchaseKm} onChange={(e) => setFormData({...formData, purchaseKm: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold" /></div>
              <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">KM Atual</label><input type="number" value={formData.km} onChange={(e) => setFormData({...formData, km: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold" /></div>
            </div>
            <button type="submit" disabled={submitting} className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black uppercase text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"> {submitting ? 'Salvando...' : 'Salvar Alterações'} </button>
          </form>

          {isEditing && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400">Histórico de Manutenção</h4>
                <input value={maintenanceSearch} onChange={(e) => setMaintenanceSearch(e.target.value)} placeholder="Filtrar..." className="px-3 py-1 bg-slate-50 dark:bg-slate-900 rounded-lg text-[9px] font-bold outline-none" />
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl space-y-3 mb-4 border border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input type="date" value={newMaintenance.date} onChange={e => setNewMaintenance({...newMaintenance, date: e.target.value})} className="col-span-full sm:col-span-3 p-2 text-[10px] rounded-lg font-bold outline-none" />
                  <input placeholder="Descritivo" value={newMaintenance.description} onChange={e => setNewMaintenance({...newMaintenance, description: e.target.value})} className="col-span-full sm:col-span-4 p-2 text-[10px] rounded-lg font-bold outline-none border border-transparent focus:border-primary/30" />
                  <input type="number" placeholder="Valor" value={newMaintenance.value} onChange={e => setNewMaintenance({...newMaintenance, value: e.target.value})} className="col-span-4 sm:col-span-2 p-2 text-[10px] rounded-lg font-black outline-none border border-transparent focus:border-primary/30" />
                  <input type="number" placeholder="KM" value={newMaintenance.km_atual} onChange={e => setNewMaintenance({...newMaintenance, km_atual: e.target.value})} className="col-span-4 sm:col-span-2 p-2 text-[10px] rounded-lg font-black outline-none border border-transparent focus:border-primary/30" />
                  <button onClick={() => setNewMaintenance({...newMaintenance, type: newMaintenance.type === 'credit' ? 'debit' : 'credit'})} className={`col-span-4 sm:col-span-1 rounded-lg text-white font-black text-xs ${newMaintenance.type === 'credit' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{newMaintenance.type === 'credit' ? '+' : '-'}</button>
                </div>
                <button onClick={handleAddMaintenance} className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase hover:bg-black transition-all shadow-md">Registrar Registro</button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {filteredMaintenance.map(rec => {
                   const isExpanded = expandedRecordId === rec.id;
                   return (
                     <div 
                        key={rec.id} 
                        onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                        className={`flex flex-col p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-primary/30 transition-all cursor-pointer ${isExpanded ? 'ring-1 ring-primary/20 bg-slate-50/50' : ''}`}
                     >
                       <div className="flex items-center justify-between">
                         <div className="flex flex-col flex-1 min-w-0">
                           <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(rec.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                           <span className={`text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase ${isExpanded ? 'whitespace-normal' : 'truncate max-w-[200px]'}`}>
                             {rec.description}
                           </span>
                         </div>
                         <div className="flex items-center gap-3 ml-4">
                           <div className="text-right whitespace-nowrap">
                             <p className="text-[9px] font-bold text-slate-400">{rec.km_atual} KM</p>
                           </div>
                           <span className={`text-[11px] font-black whitespace-nowrap ${rec.type === 'debit' ? 'text-rose-500' : 'text-emerald-500'}`}> 
                             {rec.type === 'debit' ? '-' : '+'} {Number(rec.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                           </span>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleDeleteMaintenance(rec.id); }} 
                             className="p-1 text-slate-200 hover:text-rose-500 transition-colors"
                           >
                             <span className="material-symbols-outlined text-sm">delete</span>
                           </button>
                         </div>
                       </div>
                       {isExpanded && (
                         <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                           <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed uppercase">
                             {rec.description}
                           </p>
                         </div>
                       )}
                     </div>
                   );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default FleetManagement;
