import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MaintenanceAlert } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';

const AlertsView: React.FC = () => {
    const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<Partial<MaintenanceAlert>>({
        type: 'vehicle',
        related_item: '',
        description: '',
        due_date: '',
        due_km: undefined,
        status: 'active'
    });

    const fetchAlerts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('maintenance_alerts')
            .select('*')
            .order('due_date', { ascending: true });

        if (!error && data) {
            setAlerts(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (isEditing && formData.id) {
            const { error } = await supabase
                .from('maintenance_alerts')
                .update(formData)
                .eq('id', formData.id);

            if (!error) {
                alert('Alerta de manutenção atualizado!');
                await fetchAlerts();
                handleCloseModal();
            } else {
                alert('Erro ao atualizar alerta: ' + error.message);
            }
        } else {
            const { error } = await supabase
                .from('maintenance_alerts')
                .insert([formData]);

            if (!error) {
                alert('Alerta de manutenção criado!');
                await fetchAlerts();
                handleCloseModal();
            } else {
                alert('Erro ao criar alerta: ' + error.message);
            }
        }
        setSubmitting(false);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditing(false);
        setFormData({
            type: 'vehicle',
            related_item: '',
            description: '',
            due_date: '',
            due_km: undefined,
            status: 'active'
        });
    };

    const resolveAlert = async (alert: MaintenanceAlert) => {
        const { error } = await supabase
            .from('maintenance_alerts')
            .update({ status: 'resolved' })
            .eq('id', alert.id);

        if (!error) {
            // Integration: Add to Shopping Cart?
            // For now, just update list
            fetchAlerts();
        }
    };

    const isOverdue = (alert: MaintenanceAlert) => {
        if (alert.status === 'resolved') return false;
        if (alert.due_date) {
            return new Date(alert.due_date) < new Date();
        }
        return false;
    };

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                title="Alertas de Manutenção"
                description="Controle e acompanhamento de manutenções preventivas."
            >
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-xl">add_alert</span> Novo Alerta
                </button>
            </PageHeader>

            <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">notifications_active</span>
                        Alertas Ativos
                    </h3>
                </div>

                {loading ? (
                    <div className="p-10 flex justify-center">
                        <span className="material-symbols-outlined animate-spin text-3xl text-slate-400">sync</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Limite</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {alerts.map((alert) => (
                                    <tr key={alert.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOverdue(alert) ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${alert.type === 'vehicle' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                {alert.type === 'vehicle' ? 'Veículo' : 'Imóvel'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white uppercase">{alert.related_item}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{alert.description}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {alert.due_date ? new Date(alert.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : alert.due_km ? `${alert.due_km} KM` : '-'}
                                            {isOverdue(alert) && (
                                                <span className="ml-2 inline-flex items-center text-[10px] font-black text-danger animate-pulse">
                                                    <span className="material-symbols-outlined text-xs mr-1">warning</span> VENCIDO
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${alert.status === 'active' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                {alert.status === 'active' ? 'Ativo' : 'Resolvido'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {alert.status === 'active' && (
                                                <button
                                                    onClick={() => resolveAlert(alert)}
                                                    className="px-3 py-1.5 bg-success text-white rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all"
                                                >
                                                    Resolver
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title="Cadastrar Alerta"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 outline-none"
                            >
                                <option value="vehicle">Veículo</option>
                                <option value="property">Imóvel</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Item (Placa/Código)</label>
                            <input
                                required
                                value={formData.related_item}
                                onChange={(e) => setFormData({ ...formData, related_item: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 outline-none uppercase"
                                placeholder="ABC-1234"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Descrição da Manutenção</label>
                        <textarea
                            required
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 outline-none resize-none"
                            placeholder="Ex: Troca de pastilhas de freio..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Data Limite</label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 outline-none"
                            />
                        </div>
                        {formData.type === 'vehicle' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">KM Limite</label>
                                <input
                                    type="number"
                                    value={formData.due_km || ''}
                                    onChange={(e) => setFormData({ ...formData, due_km: parseInt(e.target.value) || undefined })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 outline-none"
                                    placeholder="0"
                                />
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                    >
                        Salvar Alerta
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AlertsView;
