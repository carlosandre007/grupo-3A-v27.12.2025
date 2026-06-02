import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PageHeader from './PageHeader';

interface DeletionLog {
    id: string;
    table_name: string;
    record_id: string;
    record_description: string;
    deleted_by: string;
    deleted_at: string;
}

const DeletionLogsView: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    
    const [logs, setLogs] = useState<DeletionLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [tableMissing, setTableMissing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Check if session has unlocked password
    useEffect(() => {
        const isUnlocked = sessionStorage.getItem('deletion_logs_unlocked') === 'true';
        if (isUnlocked) {
            setIsAuthenticated(true);
        }
    }, []);

    // Fetch logs from Supabase
    const fetchLogs = async () => {
        setLoading(true);
        setTableMissing(false);
        const { data, error } = await supabase
            .from('deletion_logs')
            .select('*')
            .order('deleted_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar logs:', error);
            // PGRST205 indicates table is missing
            if (error.code === 'PGRST205') {
                setTableMissing(true);
            }
        } else if (data) {
            setLogs(data as DeletionLog[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchLogs();
        }
    }, [isAuthenticated]);

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'andrealane') {
            setIsAuthenticated(true);
            setPasswordError(false);
            sessionStorage.setItem('deletion_logs_unlocked', 'true');
        } else {
            setPasswordError(true);
        }
    };

    const getFriendlyTableName = (name: string) => {
        const mapping: Record<string, { label: string; icon: string; color: string }> = {
            properties: { label: 'Imóveis (Kitnets/Lojas)', icon: 'home', color: 'bg-emerald-600' },
            charges: { label: 'Escala de Cobrança', icon: 'schedule', color: 'bg-amber-500' },
            transactions: { label: 'Fluxo de Caixa', icon: 'payments', color: 'bg-indigo-600' },
            clients: { label: 'Clientes / Contatos', icon: 'group', color: 'bg-rose-500' },
            cliente_ativos: { label: 'Clientes Ativos', icon: 'person', color: 'bg-sky-500' },
            fixed_costs: { label: 'Custos Fixos', icon: 'account_balance', color: 'bg-slate-700' },
            banks: { label: 'Bancos / Contas', icon: 'account_balance_wallet', color: 'bg-teal-600' },
            motorcycle_maintenance: { label: 'Manutenção Frota', icon: 'motorcycle', color: 'bg-red-500' },
            shopping_cart: { label: 'Carrinho de Compras', icon: 'shopping_cart', color: 'bg-purple-500' },
            categories: { label: 'Categorias', icon: 'sell', color: 'bg-orange-500' }
        };
        return mapping[name] || { label: name, icon: 'delete', color: 'bg-slate-500' };
    };

    // Filter logs
    const filteredLogs = logs.filter(log =>
        log.record_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.deleted_by.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Protected Lock Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-[500px] flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-brand-surface p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-2xl text-center flex flex-col gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                        <span className="material-symbols-outlined text-3xl font-black">lock</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Acesso Restrito</h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-wider font-bold">Log de Exclusões do Sistema</p>
                    </div>
                    
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border text-center font-bold text-sm tracking-widest outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white ${
                                    passwordError ? 'border-red-400 ring-2 ring-red-400/20' : 'border-slate-200 dark:border-slate-800'
                                }`}
                                placeholder="SENHA DE ACESSO"
                            />
                            {passwordError && (
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-xs">error</span> Senha incorreta!
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3.5 bg-slate-900 dark:bg-primary text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            Confirmar Identidade
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                title="Log de Exclusões"
                description="Registro histórico de todos os itens excluídos nas bases do sistema."
            >
                <div className="flex gap-2">
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-350 dark:hover:text-white transition-all shadow-sm active:scale-95"
                        title="Atualizar Logs"
                    >
                        <span className="material-symbols-outlined text-lg font-bold">sync</span>
                    </button>
                </div>
            </PageHeader>

            {tableMissing ? (
                <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-3xl p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-500 text-3xl font-black">database_alert</span>
                        <div>
                            <h4 className="text-base font-black text-slate-900 dark:text-white">Tabela de Logs não Encontrada</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">É necessário criar a estrutura correspondente no banco de dados para iniciar o registro.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Instruções de Configuração</p>
                        <p className="text-xs text-slate-650 dark:text-slate-400">
                            Copie o script abaixo, acesse o painel da sua conta **Supabase** no menu **SQL Editor**, cole-o e clique em **RUN**.
                        </p>
                        
                        <pre className="text-[10px] font-mono p-4 bg-slate-900 dark:bg-black text-green-400 rounded-xl overflow-x-auto select-all max-h-48 border border-slate-800 custom-scrollbar">
{`CREATE TABLE IF NOT EXISTS public.deletion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    record_id VARCHAR(255),
    record_description TEXT,
    deleted_by VARCHAR(255) DEFAULT 'Sistema',
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.deletion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert" ON public.deletion_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select" ON public.deletion_logs FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE deletion_logs;`}
                        </pre>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Search filter */}
                    <div className="bg-white dark:bg-brand-surface p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Filtrar por descrição, tabela ou operador..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white outline-none"
                            />
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="bg-white dark:bg-brand-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        {loading ? (
                            <div className="p-10 flex justify-center text-slate-400">
                                <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
                            </div>
                        ) : filteredLogs.length > 0 ? (
                            <div className="table-responsive">
                                <table className="w-full text-left min-w-[650px] md:min-w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                            <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Módulo/Tabela</th>
                                            <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Item Excluído (Detalhes)</th>
                                            <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Excluído por</th>
                                            <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Data e Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredLogs.map(log => {
                                            const tableInfo = getFriendlyTableName(log.table_name);
                                            return (
                                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-sm ${tableInfo.color}`}>
                                                                <span className="material-symbols-outlined text-base">{tableInfo.icon}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{tableInfo.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {log.record_description}
                                                        <span className="block text-[10px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">ID: {log.record_id}</span>
                                                    </td>
                                                    <td className="p-5 text-xs font-black text-slate-800 dark:text-slate-400">{log.deleted_by}</td>
                                                    <td className="p-5 text-xs font-bold text-slate-500 dark:text-slate-405">
                                                        {new Date(log.deleted_at).toLocaleString('pt-BR')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-16 text-center flex flex-col items-center justify-center opacity-30">
                                <span className="material-symbols-outlined text-4xl">folder_off</span>
                                <p className="text-xs font-black uppercase mt-2">Nenhum registro de exclusão encontrado.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeletionLogsView;
