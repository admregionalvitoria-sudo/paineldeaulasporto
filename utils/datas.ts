/** Datas de calendário usam o fuso local, sem conversão para UTC. */
export function dataLocal(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Limite de calendário para uma futura consulta de aulas após unificar datas.
 * Não aplicar uma faixa no Firestore enquanto houver datas DD/MM/AAAA.
 */
export function limiteDataAulas(hoje = new Date()): string {
  const limite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  limite.setDate(limite.getDate() - 8);
  return dataLocal(limite);
}

export function dataISO(data: string): string {
  if (!data?.includes('/')) return data || '';
  const [dia, mes, ano] = data.trim().split('/');
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

export function dataBR(data: string): string {
  const [ano, mes, dia] = dataISO(data).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Período de aulas que cada tipo de tela precisa baixar. */
export type JanelaAulas = 'painel' | 'limpeza' | 'completa';

/**
 * - painel (TVs e painel do cliente): só hoje e amanhã.
 * - limpeza: de 8 dias atrás (a fila olha até 7) até amanhã.
 * - completa (gestão e agendamento): de 8 dias atrás em diante, para conferir conflitos em qualquer data futura.
 */
export function janelaDeAulas(tipo: JanelaAulas, hoje = new Date()): { de: string; ate?: string } {
  const dia = (deslocamento: number) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    data.setDate(data.getDate() + deslocamento);
    return dataLocal(data);
  };
  if (tipo === 'painel') return { de: dia(0), ate: dia(1) };
  if (tipo === 'limpeza') return { de: dia(-8), ate: dia(1) };
  return { de: dia(-8) };
}