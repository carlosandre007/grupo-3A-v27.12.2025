import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import PageHeader from './PageHeader';

const TABLES = [
    'banks',
    'motorcycles',
    'motorcycle_maintenance',
    'clients',
    'properties',
    'charges',
    'ipva_records',
    'categories',
    'transactions'
];

const BackupRestore: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    const handleExport = async () => {
        setLoading(true);
        setStatus({ type: 'info', message: 'Iniciando exportação...' });

        try {
            const backupData: Record<string, any[]> = {};

            for (const table of TABLES) {
                setStatus({ type: 'info', message: `Exportando tabela: ${table}...` });
                const { data, error } = await supabase.from(table).select('*');
                if (error) throw error;
                backupData[table] = data || [];
            }

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup_grupo3a_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setStatus({ type: 'success', message: 'Backup exportado com sucesso!' });
        } catch (error: any) {
            console.error('Export error:', error);
            setStatus({ type: 'error', message: 'Erro na exportação: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm('ATENÇÃO: Isso irá APAGAR todos os dados atuais dos módulos e substituir pelos dados do backup. Deseja continuar?')) {
            event.target.value = '';
            return;
        }

        setLoading(true);
        setStatus({ type: 'info', message: 'Iniciando restauração...' });

        try {
            const reader = new FileReader();
            const content = await new Promise<string>((resolve, reject) => {
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsText(file);
            });

            const backupData = JSON.parse(content);

            // We need to delete in order to avoid FK issues, or just delete all if RLS allows
            // For simplicity, we try to clear and insert. 
            // Reverse order might help with dependencies (motos -> maintenance, etc)
            const tablesInOrder = [...TABLES].reverse();

            for (const table of tablesInOrder) {
                setStatus({ type: 'info', message: `Limpando tabela: ${table}...` });
                const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000' as any); // Delete all
                if (error) throw error;
            }

            // Re-insert in original order
            for (const table of TABLES) {
                const data = backupData[table];
                if (data && data.length > 0) {
                    setStatus({ type: 'info', message: `Restaurando tabela: ${table} (${data.length} registros)...` });
                    // Split into chunks if too large (Supabase limit)
                    const chunkSize = 50;
                    for (let i = 0; i < data.length; i += chunkSize) {
                        const chunk = data.slice(i, i + chunkSize);
                        const { error } = await supabase.from(table).insert(chunk);
                        if (error) throw error;
                    }
                }
            }

            setStatus({ type: 'success', message: 'Sistema restaurado com sucesso!' });
        } catch (error: any) {
            console.error('Restore error:', error);
            setStatus({ type: 'error', message: 'Erro na restauração: ' + error.message });
        } finally {
            setLoading(false);
            event.target.value = '';
        }
    };

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                title="Backup / Restauração"
                description="Gerencie a segurança dos seus dados exportando ou importando arquivos JSON."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary-dark">
                            <span className="material-symbols-outlined text-3xl font-black">download</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Exportar Backup</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Salvar todos os dados</p>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Gere um arquivo JSON contendo todas as informações do sistema: veículos, clientes, financeiro, bancos e imóveis. Recomenda-se realizar este processo semanalmente.
                    </p>

                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 dark:bg-primary text-white dark:text-slate-900 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : (
                            <>
                                <span className="material-symbols-outlined">file_download</span>
                                Gerar Arquivo JSON
                            </>
                        )}
                    </button>
                </div>

                {/* Import Card */}
                <div className="bg-white dark:bg-brand-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center text-danger">
                            <span className="material-symbols-outlined text-3xl font-black">upload_file</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Restaurar Sistema</h3>
                            <p className="text-xs text-danger font-bold uppercase tracking-widest">Substituir dados atuais</p>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Selecione um arquivo de backup (.json) para restaurar o sistema. <strong className="text-danger uppercase">Atenção:</strong> Isso apagará permanentemente todos os dados atuais e os substituirá pelo conteúdo do arquivo.
                    </p>

                    <div className="relative group">
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleRestore}
                            disabled={loading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                        />
                        <div className={`w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group-hover:border-primary ${loading ? 'opacity-50' : ''}`}>
                            <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-primary transition-colors">cloud_upload</span>
                            <span className="text-xs font-black text-slate-500 group-hover:text-primary transition-colors uppercase tracking-widest">Selecionar Backup</span>
                        </div>
                    </div>
                </div>
            </div>

            {status && (
                <div className={`p-6 rounded-2xl border flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 ${status.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400' :
                        status.type === 'error' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800 text-red-700 dark:text-red-400' :
                            'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                    }`}>
                    <span className="material-symbols-outlined">
                        {status.type === 'success' ? 'check_circle' : status.type === 'error' ? 'error' : 'info'}
                    </span>
                    <p className="text-sm font-bold">{status.message}</p>
                </div>
            )}

            {/* Warning/Help Box */}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 p-6 rounded-3xl">
                <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-amber-500 font-black">warning</span>
                    <div>
                        <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 mb-1">Recomendações de Segurança</h4>
                        <ul className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed list-disc ml-4 space-y-1 font-bold">
                            <li>Sempre baixe um backup antes de realizar restaurações ou mudanças estruturais.</li>
                            <li>Mantenha seus arquivos de backup em um local seguro (pendrive ou nuvem privada).</li>
                            <li>A restauração pode falhar se o arquivo JSON estiver corrompido ou mal formatado.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackupRestore;
