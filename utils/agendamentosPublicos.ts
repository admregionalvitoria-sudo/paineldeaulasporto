import type { AgendamentoSala, AgendamentoPublico } from '../types';

type Origem = Partial<AgendamentoSala>;
/** Lista explícita: nunca propagar campos privados, mesmo vindos de documentos legados. */
export function montarAgendamentoPublico(ag: Origem): AgendamentoPublico {
  return {
    sala: ag.sala || '', data: ag.data || '', turno: ag.turno || 'Matutino',
    horarioInicio: ag.horarioInicio || '', horarioFim: ag.horarioFim || '',
    status: ag.status || 'pendente', criarAulaAoAprovar: ag.criarAulaAoAprovar ?? true,
    turma: ag.turma || '', atualizadoEm: ag.atualizadoEm ?? ag.criadoEm ?? null,
  };
}

function canonico(valor: any): string {
  if (valor?.toMillis) return String(valor.toMillis());
  if (valor && typeof valor === 'object') {
    return JSON.stringify(Object.keys(valor).sort().map(chave => [chave, canonico(valor[chave])]));
  }
  return JSON.stringify(valor);
}

/** Comparar também as chaves remove eventuais campos indevidos do espelho. */
export function planejarBackfillAgendamentos(
  completos: (Origem & { id: string })[], publicos: ({ id: string } & Record<string, any>)[],
) {
  const existentes = new Map(publicos.map(({ id, ...dados }) => [id, dados]));
  const criar: { id: string; dados: AgendamentoPublico }[] = [];
  const atualizar: typeof criar = [];
  for (const ag of completos) {
    const dados = montarAgendamentoPublico(ag);
    if (!existentes.has(ag.id)) criar.push({ id: ag.id, dados });
    else if (canonico(existentes.get(ag.id)) !== canonico(dados)) atualizar.push({ id: ag.id, dados });
    existentes.delete(ag.id);
  }
  return { criar, atualizar, remover: [...existentes.keys()] };
}
