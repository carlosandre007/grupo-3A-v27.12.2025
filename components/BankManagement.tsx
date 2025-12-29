import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bank } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';

const BankManagement: React.FC = () => {
    const [banks, setBanks] = useState<Bank[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        balance: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchBanks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('banks')
            .select('*')
            .order('name');

        if (!error && data) {
            setBanks(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBanks();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const val = parseFloat(formData.balance) || 0;

        if (isEditing) {
            const { error } = await supabase
                .from('banks')
                .update({ name: formData.name, balance: val })
                .eq('id', formData.id);

            if (!error) {
                await fetchBanks();
                handleCloseModal();
            } else {
                alert('Erro ao atualizar banco: ' + error.message);
            }
        } else {
            const { error } = await supabase.from('banks').insert([{
                name: formData.name,
                balance: val
            }]);

            if (!error) {
                await fetchBanks();
                handleCloseModal();
            } else {
                alert('Erro ao criar banco: ' + error.message);
            }
        }
        setSubmitting(false);
    };

    const handleEdit = (bank: Bank) => {
        setFormData({
            id: bank.id,
            name: bank.name,
            balance: bank.balance.toString()
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta conta bancária?')) {
            const { error } = await supabase.from('banks').delete().eq('id', id);
            if (!error) {
                fetchBanks();
            } else {
                alert('Erro ao excluir conta: ' + error.message);
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditing(false);
        setFormData({ id: '', name: '', balance: '' });
    };

    const totalBalance = banks.reduce((acc, b) => acc + Number(b.balance), 0);

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                title="Gestão de Bancos"
                description="Controle de saldos e contas bancárias."
            >
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">add_card</span> Nova Conta
                </button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 bg-primary/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saldo Total em Caixa</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                        {totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banks.map((bank) => (
                    <div key={bank.id} className="bg-white dark:bg-brand-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-slate-400">account_balance</span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(bank)}
                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(bank.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 uppercase">{bank.name}</h3>
                        <p className="text-2xl font-black text-primary">
                            {Number(bank.balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                ))}

                {banks.length === 0 && !loading && (
                    <div className="col-span-full py-10 text-center text-slate-400">
                        Nenhuma conta bancária cadastrada.
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isEditing ? "Editar Conta" : "Nova Conta Bancária"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Banco / Conta</label>
                        <input
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="Ex: Santander, Caixinha, Nubank..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Saldo Atual (R$)</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            value={formData.balance}
                            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="0,00"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex justify-center"
                    >
                        {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Salvar Conta'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default BankManagement;
