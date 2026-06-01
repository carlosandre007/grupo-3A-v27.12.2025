
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Bank } from '../types';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  banks: Bank[];
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  transaction,
  isOpen,
  onClose,
  banks,
  onEdit,
  onDelete
}) => {
  if (!transaction) return null;

  const bankName = banks.find(b => b.id === transaction.id_conta)?.name || 'N/A';

  const getSourceIcon = (module?: string) => {
    switch (module) {
      case 'fixed_costs': return 'event_repeat';
      case 'charges': return 'request_quote';
      case 'properties': return 'real_estate_agent';
      case 'fleet': return 'directions_car';
      case 'shopping_cart': return 'shopping_cart';
      default: return 'edit_note';
    }
  };

  const getSourceLabel = (module?: string) => {
    switch (module) {
      case 'fixed_costs': return 'Custos Fixos';
      case 'charges': return 'Cobranças';
      case 'properties': return 'Gestão de Imóveis';
      case 'fleet': return 'Gestão de Frota';
      case 'shopping_cart': return 'Compras';
      default: return 'Lançamento Manual';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-[2px] z-[60]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-brand-surface shadow-2xl z-[70] overflow-hidden flex flex-col border-l border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalhes do Lançamento</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {transaction.id.split('-')[0]}...</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Main Info Card */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                    transaction.type === 'in' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  }`}>
                    <span className="material-symbols-outlined font-black">
                      {transaction.type === 'in' ? 'south_west' : 'north_east'}
                    </span>
                  </div>
                  <div>
                    <p className={`text-2xl font-black ${transaction.type === 'in' ? 'text-success' : 'text-danger'}`}>
                      {transaction.type === 'in' ? '+' : '-'} {Number(transaction.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-sm font-bold text-slate-500">{transaction.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{new Date(transaction.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hora</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{transaction.time || '--:--'}</p>
                  </div>
                </div>
              </div>

              {/* Classification */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Classificação</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-brand-surface rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">category</span>
                      <span className="text-xs font-bold text-slate-500">Categoria</span>
                    </div>
                    <span className="text-xs font-black uppercase px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                      {transaction.category}
                    </span>
                  </div>

                </div>
              </section>

              {/* Origin Section */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Origem & Rastreio</h4>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">{getSourceIcon(transaction.source_module)}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Módulo</p>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100">{getSourceLabel(transaction.source_module)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Referência ID:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono">{transaction.reference_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Origem Detalhada:</span>
                      <span className="text-slate-700 dark:text-slate-300 capitalize">{transaction.origem || 'Manual'}</span>
                    </div>
                    {transaction.payment_hash && (
                      <div className="pt-2 mt-2 border-t border-primary/10">
                        <span className="text-slate-500 font-bold block mb-1">Hash de Segurança:</span>
                        <span className="text-[10px] text-slate-400 break-all font-mono">{transaction.payment_hash}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Audit Info */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Auditoria</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 bg-white dark:bg-brand-surface rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Registrado por</span>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">{transaction.created_by || 'Sistema'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Data de Criação</span>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                        {transaction.created_at ? new Date(transaction.created_at).toLocaleString('pt-BR') : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Responsável</span>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">{transaction.responsible || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Observations */}
              {transaction.observation && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Observações</h4>
                  <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-100/50 dark:border-yellow-900/20">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      {transaction.observation}
                    </p>
                  </div>
                </section>
              )}

              {/* Receipt / Comprovante */}
              {transaction.receipt_url && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Comprovante</h4>
                  <button className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-primary hover:bg-primary/5 transition-all group">
                    <span className="material-symbols-outlined">description</span>
                    <span className="text-xs font-black uppercase tracking-widest">Ver Comprovante Anexado</span>
                  </button>
                </section>
              )}

            </div>

            {/* Footer / Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => onEdit(transaction)}
                  className="flex-1 py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">edit</span> Editar Registro
                </button>
                <button
                  onClick={() => onDelete(transaction)}
                  className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl font-black hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
              
              {transaction.reference_id && (
                <button className="w-full py-3.5 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">open_in_new</span> Ver Origem Original
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TransactionDetailDrawer;
