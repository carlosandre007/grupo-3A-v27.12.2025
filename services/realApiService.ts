/**
 * Serviço de APIs Reais — Integração com fontes públicas gratuitas
 * 
 * APIs integradas:
 * 1. DATAJUD (CNJ) — Processos judiciais de todos os tribunais do Brasil
 * 2. BrasilAPI — Dados cadastrais de empresas (CNPJ)
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface DatajudProcesso {
    numeroProcesso: string;
    classe: { nome: string; codigo: number };
    tribunal: string;
    orgaoJulgador: { nome: string };
    dataAjuizamento: string;
    grau: string;
    movimentos?: { nome: string; dataHora: string }[];
}

export interface DatajudResponse {
    hits: {
        total: { value: number };
        hits: {
            _source: DatajudProcesso;
        }[];
    };
}

export interface BrasilApiCnpjResponse {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    situacao_cadastral: number;
    descricao_situacao_cadastral: string;
    data_situacao_cadastral: string;
    data_inicio_atividade: string;
    cnae_fiscal_descricao: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    ddd_telefone_1: string;
    email: string | null;
    capital_social: number;
    porte: string;
    natureza_juridica: string;
    qsa: {
        nome_socio: string;
        qualificacao_socio: string;
        cnpj_cpf_do_socio: string;
    }[];
    descricao_tipo_de_logradouro: string;
    descricao_motivo_situacao_cadastral: string;
}

export interface ConsultaRealResult {
    fonte: string;
    sucesso: boolean;
    dados: any;
    erro?: string;
}

// ============================================================================
// DATAJUD — API Pública do CNJ
// ============================================================================

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br/api_publica_';

/**
 * Busca processos no DATAJUD por número de documento (CPF/CNPJ)
 * Consulta os tribunais mais relevantes para PE
 */
async function consultarDatajud(cpfCnpj: string): Promise<ConsultaRealResult> {
    const cleanDoc = cpfCnpj.replace(/\D/g, '');

    // Tribunais a consultar (priorizando PE e os mais relevantes)
    const tribunais = [
        { sigla: 'tjpe', nome: 'TJPE' },
        { sigla: 'tjsp', nome: 'TJSP' },
        { sigla: 'trf5', nome: 'TRF5' }
    ];

    const todosProcessos: DatajudProcesso[] = [];
    const fontesStatus: { nome: string; status: 'OK' | 'Falha' | 'Indisponível' }[] = [];

    for (const tribunal of tribunais) {
        try {
            const response = await fetch(`${DATAJUD_BASE_URL}${tribunal.sigla}/_search`, {
                method: 'POST',
                headers: {
                    'Authorization': `APIKey ${DATAJUD_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: {
                        match: {
                            numeroProcesso: cleanDoc
                        }
                    },
                    size: 10
                })
            });

            if (response.ok) {
                const data: DatajudResponse = await response.json();
                if (data.hits && data.hits.hits) {
                    data.hits.hits.forEach(hit => {
                        todosProcessos.push(hit._source);
                    });
                }
                fontesStatus.push({ nome: `DATAJUD/${tribunal.nome}`, status: 'OK' });
            } else {
                fontesStatus.push({ nome: `DATAJUD/${tribunal.nome}`, status: 'Falha' });
            }
        } catch (error) {
            console.warn(`Erro ao consultar DATAJUD/${tribunal.nome}:`, error);
            fontesStatus.push({ nome: `DATAJUD/${tribunal.nome}`, status: 'Indisponível' });
        }
    }

    return {
        fonte: 'DATAJUD/CNJ',
        sucesso: fontesStatus.some(f => f.status === 'OK'),
        dados: {
            processos: todosProcessos,
            fontes: fontesStatus,
            total: todosProcessos.length
        }
    };
}

// ============================================================================
// BRASILAPI — Dados de CNPJ
// ============================================================================

async function consultarBrasilApiCnpj(cnpj: string): Promise<ConsultaRealResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);

        if (response.ok) {
            const data: BrasilApiCnpjResponse = await response.json();
            return {
                fonte: 'BrasilAPI/CNPJ',
                sucesso: true,
                dados: data
            };
        } else {
            const errorData = await response.json().catch(() => ({}));
            return {
                fonte: 'BrasilAPI/CNPJ',
                sucesso: false,
                dados: null,
                erro: (errorData as any)?.message || `Erro HTTP ${response.status}`
            };
        }
    } catch (error) {
        return {
            fonte: 'BrasilAPI/CNPJ',
            sucesso: false,
            dados: null,
            erro: 'Falha na conexão com BrasilAPI'
        };
    }
}

// ============================================================================
// SERVIÇO PRINCIPAL — Exportações
// ============================================================================

export const realApiService = {

    /**
     * Consulta processos judiciais reais no DATAJUD
     */
    async consultarProcessos(cpfCnpj: string) {
        return consultarDatajud(cpfCnpj);
    },

    /**
     * Consulta dados cadastrais de empresa via CNPJ
     */
    async consultarCnpj(cnpj: string) {
        return consultarBrasilApiCnpj(cnpj);
    },

    /**
     * Formata processos do DATAJUD para o formato do nosso sistema
     */
    formatarProcessos(processos: DatajudProcesso[]) {
        return processos.map(proc => ({
            numero: proc.numeroProcesso,
            classe: proc.classe?.nome || 'Não informado',
            url: `https://www.cnj.jus.br/pjecnj/ConsultaPublica/listView.seam?numero=${proc.numeroProcesso}`,
            tribunal: proc.tribunal,
            orgao: proc.orgaoJulgador?.nome || '',
            dataAjuizamento: proc.dataAjuizamento
                ? new Date(proc.dataAjuizamento).toLocaleDateString('pt-BR')
                : '',
            grau: proc.grau || ''
        }));
    },

    /**
     * Extrai endereço de um CNPJ da BrasilAPI
     */
    formatarEnderecoCnpj(dados: BrasilApiCnpjResponse) {
        if (!dados) return [];
        return [{
            logradouro: `${dados.descricao_tipo_de_logradouro || ''} ${dados.logradouro}, ${dados.numero}${dados.complemento ? ' - ' + dados.complemento : ''}`.trim(),
            bairro: dados.bairro || '',
            cidade: dados.municipio || '',
            uf: dados.uf || '',
            atual: true
        }];
    },

    /**
     * Extrai sócios de um CNPJ da BrasilAPI
     */
    formatarSocios(dados: BrasilApiCnpjResponse) {
        if (!dados?.qsa) return [];
        return dados.qsa.map(s => ({
            nome: s.nome_socio,
            qualificacao: s.qualificacao_socio,
            documento: s.cnpj_cpf_do_socio
        }));
    }
};
