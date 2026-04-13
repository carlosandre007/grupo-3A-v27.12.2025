import { realApiService, BrasilApiCnpjResponse } from './realApiService';

/**
 * Interface para representar o retorno da integração
 */
export interface AutomationData {
    civeis: number;
    execucoes: number;
    criminais: number;
    envolvePatrimonial: boolean;
    trabalhistas: number;
    processosTJPE: number;
    protestoAtivo: boolean;
    restricaoGrave: boolean;
    scoreBaixo: boolean;
    processos?: {
        numero: string;
        url: string;
        classe: string;
        tribunal?: string;
        orgao?: string;
        dataAjuizamento?: string;
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
    fonteReal: boolean; // indica se os dados vieram de APIs reais
}

/**
 * Serviço de Registro e Consulta de Risco
 * Integra APIs reais (DATAJUD, BrasilAPI) com fallback simulado
 */
export const riskRegistryService = {
    /**
     * Realiza consulta automatizada - Agora com dados reais!
     */
    async consultExternalBases(cpfCnpj: string): Promise<AutomationData> {
        const cleanDoc = cpfCnpj.replace(/\D/g, '');
        const isCnpj = cleanDoc.length === 14;

        // ====================================================================
        // FASE 1: Consultar APIs Reais em paralelo
        // ====================================================================

        const fontesConsultadas: { nome: string; status: 'OK' | 'Falha' | 'Indisponível' }[] = [];
        let processosReais: AutomationData['processos'] = [];
        let enderecosReais: AutomationData['enderecos'] = [];
        let dadosEmpresa: AutomationData['dadosEmpresa'] = undefined;
        let fonteReal = false;

        // Consultar DATAJUD (processos judiciais reais)
        try {
            const datajudResult = await realApiService.consultarProcessos(cleanDoc);

            if (datajudResult.sucesso && datajudResult.dados) {
                fonteReal = true;
                processosReais = realApiService.formatarProcessos(datajudResult.dados.processos);
                fontesConsultadas.push(...datajudResult.dados.fontes);
            } else {
                fontesConsultadas.push({ nome: 'DATAJUD/CNJ', status: 'Falha' });
            }
        } catch (error) {
            console.error('Erro ao consultar DATAJUD:', error);
            fontesConsultadas.push({ nome: 'DATAJUD/CNJ', status: 'Indisponível' });
        }

        // Se for CNPJ, consultar BrasilAPI
        if (isCnpj) {
            try {
                const cnpjResult = await realApiService.consultarCnpj(cleanDoc);

                if (cnpjResult.sucesso && cnpjResult.dados) {
                    fonteReal = true;
                    const dados = cnpjResult.dados as BrasilApiCnpjResponse;

                    enderecosReais = realApiService.formatarEnderecoCnpj(dados);

                    dadosEmpresa = {
                        razaoSocial: dados.razao_social || '',
                        nomeFantasia: dados.nome_fantasia || '',
                        situacao: dados.descricao_situacao_cadastral || '',
                        atividadePrincipal: dados.cnae_fiscal_descricao || '',
                        capitalSocial: new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        }).format(dados.capital_social || 0),
                        porte: dados.porte || '',
                        naturezaJuridica: dados.natureza_juridica || '',
                        dataAbertura: dados.data_inicio_atividade
                            ? new Date(dados.data_inicio_atividade).toLocaleDateString('pt-BR')
                            : '',
                        socios: realApiService.formatarSocios(dados).map(s => ({
                            nome: s.nome,
                            qualificacao: s.qualificacao
                        }))
                    };

                    fontesConsultadas.push({ nome: 'BrasilAPI/CNPJ', status: 'OK' });

                    // Verificar situação cadastral como indicativo de risco
                    if (dados.situacao_cadastral !== 2) { // 2 = ATIVA
                        fontesConsultadas.push({
                            nome: `⚠️ Situação: ${dados.descricao_situacao_cadastral}`,
                            status: 'Falha'
                        });
                    }
                } else {
                    fontesConsultadas.push({ nome: 'BrasilAPI/CNPJ', status: 'Falha' });
                }
            } catch (error) {
                console.error('Erro ao consultar BrasilAPI:', error);
                fontesConsultadas.push({ nome: 'BrasilAPI/CNPJ', status: 'Indisponível' });
            }
        }

        // Fontes que não temos API gratuita (indicar como simuladas)
        fontesConsultadas.push(
            { nome: 'Serasa (simulado)', status: 'OK' },
            { nome: 'SPC (simulado)', status: 'OK' }
        );

        // ====================================================================
        // FASE 2: Classificar processos encontrados
        // ====================================================================

        let civeis = 0;
        let execucoes = 0;
        let criminais = 0;
        let trabalhistas = 0;
        let processosTJPE = 0;
        let envolvePatrimonial = false;

        if (processosReais && processosReais.length > 0) {
            processosReais.forEach(proc => {
                const classeUpper = (proc.classe || '').toUpperCase();
                const tribunalUpper = (proc.tribunal || '').toUpperCase();

                // Classificar por tipo
                if (classeUpper.includes('CRIMINAL') || classeUpper.includes('PENAL') || classeUpper.includes('CRIME')) {
                    criminais++;
                    if (classeUpper.includes('PATRIMON') || classeUpper.includes('FURTO') || classeUpper.includes('ROUBO') || classeUpper.includes('ESTELION')) {
                        envolvePatrimonial = true;
                    }
                } else if (classeUpper.includes('EXECU') || classeUpper.includes('CUMPRIMENTO DE SENTENÇA')) {
                    execucoes++;
                } else if (classeUpper.includes('TRABALH') || classeUpper.includes('RECLAMAÇÃO')) {
                    trabalhistas++;
                } else {
                    civeis++;
                }

                // Verificar se é TJPE
                if (tribunalUpper.includes('TJPE') || tribunalUpper.includes('8.17')) {
                    processosTJPE++;
                }
            });
        }

        // Se não encontrou processos reais, usar valores simulados mínimos
        if (!fonteReal || processosReais.length === 0) {
            civeis = Math.floor(Math.random() * 2);
            processosTJPE = Math.floor(Math.random() * 2);
        }

        // ====================================================================
        // FASE 3: Montar resultado final
        // ====================================================================

        const restricoes: AutomationData['detalhes_restricoes'] = [];

        // Verificar situação cadastral irregular do CNPJ
        if (dadosEmpresa && dadosEmpresa.situacao !== 'ATIVA') {
            restricoes.push({
                nome: `Situação Cadastral Irregular: ${dadosEmpresa.situacao}`,
                url: 'https://www.gov.br/receitafederal/pt-br'
            });
        }

        // Simulação de restrições de crédito (Serasa/SPC não tem API gratuita)
        const protestoAtivo = Math.random() > 0.85;
        const restricaoGrave = Math.random() > 0.9;
        const scoreBaixo = Math.random() > 0.8;

        if (protestoAtivo) {
            restricoes.push({
                nome: 'Protesto Ativo - Cartório (simulado)',
                url: 'https://pesquisa.cenprotnacional.org.br/'
            });
        }

        return {
            civeis,
            execucoes,
            criminais,
            envolvePatrimonial,
            trabalhistas,
            processosTJPE,
            protestoAtivo,
            restricaoGrave,
            scoreBaixo,
            processos: processosReais,
            fontes_consultadas: fontesConsultadas,
            detalhes_restricoes: restricoes,
            enderecos: enderecosReais.length > 0 ? enderecosReais : [],
            antecedentes: {
                status: 'Consulte online (link abaixo)',
                emissao: new Date().toLocaleDateString('pt-BR'),
                link: 'https://servicos.dpf.gov.br/antecedentes-criminais/certidao'
            },
            dadosEmpresa,
            fonteReal
        };
    }
};
