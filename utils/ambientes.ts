import type { ManutencaoAmbiente } from '../types';

export const normalizarNomeAmbiente = (nome: string): string => (nome || '').trim().replace(/\s+/g, ' ').toUpperCase();

export function dataBRNumero(data: string): number {
  const [d, m, a] = (data || '').split('/').map(Number);
  const date = new Date(a, m - 1, d);
  return date.getFullYear() === a && date.getMonth() === m - 1 && date.getDate() === d ? a * 10000 + m * 100 + d : 0;
}

export function estaEmManutencao(sala: string, data: string, manutencoes: ManutencaoAmbiente[] = []): ManutencaoAmbiente | undefined {
  const dia = dataBRNumero(data);
  if (!dia) return undefined;
  return manutencoes.find(m => m.ativo && normalizarNomeAmbiente(m.sala) === normalizarNomeAmbiente(sala) &&
    dataBRNumero(m.inicio) > 0 && dataBRNumero(m.inicio) <= dia && (!m.fim || dataBRNumero(m.fim) >= dia));
}
