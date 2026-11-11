import type { Aula } from '../types';
import { normalizarNomeAmbiente } from './ambientes';
import { dataISO } from './datas';
import { horarioUso } from './limpeza';

export function chaveAula(aula: Pick<Aula, 'sala' | 'data' | 'turno' | 'inicio' | 'fim'>): string {
  return `${normalizarNomeAmbiente(aula.sala)}|${dataISO(aula.data)}|${horarioUso(aula.inicio, aula.turno, aula.fim).turno}`;
}

/** Planeja a substituição sem modificar entradas nem tocar no histórico/ajustes. */
export function planejarImportacaoAulas(atuais: Aula[], csv: Omit<Aula, 'id'>[], hoje: string) {
  const dia = dataISO(hoje);
  const ajustes = atuais.filter(a => dataISO(a.data) >= dia && a.modificadoManualmente === true);
  const protegidas = new Set(ajustes.map(chaveAula));
  const vistas = new Set<string>();
  const inserir = csv.filter(a => {
    const chave = chaveAula(a);
    if (dataISO(a.data) < dia || protegidas.has(chave) || vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  }).map(a => ({ ...a, origem: 'csv' as const, modificadoManualmente: false }));
  return {
    excluirIds: atuais.filter(a => dataISO(a.data) >= dia && a.modificadoManualmente !== true).map(a => a.id),
    inserir,
    preservadas: ajustes.length,
    historicas: atuais.filter(a => dataISO(a.data) < dia).length,
  };
}
