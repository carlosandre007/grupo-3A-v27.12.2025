import React, { useState } from 'react';
import PageHeader from './PageHeader';
import { RiskInput, calculateRiskScore, validateDocument } from '../utils/riskAnalysis';
import { RiskResult } from '../types';
import { riskRegistryService } from '../services/riskRegistryService';

const RiskAnalysisView: React.FC = () => {
    const [isConsulting, setIsConsulting] = useState(false);
    const [input, setInput] = useState<RiskInput>({
        nome: '',
        cpf_cnpj: '',
        tipo_locacao: 'Moto',
        civeis: 0,
        execucoes: 0,
        criminais: 0,
        envolvePatrimonial: false,
        trabalhistas: 0,
        protestoAtivo: false,
        restricaoGrave: false,
        scoreBaixo: false,
        atrasoInterno: false,
        inadimplenciaInterna: false,
        processosTJPE: 0
    });

    const [result, setResult] = useState<RiskResult | null>(null);
    const [showJson, setShowJson] = useState(false);

    const handleCalculate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateDocument(input.cpf_cnpj)) {
            alert('CPF ou CNPJ inválido.');
            return;
        }
        const res = calculateRiskScore(input);
        setResult(res);
    };

    const handleAutoConsult = async () => {
        if (!validateDocument(input.cpf_cnpj)) {
            alert('Informe um CPF ou CNPJ válido para consulta.');
            return;
        }

        setIsConsulting(true);
        try {
            const data = await riskRegistryService.consultExternalBases(input.cpf_cnpj);

            const newInput = {
                ...input,
                ...data
            };

            setInput(newInput);

            // Auto calculate after fetching
            const res = calculateRiskScore(newInput);
            setResult(res);

            const isCnpj = input.cpf_cnpj.replace(/\D/g, '').length === 14;
            const fontes = data.fonteReal
                ? `Fontes reais: DATAJUD/CNJ${isCnpj ? ', BrasilAPI/CNPJ' : ''}`
                : 'Dados de crédito simulados (Serasa/SPC)';
            alert(`Consulta realizada com sucesso!\n${fontes}\nProcessos encontrados: ${data.processos?.length || 0}`);
        } catch (error) {
            alert('Erro ao realizar consulta nos órgãos. Tente novamente ou use a entrada manual.');
            console.error(error);
        } finally {
            setIsConsulting(false);
        }
    };

    const copyJson = () => {
        if (result) {
            navigator.clipboard.writeText(JSON.stringify(result, null, 2));
            alert('JSON copiado para a área de transferência!');
        }
    };

    const getClassColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500';
        if (score >= 60) return 'text-blue-500';
        if (score >= 40) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Análise de Risco"
                description="Agente de análise de risco contratual para novos locatários."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="bg-white dark:bg-brand-surface p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">person_search</span>
                        Dados do Candidato
                    </h3>

                    <form onSubmit={handleCalculate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Completo / Razão Social</label>
                                <input
                                    required
                                    value={input.nome}
                                    onChange={e => setInput({ ...input, nome: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm font-bold dark:text-white"
                                    placeholder="Nome do candidato"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">CPF ou CNPJ</label>
                                <input
                                    required
                                    value={input.cpf_cnpj}
                                    onChange={e => setInput({ ...input, cpf_cnpj: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm font-mono dark:text-white"
                                    placeholder="000.000.000-00"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo de Locação Desejada</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Moto', 'Carro', 'Imóvel'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setInput({ ...input, tipo_locacao: type as any })}
                                        className={`py-3 rounded-2xl text-xs font-black transition-all ${input.tipo_locacao === type
                                            ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20 scale-105'
                                            : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Registros Judiciais e TJPE</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Cível', key: 'civeis' },
                                    { label: 'Execução', key: 'execucoes' },
                                    { label: 'Criminal', key: 'criminais' },
                                    { label: 'Trabalhista', key: 'trabalhistas' }
                                ].map(item => (
                                    <div key={item.key} className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">{item.label}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={(input as any)[item.key]}
                                            onChange={e => setInput({ ...input, [item.key]: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl text-sm font-bold dark:text-white"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Processos TJPE (Pernambuco)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={input.processosTJPE}
                                    onChange={e => setInput({ ...input, processosTJPE: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl text-sm font-bold dark:text-white"
                                />
                            </div>

                            {input.criminais > 0 && (
                                <div className="mt-4 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                                    <input
                                        type="checkbox"
                                        id="patrimonial"
                                        checked={input.envolvePatrimonial}
                                        onChange={e => setInput({ ...input, envolvePatrimonial: e.target.checked })}
                                        className="w-5 h-5 rounded-lg border-red-300 text-red-600 focus:ring-red-500"
                                    />
                                    <label htmlFor="patrimonial" className="text-xs font-black text-red-700 dark:text-red-400 cursor-pointer">
                                        Envolve Crime Patrimonial (Roubo, Furto, Estelionato)
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Restrições e Histórico</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { label: 'Protesto Ativo', key: 'protestoAtivo', icon: 'gavel' },
                                    { label: 'Restrição Grave', key: 'restricaoGrave', icon: 'warning' },
                                    { label: 'Score Crédito < 500', key: 'scoreBaixo', icon: 'trending_down' },
                                    { label: 'Atraso Interno', key: 'atrasoInterno', icon: 'history' },
                                    { label: 'Inadimplência Interna', key: 'inadimplenciaInterna', icon: 'block' }
                                ].map(item => (
                                    <label
                                        key={item.key}
                                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${(input as any)[item.key]
                                            ? 'bg-primary/5 border-primary shadow-sm'
                                            : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-lg ${(input as any)[item.key] ? 'text-primary' : 'text-slate-400'}`}>
                                                {item.icon}
                                            </span>
                                            <span className={`text-[11px] font-black uppercase tracking-tight ${(input as any)[item.key] ? 'text-primary-dark dark:text-primary' : 'text-slate-500'
                                                }`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={(input as any)[item.key]}
                                            onChange={e => setInput({ ...input, [item.key]: e.target.checked })}
                                            className="w-5 h-5 rounded-lg border-slate-300 text-primary focus:ring-primary"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={handleAutoConsult}
                                disabled={isConsulting}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[20px] font-black uppercase tracking-widest transition-all text-sm border-2 ${isConsulting
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 border-dashed'
                                    : 'bg-white border-primary text-primary hover:bg-primary/5 active:scale-95'
                                    }`}
                            >
                                {isConsulting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                        Consultando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">api</span>
                                        Consultar Órgãos
                                    </>
                                )}
                            </button>

                            <button
                                type="submit"
                                className="flex-1 py-4 bg-slate-900 dark:bg-primary text-white dark:text-slate-900 rounded-[20px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm"
                            >
                                Análise Manual
                            </button>
                        </div>
                    </form>
                </div>

                {/* Result Section */}
                <div className="space-y-6">
                    {!result ? (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-100/50 dark:bg-slate-900/20 rounded-[40px] border-4 border-dashed border-slate-200 dark:border-slate-800/50 p-10 text-center">
                            <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700 mb-6 scale-150">shield_with_heart</span>
                            <h4 className="text-xl font-black text-slate-400">Aguardando Dados</h4>
                            <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm">
                                Preencha as informações à esquerda para gerar o score de risco do candidato.
                            </p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-10 duration-500 space-y-6">
                            {/* Score Card */}
                            <div className="bg-white dark:bg-brand-surface p-1 rounded-[40px] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden relative">
                                {/* Banner Indicador de Fonte de Dados */}
                                {result.fonteReal ? (
                                    <div className="bg-emerald-500 text-white px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-sm font-bold">verified</span>
                                        Dados Reais — Fontes: DATAJUD/CNJ{result.dadosEmpresa ? ', BrasilAPI/CNPJ' : ''}
                                    </div>
                                ) : (
                                    <div className="bg-amber-500 text-slate-900 px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-sm font-bold">microscope</span>
                                        Modo Simulação — Dados de crédito (Serasa/SPC) são simulados
                                    </div>
                                )}

                                <div className={`p-10 text-center ${result.aprovado ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                                    <div className="relative inline-block mb-6">
                                        <svg className="w-48 h-48 -rotate-90">
                                            <circle
                                                cx="96" cy="96" r="88"
                                                className="stroke-slate-100 dark:stroke-slate-800/50 fill-none"
                                                style={{ strokeWidth: '12' }}
                                            />
                                            <circle
                                                cx="96" cy="96" r="88"
                                                className={`fill-none transition-all duration-1000 ${result.aprovado ? 'stroke-emerald-500' : 'stroke-red-500'}`}
                                                style={{
                                                    strokeWidth: '12',
                                                    strokeDasharray: 553,
                                                    strokeDashoffset: 553 - (553 * result.score) / 100,
                                                    strokeLinecap: 'round'
                                                }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-6xl font-black text-slate-900 dark:text-white leading-none">{result.score}</span>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Pontos</span>
                                        </div>
                                    </div>

                                    <div className={`inline-block px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm mb-6 ${result.aprovado ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                                        }`}>
                                        {result.aprovado ? 'Aprovado' : 'Reprovado'}
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nível de Risco</p>
                                        <h5 className={`text-2xl font-black ${getClassColor(result.score)}`}>{result.classificacao}</h5>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800">
                                    {result.fontes_consultadas && (
                                        <div className="mb-8 flex flex-wrap gap-2 justify-center">
                                            {result.fontes_consultadas.map((fonte, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 border ${fonte.status === 'OK'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                        : fonte.status === 'Falha'
                                                            ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                                            : 'bg-slate-200/50 text-slate-500 border-slate-300/30'
                                                        }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${fonte.status === 'OK' ? 'bg-emerald-500 animate-pulse' : fonte.status === 'Falha' ? 'bg-red-500' : 'bg-slate-400'}`} />
                                                    {fonte.nome}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Processos</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white">{result.total_processos}</p>
                                        </div>
                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Processos TJPE</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white">{result.processos_tjpe}</p>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                        <h6 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">tips_and_updates</span>
                                            Recomendação do Sistema
                                        </h6>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                            "{result.recomendacao}"
                                        </p>
                                    </div>

                                    {result.processos && result.processos.length > 0 && (
                                        <div className="mt-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                            <h6 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm font-bold">format_list_bulleted</span>
                                                Processos {result.fonteReal ? '(DATAJUD/CNJ — Dados Reais)' : 'Detalhados'}
                                            </h6>
                                            <div className="space-y-3">
                                                {result.processos.map((proc, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all group">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-primary uppercase tracking-wider">{proc.classe}</span>
                                                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">{proc.numero}</span>
                                                            {(proc.tribunal || proc.dataAjuizamento) && (
                                                                <span className="text-[9px] font-medium text-slate-400 mt-0.5">
                                                                    {proc.tribunal && <>{proc.tribunal}</>}
                                                                    {proc.tribunal && proc.dataAjuizamento && ' • '}
                                                                    {proc.dataAjuizamento && <>Ajuizado: {proc.dataAjuizamento}</>}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <a
                                                            href={proc.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 text-primary border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase shadow-sm group-hover:bg-primary group-hover:text-slate-900 group-hover:border-primary transition-all"
                                                        >
                                                            Abrir
                                                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Dados da Empresa (CNPJ) — BrasilAPI */}
                                    {result.dadosEmpresa && (
                                        <div className="mt-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-3xl border border-blue-100 dark:border-blue-900/30 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3">
                                                <span className="px-2 py-1 bg-blue-500 text-white text-[8px] font-black uppercase rounded-lg shadow-sm">Dados Reais</span>
                                            </div>
                                            <h6 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm font-bold">apartment</span>
                                                Dados da Empresa (BrasilAPI)
                                            </h6>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-white/80 dark:bg-slate-800/50 rounded-2xl">
                                                    <p className="text-[8px] font-black text-blue-400 uppercase">Razão Social</p>
                                                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{result.dadosEmpresa.razaoSocial}</p>
                                                </div>
                                                {result.dadosEmpresa.nomeFantasia && (
                                                    <div className="p-3 bg-white/80 dark:bg-slate-800/50 rounded-2xl">
                                                        <p className="text-[8px] font-black text-blue-400 uppercase">Nome Fantasia</p>
                                                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{result.dadosEmpresa.nomeFantasia}</p>
                                                    </div>
                                                )}
                                                <div className="p-3 bg-white/80 dark:bg-slate-800/50 rounded-2xl">
                                                    <p className="text-[8px] font-black text-blue-400 uppercase">Situação</p>
                                                    <p className={`text-[11px] font-bold mt-0.5 ${result.dadosEmpresa.situacao === 'ATIVA' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {result.dadosEmpresa.situacao}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-white/80 dark:bg-slate-800/50 rounded-2xl">
                                                    <p className="text-[8px] font-black text-blue-400 uppercase">Capital Social</p>
                                                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{result.dadosEmpresa.capitalSocial}</p>
                                                </div>
                                                <div className="p-3 bg-white/80 dark:bg-slate-800/50 rounded-2xl">
                                                    <p className="text-[8px] font-black text-blue-400 uppercase">Atividade Principal</p>
                                                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{result.dadosEmpresa.atividadePrincipal}</p>
                                                </div>
                                                <div className="p-3 bg-white/80 dark:bg-slate-800/50 rounded-2xl">
                                                    <p className="text-[8px] font-black text-blue-400 uppercase">Abertura</p>
                                                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{result.dadosEmpresa.dataAbertura}</p>
                                                </div>
                                            </div>

                                            {result.dadosEmpresa.socios.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-[8px] font-black text-blue-400 uppercase mb-2">Quadro Societário</p>
                                                    <div className="space-y-2">
                                                        {result.dadosEmpresa.socios.map((socio, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-2.5 bg-white/80 dark:bg-slate-800/50 rounded-xl">
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{socio.nome}</span>
                                                                <span className="text-[9px] font-black text-blue-500 uppercase">{socio.qualificacao}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {result.antecedentes && (
                                        <div className="mt-4 p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                                <span className="material-symbols-outlined text-4xl">verified_user</span>
                                            </div>
                                            <h6 className="text-[10px] font-black text-primary uppercase mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm font-bold">policy</span>
                                                Antecedentes Criminais (Certidão)
                                            </h6>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${result.antecedentes.status.includes('Nada Consta') ? 'bg-emerald-400' : 'bg-primary'}`} />
                                                    <span className="text-sm font-black">{result.antecedentes.status}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Emissão: {result.antecedentes.emissao}</span>
                                                <div className="mt-4">
                                                    <a
                                                        href={result.antecedentes.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all shadow-lg shadow-primary/20"
                                                    >
                                                        Validar Certidão On-line
                                                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {result.detalhes_restricoes && result.detalhes_restricoes.length > 0 && (
                                        <div className="mt-4 p-6 bg-rose-50/50 dark:bg-rose-950/10 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
                                            <h6 className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm font-bold text-rose-500">warning</span>
                                                Restrições Ativas Identificadas
                                            </h6>
                                            <div className="space-y-3">
                                                {result.detalhes_restricoes.map((restr, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900/50 rounded-2xl border border-rose-200/50 dark:border-rose-800/30 transition-all group hover:bg-rose-50 dark:hover:bg-rose-900/10">
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-bold text-rose-700 dark:text-rose-300">{restr.nome}</span>
                                                        </div>
                                                        <a
                                                            href={restr.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-200 dark:shadow-rose-900/20 hover:scale-[1.05] transition-all"
                                                        >
                                                            Ver Detalhes
                                                            <span className="material-symbols-outlined text-[14px]">info</span>
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {result.enderecos && result.enderecos.length > 0 && (
                                        <div className="mt-4 space-y-4">
                                            {/* Endereço Atual em Destaque */}
                                            {result.enderecos.find(e => e.atual) && (
                                                <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-3">
                                                        <span className="px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-lg shadow-sm">Localização Atual</span>
                                                    </div>
                                                    <h6 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-4 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-sm font-bold">home_pin</span>
                                                        Endereço Atual Confirmado
                                                    </h6>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 italic">
                                                            {result.enderecos.find(e => e.atual)?.logradouro}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                                                            {result.enderecos.find(e => e.atual)?.bairro} — {result.enderecos.find(e => e.atual)?.cidade}/{result.enderecos.find(e => e.atual)?.uf}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Histórico de Endereços */}
                                            {result.enderecos.filter(e => !e.atual).length > 0 && (
                                                <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                                    <h6 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-sm font-bold text-slate-300">history_edu</span>
                                                        Histórico de Localizações Anteriores
                                                    </h6>
                                                    <div className="space-y-3 opacity-70">
                                                        {result.enderecos.filter(e => !e.atual).map((end, idx) => (
                                                            <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{end.logradouro}</span>
                                                                    <span className="text-[9px] font-medium text-slate-500 mt-0.5">
                                                                        {end.bairro} — {end.cidade}/{end.uf}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* JSON Export Card */}
                            <div className="bg-white dark:bg-brand-surface rounded-[32px] border border-slate-100 dark:border-slate-800 p-6 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">code</span>
                                        Estrutura de Dados (JSON)
                                    </h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowJson(!showJson)}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                        >
                                            {showJson ? 'Ocultar' : 'Visualizar'}
                                        </button>
                                        <button
                                            onClick={copyJson}
                                            className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-slate-900 transition-all"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>

                                {showJson && (
                                    <pre className="p-6 bg-slate-950 rounded-2xl text-[11px] font-mono text-emerald-400 overflow-x-auto shadow-inner animate-in slide-in-from-top-4 duration-300">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RiskAnalysisView;
