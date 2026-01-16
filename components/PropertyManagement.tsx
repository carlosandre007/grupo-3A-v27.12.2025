import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Property, Client } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { generateReceiptPDF } from '../utils/receiptGenerator';

const PropertyManagement: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [currentMonthPaid, setCurrentMonthPaid] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    id: '',
    code: '',
    description: '',
    address: '',
    value: '',
    tenant: '', // We will use this for storing the NAME (backwards compatibility/display)
    tenantId: '', // For the link
    dueDay: '', // Monthly due date
    status: 'available' as 'rented' | 'available'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped = data.map((item: any) => ({
        id: item.id,
        code: item.code,
        description: item.description,
        address: item.address,
        value: item.value,
        tenant: item.tenant,
        tenantId: item.tenant_id,
        dueDay: item.due_day,
        status: item.status
      }));
      setProperties(mapped);
    }
    setLoading(false);

    // Fetch payments for current month to show status
    const now = new Date();
    const { data: payData } = await supabase
      .from('property_payments')
      .select('property_id')
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear());

    if (payData) {
      const paidMap: Record<string, boolean> = {};
      payData.forEach((p: any) => paidMap[p.property_id] = true);
      setCurrentMonthPaid(paidMap);
    }
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('status', 'active')
      .order('name');

    if (!error && data) {
      setClients(data as Client[]);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const val = parseFloat(formData.value) || 0;

    const selectedClient = clients.find(c => c.id === formData.tenantId);

    const dbData = {
      code: formData.code,
      description: formData.description,
      address: formData.address,
      value: val,
      tenant: formData.status === 'rented' ? (selectedClient?.name || formData.tenant) : null,
      tenant_id: formData.status === 'rented' ? (formData.tenantId || null) : null,
      due_day: formData.status === 'rented' ? (parseInt(formData.dueDay) || null) : null,
      status: formData.status
    };

    if (isEditing) {
      const { error } = await supabase
        .from('properties')
        .update(dbData)
        .eq('id', formData.id);

      if (!error) {
        await fetchProperties();
        handleCloseModal();
      } else {
        alert('Erro ao atualizar imóvel: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('properties').insert([dbData]);

      if (!error) {
        await fetchProperties();
        handleCloseModal();
      } else {
        alert('Erro ao criar imóvel: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  const handleMonthlyPayment = async (p: Property) => {
    if (!p.tenantId) {
      alert('Imóvel sem inquilino vinculado.');
      return;
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Check if already paid
    if (currentMonthPaid[p.id]) {
      alert('Este imóvel já possui pagamento registrado para o mês atual.');
      return;
    }

    if (!confirm(`Confirmar pagamento de R$ ${p.value.toLocaleString()} para o imóvel ${p.code} (${now.toLocaleString('pt-BR', { month: 'long' })}/${year})?`)) return;

    setLoading(true);

    try {
      // 2. Insert into property_payments
      const { error: payError } = await supabase
        .from('property_payments')
        .insert([{
          property_id: p.id,
          tenant_id: p.tenantId,
          amount: p.value,
          date: now.toISOString().split('T')[0],
          month: month,
          year: year
        }]);

      if (payError) throw payError;

      // 3. Insert into transactions (Cash Flow)
      const monthName = now.toLocaleString('pt-BR', { month: 'long' });
      const { error: transError } = await supabase
        .from('transactions')
        .insert([{
          date: now.toISOString().split('T')[0],
          description: `Aluguel - ${p.description} - ${monthName}/${year}`,
          value: p.value,
          type: 'in',
          category: 'Aluguel'
        }]);

      if (transError) throw transError;

      // 4. Generate PDF Receipt
      generateReceiptPDF({
        propertyCode: p.code,
        propertyDescription: p.description,
        propertyAddress: p.address,
        tenantName: p.tenant || 'Inquilino',
        amount: p.value,
        month: month.toString().padStart(2, '0'),
        year: year,
        date: now.toLocaleDateString('pt-BR')
      });

      // 5. Update UI
      setCurrentMonthPaid(prev => ({ ...prev, [p.id]: true }));
      alert('Pagamento registrado com sucesso! O recibo foi gerado.');

      // 6. Offer WhatsApp/Email
      const msg = encodeURIComponent(`Olá ${p.tenant}, aqui está o seu recibo de aluguel referente a ${monthName}/${year}.`);
      const client = clients.find(c => c.id === p.tenantId);
      const phone = client?.phone.replace(/\D/g, '') || '';

      if (confirm('Deseja enviar a confirmação por WhatsApp?')) {
        window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
      }

    } catch (err: any) {
      alert('Erro ao processar pagamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewHistory = async (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const { data, error } = await supabase
      .from('property_payments')
      .select('*')
      .eq('property_id', propertyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (!error && data) {
      setPayments(data);
      setIsHistoryModalOpen(true);
    }
  };

  const handleEdit = (p: Property) => {
    setFormData({
      id: p.id,
      code: p.code,
      description: p.description,
      address: p.address,
      value: p.value.toString(),
      tenant: p.tenant || '',
      tenantId: p.tenantId || '',
      dueDay: p.dueDay?.toString() || '',
      status: p.status
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setFormData({
      id: '',
      code: '',
      description: '',
      address: '',
      value: '',
      tenant: '',
      tenantId: '',
      dueDay: '',
      status: 'available'
    });
  };

  const filtered = properties.filter(p =>
    p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Imóveis"
        description="Gerencie propriedades, inquilinos e contratos."
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">add</span> Novo Imóvel
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-brand-surface p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por endereço, código ou inquilino"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white"
              />
            </div>
            <select className="h-12 px-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300">
              <option>Status: Todos</option>
              <option>Alugado</option>
              <option>Disponível</option>
            </select>
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
                    <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Código</th>
                    <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Imóvel</th>
                    <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Inquilino</th>
                    <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Venc.</th>
                    <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Valor</th>
                    <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Status</th>
                    <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => handleEdit(p)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="p-5 font-mono text-sm font-black text-slate-500">{p.code}</td>
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{p.description}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{p.address}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        {p.tenant ? (
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                              {p.tenant.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{p.tenant}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-sm">-</span>
                        )}
                      </td>
                      <td className="p-5">
                        {p.dueDay ? (
                          <span className="text-xs font-black text-slate-600 dark:text-slate-400">Dia {p.dueDay}</span>
                        ) : (
                          <span className="text-slate-300 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="p-5 text-sm font-black text-slate-900 dark:text-white">R$ {Number(p.value).toLocaleString()}</td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${p.status === 'rented' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                          }`}>
                          {p.status === 'rented' ? 'Alugado' : 'Disponível'}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-2">
                          {p.status === 'rented' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMonthlyPayment(p); }}
                              disabled={currentMonthPaid[p.id]}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 ${currentMonthPaid[p.id]
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-primary text-slate-900 hover:scale-105 active:scale-95 shadow-sm'
                                }`}
                            >
                              <span className="material-symbols-outlined text-sm">payments</span>
                              {currentMonthPaid[p.id] ? 'Pago' : 'Pago mês corrente'}
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); viewHistory(p.id); }}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            title="Ver Histórico"
                          >
                            <span className="material-symbols-outlined text-sm">history</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400 text-sm">
                        Nenhum imóvel encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Property Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? "Editar Imóvel" : "Cadastrar Imóvel"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Código</label>
            <input
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Ex: IM-01"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
            <input
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Ex: Apartamento Centro"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Endereço</label>
            <input
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Endereço completo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Valor</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="R$"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="available">Disponível</option>
                <option value="rented">Alugado</option>
              </select>
            </div>
          </div>

          {formData.status === 'rented' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Inquilino</label>
                <select
                  required
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="">Selecione o Inquilino...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Dia de Vencimento</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dueDay}
                  onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Ex: 10"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex justify-center"
          >
            {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : (isEditing ? 'Atualizar Imóvel' : 'Cadastrar Imóvel')}
          </button>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Histórico de Pagamentos"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Pagamentos Registrados</h4>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map(pay => (
                  <div key={pay.id} className="flex items-center justify-between p-3 bg-white dark:bg-brand-surface rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {new Date(pay.year, pay.month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">Pago em {new Date(pay.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-success">R$ {Number(pay.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-slate-400 text-sm">Nenhum pagamento registrado ainda.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PropertyManagement;
