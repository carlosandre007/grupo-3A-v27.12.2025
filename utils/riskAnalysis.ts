import { RiskResult, RiskClassification } from '../types';

export const validateDocument = (doc: string): boolean => {
    const cleanDoc = doc.replace(/\D/g, '');
    return cleanDoc.length === 11 || cleanDoc.length === 14;
};

export interface RiskInput {
    nome: string;
    cpf_cnpj: string;
    tipo_locacao: 'Moto' | 'Carro' | 'Imóvel';
    civeis: number;
    execucoes: number;
    criminais: number;
    envolvePatrimonial: boolean;
    trabalhistas: number;
    protestoAtivo: boolean;
    restricaoGrave: boolean;
    scoreBaixo: boolean; // < 500
    atrasoInterno: boolean;
    inadimplenciaInterna: boolean;
    processosTJPE: number;
    processos?: {
        numero: string;
        url: string;
        classe: string;
    }[];
    fontes_consultadas?: {
        nome: string;
        status: 'OK' | 'Falha' | 'Indisponível';
    }[];
    detalhes_restricoes?: {
        nome: string;
        url: string;
    }[];
    enderecos?: {
        logradouro: string;
        bairro: string;
        cidade: string;
        uf: string;
        atual: boolean;
    }[];
    antecedentes?: {
        status: string;
        emissao: string;
        link: string;
    };
    dadosEmpresa?: {
        razaoSocial: string;
        nomeFantasia: string;
        situacao: string;
        atividadePrincipal: string;
        capitalSocial: string;
        porte: string;
        naturezaJuridica: string;
        dataAbertura: string;
        socios: { nome: string; qualificacao: string }[];
    };
    fonteReal?: boolean;
}

export const calculateRiskScore = (input: RiskInput): RiskResult => {
    let score = 100;

    // Deductions
    score -= input.civeis * 4;
    score -= input.execucoes * 8;
    score -= input.criminais * 25;
    if (input.criminais > 0 && input.envolvePatrimonial) {
        score -= 30;
    }
    score -= input.trabalhistas * 3;

    if (input.protestoAtivo) score -= 15;
    if (input.restricaoGrave) score -= 20;
    if (input.scoreBaixo) score -= 15;
    if (input.atrasoInterno) score -= 10;
    if (input.inadimplenciaInterna) score -= 25;

    // Never negative
    const finalScore = Math.max(0, score);

    // Minimus
    const minimums = {
        'Moto': 70,
        'Carro': 65,
        'Imóvel': 60
    };

    const aprovado = finalScore >= minimums[input.tipo_locacao];

    // Classification
    let classificacao: RiskClassification = 'Baixo';
    if (finalScore >= 90) classificacao = 'Mínimo';
    else if (finalScore >= 75) classificacao = 'Baixo';
    else if (finalScore >= 60) classificacao = 'Moderado';
    else if (finalScore >= 40) classificacao = 'Alto';
    else if (finalScore >= 20) classificacao = 'Muito Alto';
    else classificacao = 'Extremo';

    // Recommendation
    let recomendacao = '';
    if (aprovado) {
        recomendacao = `Perfil compatível com a locação de ${input.tipo_locacao.toLowerCase()}. `;
        if (finalScore < 80) recomendacao += 'Sugere-se cautela e monitoramento.';
        else recomendacao += 'Risco dentro dos limites aceitáveis pela empresa.';
    } else {
        recomendacao = `Score insuficiente para ${input.tipo_locacao.toLowerCase()}. `;
        if (input.criminais > 0) recomendacao += 'Presença de antecedentes criminais críticos. ';
        if (input.inadimplenciaInterna) recomendacao += 'Histórico negativo interno identificado. ';
        recomendacao += 'Locação não recomendada.';
    }

    return {
        nome: input.nome,
        cpf_cnpj: input.cpf_cnpj,
        tipo_locacao: input.tipo_locacao,
        total_processos: input.civeis + input.execucoes + input.criminais + input.trabalhistas,
        processos_tjpe: input.processosTJPE,
        score: finalScore,
        classificacao,
        aprovado,
        recomendacao,
        processos: input.processos,
        fontes_consultadas: input.fontes_consultadas,
        detalhes_restricoes: input.detalhes_restricoes,
        enderecos: input.enderecos,
        antecedentes: input.antecedentes,
        dadosEmpresa: input.dadosEmpresa,
        fonteReal: input.fonteReal
    };
};
