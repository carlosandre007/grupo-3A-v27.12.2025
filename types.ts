
export enum NavItem {
  DASHBOARD = 'dashboard',
  CASH_FLOW = 'cash_flow',
  ALERTS = 'alerts',
  SHOPPING_CART = 'shopping_cart',
  LOC_MOTTUS = 'loc_mottus',
  IPVA = 'ipva',
  CHARGES = 'charges',
  PROPERTIES = 'properties',
  CLIENTS = 'clients',
  BANKS = 'banks',
  BACKUP = 'backup'
}

export type RiskClassification = 'Extremo' | 'Muito Alto' | 'Alto' | 'Moderado' | 'Baixo' | 'Mínimo';

export type RiskSourceStatus = 'OK' | 'Falha' | 'Indisponível';

export interface RiskSource {
  nome: string;
  status: RiskSourceStatus;
}

export interface RiskResult {
  nome: string;
  cpf_cnpj: string;
  tipo_locacao: 'Moto' | 'Carro' | 'Imóvel';
  total_processos: number;
  processos_tjpe: number;
  score: number;
  classificacao: RiskClassification;
  aprovado: boolean;
  recomendacao: string;
  processos?: {
    numero: string;
    url: string;
    classe: string;
    tribunal?: string;
    orgao?: string;
    dataAjuizamento?: string;
  }[];
  fontes_consultadas?: RiskSource[];
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


export interface Bank {
  id: string;
  name: string; // nome_conta
  balance: number; // initial balance or cached current balance
  secondary_balance?: number;
  banco?: string;
  responsavel?: string;
  tipo_conta?: string;
  icone_banco?: string;
  created_at?: string;
}

export interface Motorcycle {
  id: string;
  code: string;
  model: string;
  color: string;
  plate: string;
  year: number;
  status: 'available' | 'rented' | 'maintenance';
  km: number;
  photoUrl?: string;
  purchaseValue?: number;
  purchaseKm?: number;
  type: 'moto' | 'carro';
  clientId?: string;
  clientName?: string;
}

export interface IPVARecord {
  id: string;
  vehicle: string;
  type: string;
  plate: string;
  year: number;
  value: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'upcoming';
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  city?: string;
  state?: string;
  observation?: string;
  address?: string;
  cnh?: string;
  cnh_validade?: string;
  motorcycleId?: string;
  status: 'active' | 'approved' | 'not_approved' | 'good_history' | 'bad_history';
}

export interface Property {
  id: string;
  code: string;
  description: string;
  address: string;
  value: number;
  tenant?: string;
  tenantId?: string;
  dueDay?: number;
  status: 'rented' | 'available';
  tipo?: 'imovel' | 'loja';
  next_increase_date?: string;
}

export interface Charge {
  id: string;
  clientName: string;
  ref: string;
  id_categoria_financeira?: string;
  category_id?: string; // For compatibility
  category_name?: string;
  valor_cobranca: number;
  value?: number; // For compatibility
  date: string;
  time?: string;
  status: 'received' | 'pending';
  receivedAt?: string;
  frequency?: 'fixed' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  isRecurring?: boolean;
  observation?: string;
}

export interface ChargeEditLog {
  id: string;
  id_cobranca: string;
  usuario: string;
  campo_editado: string;
  valor_antigo: string;
  valor_novo: string;
  data_hora: string;
}


export interface Fine {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid';
  motorcycleId?: string;
  clientId?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'in' | 'out';
}

export interface MaintenanceAlert {
  id: string;
  type: 'vehicle' | 'property';
  related_item: string; // Plate or property code
  description: string;
  due_date?: string;
  due_km?: number;
  status: 'active' | 'resolved';
  created_at?: string;
}

export interface ShoppingCartItem {
  id: string;
  description: string;
  category: 'piece' | 'material' | 'service' | 'task';
  estimated_value: number;
  origin: 'manual' | 'alert';
  status: 'pending' | 'bought' | 'completed';
  alert_id?: string;
  created_at?: string;
}

export interface ClientAsset {
  id: string;
  cliente_id: string;
  ativo_id: string;
  tipo: 'veiculo' | 'imovel' | 'loja';
  data_vinculo: string;
}

export interface Transaction {
  id: string;
  description: string;
  category: string;
  value: number;
  type: 'in' | 'out';
  date: string;
  id_conta?: string;
  origem?: string;
}

export interface MonthlyBankMovement {
  id: string;
  id_conta: string;
  mes: number;
  ano: number;
  entrada_mes: number;
  saida_mes: number;
  data_atualizacao?: string;
  usuario?: string;
}
