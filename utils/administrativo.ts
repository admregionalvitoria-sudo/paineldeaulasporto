import type { UserRole } from '../types';

export const AGENDA_ROLES: UserRole[] = ['super_admin', 'admin', 'coordenador', 'midia', 'comunicacao'];
export const GESTAO_ROLES: UserRole[] = ['super_admin', 'admin', 'coordenador'];
export type Prioridade = 'urgente' | 'alta' | 'normal';
export interface PrioridadeLimpeza {
  id: string;
  sala: string;
  data: string;
  prioridade: Prioridade;
  observacao: string;
  concluida: boolean;
}
export interface CompromissoPorto {
  id: string;
  titulo: string;
  data: string;
  inicio: string;
  fim: string;
  local: string;
  descricao: string;
}
export const pesoPrioridade: Record<Prioridade, number> = { urgente: 0, alta: 1, normal: 2 };
export { dataLocal } from './datas';
import { dataLocal } from './datas';
export function validarCompromisso(item: Omit<CompromissoPorto, 'id'>) {
  if (!item.titulo.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(item.data)
    || Number.isNaN(new Date(`${item.data}T12:00:00`).getTime())
    || dataLocal(new Date(`${item.data}T12:00:00`)) !== item.data) throw new Error('Informe o título e uma data válida.');
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(item.inicio) || !time.test(item.fim) || item.fim <= item.inicio) throw new Error('O término deve ser depois do início, no mesmo dia.');
}
export function prioridadesDoDia(items: PrioridadeLimpeza[], data: string) {
  return items.filter(item => item.data === data && !item.concluida)
    .sort((a, b) => pesoPrioridade[a.prioridade] - pesoPrioridade[b.prioridade] || a.sala.localeCompare(b.sala, 'pt-BR', { numeric: true }));
}
