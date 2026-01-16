import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCartItem } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';

const ShoppingCartView: React.FC = () => {
    const [items, setItems] = useState<ShoppingCartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<Partial<ShoppingCartItem>>({
        description: '',
        category: 'piece',
        estimated_value: 0,
        origin: 'manual',
        status: 'pending'
    });

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('shopping_cart')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setItems(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const { error } = await supabase
            .from('shopping_cart')
            .insert([formData]);

        if (!error) {
            alert('Item adicionado com sucesso!');
            await fetchItems();
            handleCloseModal();
        } else {
            alert('Erro ao adicionar item: ' + error.message);
        }
        setSubmitting(false);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({
            description: '',
            category: 'piece',
            estimated_value: 0,
            origin: 'manual',
            status: 'pending'
        });
    };

    const updateStatus = async (item: ShoppingCartItem, status: ShoppingCartItem['status']) => {
        const { error } = await supabase
            .from('shopping_cart')
            .update({ status })
            .eq('id', item.id);

        if (!error) {
            fetchItems();
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm('Excluir este item?')) return;
        const { error } = await supabase.from('shopping_cart').delete().eq('id', id);
        if (!error) fetchItems();
    };

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                title="Carrinho de Compras / Afazeres"
                description="Gerencie peças, materiais e tarefas futuras."
            >
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-2.5 bg-primary text-slate-900 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-xl">add_shopping_cart</span> Adicionar Item
                </button>
            </PageHeader>

            <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Lista de Itens</h3>
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
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Est.</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Origem</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${item.category === 'piece' ? 'bg-orange-100 text-orange-600' :
                                                item.category === 'material' ? 'bg-blue-100 text-blue-600' :
                                                    item.category === 'service' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {item.category === 'piece' ? 'Peça' : item.category === 'material' ? 'Material' : item.category === 'service' ? 'Serviço' : 'Afazer'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{item.description}</td>
                                        <td className="px-6 py-4 text-sm font-black text-right text-slate-700 dark:text-slate-300">
                                            {Number(item.estimated_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{item.origin === 'alert' ? '✨ Alerta' : 'Manual'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={item.status}
                                                onChange={(e) => updateStatus(item, e.target.value as any)}
                                                className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border-none outline-none ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    item.status === 'bought' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                    }`}
                                            >
                                                <option value="pending">Pendente</option>
                                                <option value="bought">Comprado</option>
                                                <option value="completed">Concluído</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
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
                title="Adicionar ao Carrinho / Afazeres"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
                        <input
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 outline-none"
                            placeholder="Ex: Filtro de óleo para Honda 160"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 outline-none"
                            >
                                <option value="piece">Peça</option>
                                <option value="material">Material</option>
                                <option value="service">Serviço</option>
                                <option value="task">Afazer</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Valor Estimado (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.estimated_value || ''}
                                onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 outline-none"
                                placeholder="0,00"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                    >
                        Adicionar Item
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default ShoppingCartView;
