import type { Aula, AgendamentoSala, ManutencaoAmbiente } from '../types';
import { estaEmManutencao, normalizarNomeAmbiente } from './ambientes';

type Turno = 'Matutino' | 'Vespertino' | 'Noturno';
const minutos = (hora?: string): number | null => {
  if (!hora || !/^\d{1,2}:\d{2}$/.test(hora.trim())) return null;
  const [h, m] = hora.trim().split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? h * 60 + m : null;
};
export function horarioUso(inicioInformado?: string, turnoInformado?: string, fimInformado?: string) {
  const turnoNorm = (turnoInformado || '').trim().toLowerCase();
  const turnoPadrao: Turno = turnoNorm === 'vespertino' || turnoNorm === 'tarde' ? 'Vespertino' : turnoNorm === 'noturno' || turnoNorm === 'noite' ? 'Noturno' : 'Matutino';
  const padrao = { Matutino: [420, 690], Vespertino: [780, 1050], Noturno: [1080, 1320] }[turnoPadrao];
  const inicioValido = minutos(inicioInformado);
  const start = inicioValido ?? padrao[0];
  const fimValido = minutos(fimInformado);
  const end = fimValido !== null && fimValido > start ? fimValido : inicioValido !== null ? start + 270 : padrao[1];
  const formatar = (valor: number) => `${String(Math.floor(valor / 60)).padStart(2, '0')}:${String(valor % 60).padStart(2, '0')}`;
  const turno: Turno = turnoInformado ? turnoPadrao : start >= 1080 ? 'Noturno' : start >= 720 ? 'Vespertino' : 'Matutino';
  return { inicio: formatar(start), fim: formatar(end), start, end, turno };
}

export function usosDoDia(data: string, aulas: Aula[], agendamentos: AgendamentoSala[], manutencoes: ManutencaoAmbiente[] = []): Aula[] {
  const usos = aulas.filter(a => a.ativa !== false && a.data?.trim() === data && !estaEmManutencao(a.sala, data, manutencoes));
  const reservas = agendamentos.filter(a => a.status === 'aprovado' && a.data?.trim() === data && !estaEmManutencao(a.sala, data, manutencoes));
  return [...usos, ...reservas.filter(ag => !usos.some(a => normalizarNomeAmbiente(a.sala) === normalizarNomeAmbiente(ag.sala) && horarioUso(a.inicio, a.turno, a.fim).turno === horarioUso(ag.horarioInicio, ag.turno, ag.horarioFim).turno)).map(ag => ({
    id: `reserva-${ag.id}`, sala: ag.sala, data: ag.data, turno: ag.turno,
    inicio: ag.horarioInicio || '', fim: ag.horarioFim || '', turma: ag.turma || 'Reserva',
    instrutor: ag.solicitante, unidade_curricular: ag.disciplina || ag.motivo || 'Reserva aprovada'
  }))];
}
