import { Aula, AgendamentoSala } from '../types';
import { formatarNomeSala } from './roomFormatter';

export interface ConflitoHorario {
  tipo: 'aula' | 'agendamento';
  id: string;
  sala: string;
  data: string;
  horario: string;
  turma: string;
  instrutorOuSolicitante: string;
  unidadeCurricularOuMotivo: string;
}

export function tempoEmMinutos(horarioStr: string): number {
  if (!horarioStr || !horarioStr.includes(':')) return 0;
  const [h, m] = horarioStr.split(':').map(Number);
  return (h * 60) + (m || 0);
}

export function faixasHorariasSobrepoem(
  inicioA: string, 
  fimA: string, 
  inicioB: string, 
  fimB: string
): boolean {
  const minInicioA = tempoEmMinutos(inicioA);
  let minFimA = tempoEmMinutos(fimA);
  // Se horário de fim não foi especificado, assume 1 hora após o início
  if (minFimA <= minInicioA) minFimA = minInicioA + 60;

  const minInicioB = tempoEmMinutos(inicioB);
  let minFimB = tempoEmMinutos(fimB);
  if (minFimB <= minInicioB) minFimB = minInicioB + 60;

  return (minInicioA < minFimB && minFimA > minInicioB);
}

export function verificarConflitoAmbiente({
  sala,
  data,
  inicio,
  fim,
  aulas = [],
  agendamentos = [],
  ignoreId
}: {
  sala: string;
  data: string;
  inicio: string;
  fim: string;
  aulas?: Aula[];
  agendamentos?: AgendamentoSala[];
  ignoreId?: string;
}): ConflitoHorario | null {
  const salaNorm = formatarNomeSala(sala).toUpperCase();
  if (!salaNorm || !data || !inicio) return null;

  // 1. Verificar conflitos com aulas cadastradas no cronograma
  for (const aula of aulas) {
    if (ignoreId && aula.id === ignoreId) continue;

    const aulaSalaNorm = formatarNomeSala(aula.sala).toUpperCase();
    if (aulaSalaNorm === salaNorm && aula.data === data) {
      if (faixasHorariasSobrepoem(inicio, fim, aula.inicio, aula.fim)) {
        return {
          tipo: 'aula',
          id: aula.id,
          sala: aulaSalaNorm,
          data: aula.data,
          horario: `${aula.inicio} - ${aula.fim}`,
          turma: aula.turma,
          instrutorOuSolicitante: aula.instrutor,
          unidadeCurricularOuMotivo: aula.unidade_curricular
        };
      }
    }
  }

  // 2. Verificar conflitos com agendamentos aprovados
  for (const ag of agendamentos) {
    if (ignoreId && ag.id === ignoreId) continue;
    if (ag.status !== 'aprovado') continue;

    const agSalaNorm = formatarNomeSala(ag.sala).toUpperCase();
    if (agSalaNorm === salaNorm && ag.data === data) {
      const agInicio = ag.horarioInicio || (ag.turno === 'Matutino' ? '07:00' : ag.turno === 'Vespertino' ? '13:00' : '18:00');
      const agFim = ag.horarioFim || (ag.turno === 'Matutino' ? '11:30' : ag.turno === 'Vespertino' ? '17:30' : '22:00');

      if (faixasHorariasSobrepoem(inicio, fim, agInicio, agFim)) {
        return {
          tipo: 'agendamento',
          id: ag.id,
          sala: agSalaNorm,
          data: ag.data,
          horario: `${agInicio} - ${agFim}`,
          turma: ag.turma || 'Reserva Especial',
          instrutorOuSolicitante: ag.solicitante,
          unidadeCurricularOuMotivo: ag.disciplina || ag.motivo || 'Agendamento Aprovado'
        };
      }
    }
  }

  return null;
}
