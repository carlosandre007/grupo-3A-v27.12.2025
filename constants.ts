
import { Motorcycle, IPVARecord, Client, Property, Charge } from './types';

export const MOCK_MOTORCYCLES: Motorcycle[] = [
  { id: '1', code: 'M001', model: 'Honda CG 160 Fan', color: 'Vermelha', plate: 'BRA-2E19', year: 2023, status: 'rented', km: 12450 },
  { id: '2', code: 'M002', model: 'Yamaha Factor 150', color: 'Preta', plate: 'RTO-9X22', year: 2022, status: 'available', km: 24100 },
  { id: '3', code: 'M003', model: 'Honda CG 160 Start', color: 'Branca', plate: 'QWE-5544', year: 2024, status: 'rented', km: 5200 },
  { id: '4', code: 'M004', model: 'Honda Biz 125', color: 'Prata', plate: 'HGT-8812', year: 2023, status: 'maintenance', km: 18900 },
  { id: '5', code: 'M005', model: 'Honda CG 160 Fan', color: 'Vermelha', plate: 'OPL-1123', year: 2021, status: 'available', km: 32100 },
];

export const MOCK_IPVA: IPVARecord[] = [
  { id: '1', vehicle: 'Honda CG 160 Fan', type: 'Motocicleta', plate: 'ABC-1234', year: 2022, value: 450, dueDate: '2023-10-15', status: 'pending' },
  { id: '2', vehicle: 'Yamaha Fazer 250', type: 'Motocicleta', plate: 'XYZ-9876', year: 2021, value: 620, dueDate: '2023-09-20', status: 'overdue' },
  { id: '3', vehicle: 'Honda Elite 125', type: 'Motocicleta', plate: 'ELT-4567', year: 2023, value: 380, dueDate: '2023-11-10', status: 'paid' },
  { id: '4', vehicle: 'Fiat Fiorino', type: 'Utilitário', plate: 'FIO-1122', year: 2020, value: 1200, dueDate: '2023-12-25', status: 'upcoming' },
];

export const MOCK_CLIENTS: Client[] = [
  { id: '1', name: 'Antonio Silva', cpf: '123.456.789-00', phone: '(11) 98765-4321', city: 'São Paulo', state: 'SP', cnhExpiry: '2023-10-25', status: 'active' },
  { id: '2', name: 'Maria Julia', cpf: '222.333.444-55', phone: '(21) 99999-8888', city: 'Rio de Janeiro', state: 'RJ', cnhExpiry: '2026-05-12', status: 'active' },
  { id: '3', name: 'Roberto Carlos', cpf: '098.765.432-10', phone: '(31) 91234-5678', city: 'Belo Horizonte', state: 'MG', cnhExpiry: '2025-08-20', status: 'active' },
  { id: '4', name: 'Fernanda Brandão', cpf: '555.666.777-88', phone: '(41) 99887-7665', city: 'Curitiba', state: 'PR', cnhExpiry: '2023-11-18', status: 'pending_docs' },
];

export const MOCK_PROPERTIES: Property[] = [
  { id: '1', code: 'IM-01', description: 'Apartamento Centro', address: 'R. das Flores, 123', value: 1200, tenant: 'João Silva', status: 'rented' },
  { id: '2', code: 'IM-02', description: 'Sala Comercial', address: 'Av. Brasil, 500 - Sala 101', value: 2500, status: 'available' },
  { id: '3', code: 'IM-03', description: 'Casa Jardim Verde', address: 'R. das Palmeiras, 88', value: 1800, tenant: 'Maria Oliveira', status: 'rented' },
  { id: '4', code: 'IM-04', description: 'Galpão Industrial', address: 'Rodovia BR-101, Km 50', value: 5000, status: 'available' },
];

export const MOCK_CHARGES: Charge[] = [
  { id: '1', clientName: 'Jorge Silva', ref: 'IPVA', value: 450, date: '2023-10-23', status: 'received', receivedAt: '09:15' },
  { id: '2', clientName: 'Ana Costa', ref: 'Rent', value: 1200, date: '2023-10-23', status: 'pending' },
  { id: '3', clientName: 'Moto Clube X', ref: 'Services', value: 3500, date: '2023-10-24', status: 'pending', time: '14:00' },
  { id: '4', clientName: 'Carlos Ruiz', ref: 'Maintenance', value: 800, date: '2023-10-25', status: 'pending', time: '09:00' },
];

export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
