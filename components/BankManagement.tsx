import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bank } from '../types';
import PageHeader from './PageHeader';
import { motion, AnimatePresence } from 'framer-motion';

const BANK_CONFIGS: Record<string, { color: string, icon: string }> = {
  'NUBANK': { color: '#8A05BE', icon: 'account_balance' },
  'ITAÚ': { color: '#EC7000', icon: 'account_balance' },
  'BRADESCO': { color: '#CC092F', icon: 'account_balance' },
  'SANTANDER': { color: '#EC0000', icon: 'account_balance' },
  'CAIXA': { color: '#005CA9', icon: 'account_balance' },
  'BANCO DO BRASIL': { color: '#FCF800', icon: 'account_balance' },
  'INTER': { color: '#FF7A00', icon: 'account_balance' },
  'DEVOLVER': { color: '#EF4444', icon: 'assignment_return' },
  'Á DEVOLVER': { color: '#EF4444', icon: 'assignment_return' }
};

const BankManagement: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [investments, setInvestments] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newBank, setNewBank] = useState({ name: '', balance: '' });

  const fetchBanks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      const allBanks = data.map((b: any) => ({
        id: b.id,
        name: b.name,
        balance: b.balance || 0,
        secondary_balance: b.secondary_balance || 0,
        tipo_conta: b.tipo_conta || 'Outro'
      }));
      
      setBanks(allBanks.filter(b => b.tipo_conta !== 'Investimento'));
      
      const invs = allBanks.filter(b => b.tipo_conta === 'Investimento');
      setInvestments(invs);
      
      if (invs.length < 4) {
        const missingCount = 4 - invs.length;
        const { error: insertError } = await supabase.from('banks').insert(
          Array(missingCount).fill({
            name: '',
            balance: 0,
            tipo_conta: 'Investimento'
          })
        );
        if (!insertError) {
          const { data: newData } = await supabase.from('banks').select('*').eq('tipo_conta', 'Investimento');
          if (newData) {
            setInvestments(newData.map(b => ({
              id: b.id,
              name: b.name,
              balance: b.balance || 0,
              secondary_balance: b.secondary_balance || 0,
              tipo_conta: b.tipo_conta
            })));
          }
        }
      }
    } else if (error) {
      console.error('Erro ao buscar bancos:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleUpdateBalance = async (id: string, newBalance: number, isDevolver: boolean, field: 'balance' | 'secondary_balance' = 'balance') => {
    // If it's the DEVOLVER bank, always ensure the value is saved as negative
    const finalBalance = isDevolver ? -Math.abs(newBalance) : newBalance;

    const { error } = await supabase
      .from('banks')
      .update({ [field]: finalBalance })
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar saldo: ' + error.message);
    } else {
      fetchBanks();
    }
  };

  const handleAddBank = async () => {
    if (!newBank.name) return;
    const { error } = await supabase.from('banks').insert([{
      name: newBank.name,
      balance: parseFloat(newBank.balance) || 0,
      secondary_balance: 0,
      tipo_conta: 'Caixa'
    }]);

    if (!error) {
      setNewBank({ name: '', balance: '' });
      setIsAdding(false);
      fetchBanks();
    } else {
      alert('Erro ao adicionar conta: ' + error.message);
    }
  };

  const handleDeleteBank = async (id: string, name: string) => {
    const password = prompt(`Digite a senha para excluir a conta ${name}:`);
    if (password !== '4859') {
      if (password !== null) alert('Senha incorreta!');
      return;
    }
    const { error } = await supabase.from('banks').delete().eq('id', id);
    if (!error) fetchBanks();
    else alert('Erro ao excluir conta: ' + error.message);
  };

  const totalBalance = banks.reduce((acc, b) => acc + (b.balance || 0), 0);

  const getBankConfig = (name: string) => {
    const upperName = name.toUpperCase();
    for (const key in BANK_CONFIGS) {
      if (upperName.includes(key)) return BANK_CONFIGS[key];
    }
    return { color: '#64748b', icon: 'account_balance' };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <PageHeader 
        title="Controle Bancário" 
        description="Gestão estilo planilha com atualização em tempo real" 
      />

      {/* Summary Section - Responsive 2x2 Grid on Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-slate-900 rounded-3xl p-4 md:p-5 shadow-2xl border border-slate-800 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-5xl md:text-7xl text-white">account_balance_wallet</span>
          </div>
          <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 truncate">Saldo Total</p>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-primary tracking-tighter truncate">
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-emerald-900/90 rounded-3xl p-4 md:p-5 shadow-2xl border border-emerald-800 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-5xl md:text-7xl text-emerald-400">savings</span>
          </div>
          <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1 truncate">Investido</p>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-emerald-300 tracking-tighter truncate">
            R$ {(investments.reduce((acc, i) => acc + (i.balance || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
        </motion.div>

        <div className="bg-white dark:bg-brand-surface rounded-3xl p-4 md:p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Contas</p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{banks.length}</h3>
        </div>

        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary hover:bg-primary/90 text-slate-900 rounded-3xl p-4 md:p-5 shadow-lg shadow-primary/20 flex flex-col items-center justify-center group transition-all"
        >
          <span className="material-symbols-outlined text-2xl md:text-3xl mb-1 group-hover:scale-125 transition-transform">add_circle</span>
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Nova Conta</span>
        </button>
      </div>

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-brand-surface py-3 px-4 rounded-3xl border-2 border-primary/50 flex flex-col gap-3 shadow-sm shadow-primary/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-base">stars</span>
                </div>
                <input 
                  autoFocus 
                  placeholder="NOME DO BANCO" 
                  value={newBank.name} 
                  onChange={e => setNewBank({...newBank, name: e.target.value.toUpperCase()})} 
                  className="bg-transparent border-b-2 border-primary/30 outline-none p-1 w-full font-black text-xs uppercase placeholder:text-slate-300" 
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative group/input">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">R$</span>
                  <input 
                    type="number" 
                    placeholder="0,00" 
                    value={newBank.balance} 
                    onChange={e => setNewBank({...newBank, balance: e.target.value})} 
                    className="bg-slate-50 dark:bg-slate-900/50 border border-transparent focus:border-primary/40 focus:bg-white dark:focus:bg-slate-900 w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-black outline-none transition-all placeholder:text-slate-300" 
                  />
                </div>
                <button onClick={handleAddBank} className="w-9 h-9 shrink-0 bg-primary text-slate-900 rounded-xl flex items-center justify-center hover:scale-105 transition-transform"><span className="material-symbols-outlined font-black text-base">check</span></button>
                <button onClick={() => setIsAdding(false)} className="w-9 h-9 shrink-0 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:scale-105 transition-transform"><span className="material-symbols-outlined font-black text-base">close</span></button>
              </div>
            </motion.div>
          )}

          {banks.map((bank, index) => {
            const config = getBankConfig(bank.name);
            const isDevolver = bank.name.toUpperCase().includes('DEVOLVER');
            
            return (
              <motion.div 
                key={bank.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-brand-surface py-3 px-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                {/* Visual Indicator for Devolver */}
                {isDevolver && <div className="absolute top-0 right-0 w-14 h-14 bg-rose-500/5 rounded-bl-[2.5rem] -mr-3 -mt-3 transition-colors group-hover:bg-rose-500/10 pointer-events-none" />}
                
                <div 
                  className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-sm relative z-10"
                  style={{ backgroundColor: config.color, color: config.color === '#FCF800' ? '#000' : '#fff' }}
                >
                  <span className="material-symbols-outlined text-base">{config.icon}</span>
                </div>
                
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{bank.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{bank.tipo_conta}</p>
                </div>

                <div className="w-32 shrink-0 flex items-center relative z-10">
                  <div className="relative group/input w-full">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">R$</span>
                    <input
                      type="number"
                      defaultValue={isDevolver ? Math.abs(bank.balance) : bank.balance}
                      onBlur={(e) => handleUpdateBalance(bank.id, parseFloat(e.target.value), isDevolver, 'balance')}
                      className={`border border-transparent w-full pl-8 pr-2 py-1.5 rounded-xl text-xs font-black outline-none transition-all group-hover/input:shadow-sm focus:bg-white dark:focus:bg-slate-900 ${isDevolver ? 'bg-rose-50/50 dark:bg-rose-900/10 text-rose-600 focus:border-rose-300' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:border-primary/40'}`}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => handleDeleteBank(bank.id, bank.name)}
                  className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-0 group-hover:opacity-100 absolute right-2 top-2 bg-white dark:bg-brand-surface shadow-sm z-20"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Decorative Tips */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar"
      >
        <div className="flex-none bg-white dark:bg-brand-surface p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
            <span className="material-symbols-outlined text-sm">security</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Exclusão protegida (Senha 4859)</p>
        </div>
      </motion.div>

      {/* SECONDARY INDEPENDENT LIST */}
      <div className="flex items-center gap-4 mb-4 mt-2">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Controle Secundário</h2>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
        <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Independente</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence>
          {banks.map((bank, index) => {
            const config = getBankConfig(bank.name);
            const isDevolver = bank.name.toUpperCase().includes('DEVOLVER');
            
            return (
              <motion.div 
                key={`secondary-${bank.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`py-3 px-4 rounded-3xl border flex items-center gap-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${
                  (bank.secondary_balance || 0) > 4800 
                    ? 'bg-rose-50 border-rose-500 dark:bg-rose-900/20 dark:border-rose-500/50 ring-2 ring-rose-500/20'
                    : 'bg-white dark:bg-brand-surface border-indigo-50 dark:border-indigo-900/20'
                }`}
              >
                {/* Visual Indicator for Devolver */}
                {isDevolver && <div className="absolute top-0 right-0 w-14 h-14 bg-rose-500/5 rounded-bl-[2.5rem] -mr-3 -mt-3 transition-colors group-hover:bg-rose-500/10 pointer-events-none" />}
                
                <div 
                  className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-sm relative z-10"
                  style={{ backgroundColor: config.color, color: config.color === '#FCF800' ? '#000' : '#fff' }}
                >
                  <span className="material-symbols-outlined text-base opacity-70">{config.icon}</span>
                </div>
                
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className={`text-xs font-black uppercase tracking-tight truncate ${(bank.secondary_balance || 0) > 4800 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>{bank.name}</h4>
                  <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${(bank.secondary_balance || 0) > 4800 ? 'text-rose-500 dark:text-rose-400' : 'text-indigo-400'}`}>Secundário</p>
                </div>

                <div className="w-32 shrink-0 flex items-center relative z-10">
                  <div className="relative group/input w-full">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black ${(bank.secondary_balance || 0) > 4800 ? 'text-rose-500' : 'text-indigo-400'}`}>R$</span>
                    <input
                      type="number"
                      defaultValue={isDevolver ? Math.abs(bank.secondary_balance || 0) : (bank.secondary_balance || 0)}
                      onBlur={(e) => handleUpdateBalance(bank.id, parseFloat(e.target.value), isDevolver, 'secondary_balance')}
                      className={`border border-transparent w-full pl-8 pr-2 py-1.5 rounded-xl text-xs font-black outline-none transition-all group-hover/input:shadow-sm focus:bg-white dark:focus:bg-slate-900 ${isDevolver || (bank.secondary_balance || 0) > 4800 ? 'bg-rose-100/50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 focus:border-rose-400' : 'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 focus:border-indigo-400/50'}`}
                    />
                  </div>
                </div>

                {/* Duplicated items share the same DB row, so deleting here deletes both */}
                <button 
                  onClick={() => handleDeleteBank(bank.id, bank.name)}
                  className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-0 group-hover:opacity-100 absolute right-2 top-2 bg-white dark:bg-brand-surface shadow-sm z-20"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* RECURSO INVESTIDO - Responsive Grid */}
      <div className="flex items-center gap-4 mb-4 mt-8">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter shrink-0">Recursos</h2>
        <div className="px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[9px] md:text-xs font-black text-emerald-600 uppercase tracking-widest shadow-sm border border-emerald-200 dark:border-emerald-800 truncate">
          Total: {(investments.reduce((acc, i) => acc + (i.balance || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-8">
        {investments.slice(0, 4).map((inv, index) => (
          <motion.div 
            key={`inv-${inv.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-emerald-50/50 dark:bg-brand-surface border border-emerald-100 dark:border-emerald-800/30 rounded-3xl p-3 md:p-4 flex flex-col gap-2 md:gap-3 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800/50 pb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <span className="material-symbols-outlined text-[12px] md:text-[14px]">savings</span>
              </div>
              <input
                type="text"
                placeholder="BANCO"
                defaultValue={inv.name}
                onBlur={async (e) => {
                  if (e.target.value !== inv.name) {
                    await supabase.from('banks').update({ name: e.target.value.toUpperCase() }).eq('id', inv.id);
                  }
                }}
                className="bg-transparent border-none w-full outline-none text-[9px] md:text-[11px] font-black text-slate-900 dark:text-white uppercase placeholder:text-slate-400 transition-all font-mono tracking-widest truncate"
              />
            </div>
            
            <div className="relative group/input mt-1">
              <span className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-[9px] md:text-[11px] font-black text-emerald-600 dark:text-emerald-500">R$</span>
              <input
                type="number"
                placeholder="0,00"
                defaultValue={inv.balance || 0}
                onBlur={(e) => handleUpdateBalance(inv.id, parseFloat(e.target.value) || 0, false, 'balance')}
                className="bg-white dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-800/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 w-full pl-6 md:pl-8 pr-2 py-1.5 md:py-2.5 rounded-xl text-[11px] md:text-sm font-black text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-300"
              />
            </div>
          </motion.div>
        ))}
      </div>

    </motion.div>
  );
};

export default BankManagement;
