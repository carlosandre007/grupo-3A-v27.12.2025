
export enum NavItem {
  DASHBOARD = 'dashboard',
  CASH_FLOW = 'cash_flow',
  LOC_MOTTUS = 'loc_mottus',
  IPVA = 'ipva',
  CHARGES = 'charges',
  PROPERTIES = 'properties',
  CLIENTS = 'clients',
  BANKS = 'banks'
}

export interface Bank {
  id: string;
  name: string;
  balance: number;
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
  city: string;
  state: string;
  cnhExpiry?: string;
  observation?: string;
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
  status: 'rented' | 'available';
}

export interface Charge {
  id: string;
  clientName: string;
  ref: string;
  value: number;
  date: string;
  time?: string;
  status: 'received' | 'pending';
  receivedAt?: string;
  frequency?: 'fixed' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  isRecurring?: boolean;
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
