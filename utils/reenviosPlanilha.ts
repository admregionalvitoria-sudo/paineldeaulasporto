import type { AgendamentoSala } from '../types';

/** Seleciona em ordem, sem alterar as reservas nem o conjunto da sessão. */
export function selecionarReenvios(
  reservas: readonly Pick<AgendamentoSala, 'id' | 'planilhaSyncErro'>[],
  jaTentados: ReadonlySet<string>,
  limite: number,
): string[] {
  const ids = new Set<string>();
  for (const reserva of reservas) {
    if (ids.size >= Math.max(0, Math.floor(limite))) break;
    if (reserva.planilhaSyncErro?.trim() && !jaTentados.has(reserva.id)) {
      ids.add(reserva.id);
    }
  }
  return [...ids];
}
