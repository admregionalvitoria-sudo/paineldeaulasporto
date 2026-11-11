import type { Aula, ReservaPublica, ManutencaoAmbiente, ObservacaoLimpeza } from '../types';
import { estaEmManutencao, normalizarNomeAmbiente } from './ambientes';
import { dataBR, dataISO, dataLocal } from './datas';
import { pesoPrioridade, prioridadesDoDia, type PrioridadeLimpeza } from './administrativo';
import { formatarNomeSala } from './roomFormatter';

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

export function usosDoDia(data: string, aulas: Aula[], agendamentos: ReservaPublica[], manutencoes: ManutencaoAmbiente[] = []): Aula[] {
  const dia = dataBR(data);
  const aulasDoDia = aulas.filter(a => dataISO(a.data) === dataISO(data));
  const usos = aulasDoDia.filter(a => a.ativa !== false && !estaEmManutencao(a.sala, dia, manutencoes));
  // Uma aula inativada também representa uma reserva já convertida; não a reativar.
  const chave = (sala: string, turno: string) => `${normalizarNomeAmbiente(sala)}|${turno}`;
  const vistas = new Set(aulasDoDia.map(a => chave(a.sala, horarioUso(a.inicio, a.turno, a.fim).turno)));
  for (const ag of agendamentos) {
    if (ag.status !== 'aprovado' || dataISO(ag.data) !== dataISO(data) || estaEmManutencao(ag.sala, dia, manutencoes)) continue;
    const key = chave(ag.sala, horarioUso(ag.horarioInicio, ag.turno, ag.horarioFim).turno);
    if (vistas.has(key)) continue;
    vistas.add(key);
    usos.push({ id: `reserva-${ag.id}`, sala: ag.sala, data: dia, turno: ag.turno,
      inicio: ag.horarioInicio || '', fim: ag.horarioFim || '', turma: ag.turma || 'Reserva',
      instrutor: '', unidade_curricular: 'Reserva aprovada' });
  }
  return usos;
}

export const getNomeCurtoSala = (sala: string): string => (formatarNomeSala(sala) || sala || '').split(' — ')[0].trim();
export interface RoomClassInfo {
  aula: Aula;
  inicio: string;
  fim: string;
  startMinutes: number;
  endMinutes: number;
  turno: Turno;
}
export interface RoomCleanItem {
  sala: string;
  nomeCurto: string;
  norm: string;
  classesHoje: RoomClassInfo[];
  currentClassHoje: RoomClassInfo | null;
  nextClassHoje: RoomClassInfo | null;
  turnosHoje: { turno: Turno; status: 'em_aula' | 'aguardando' | 'concluido' }[];
  cleaningStatus: 'aguardando_limpeza' | 'em_aula' | 'livre';
  prioridade?: PrioridadeLimpeza;
  observacao?: ObservacaoLimpeza;
  fontes: ('ontem' | 'hoje' | 'prioridade' | 'aviso')[];
  motivos: string[];
}

interface FilaParams {
  hoje: string;
  agora: Date;
  aulas: Aula[];
  agendamentos: ReservaPublica[];
  manutencoes?: ManutencaoAmbiente[];
  prioridades?: PrioridadeLimpeza[];
  observacoes?: Record<string, ObservacaoLimpeza>;
}

/** Fonte de verdade: estado efetivo do painel. Não lê planilhas nem altera entradas. */
export function montarFilaLimpeza({ hoje, agora, aulas, agendamentos, manutencoes = [], prioridades = [], observacoes = {} }: FilaParams) {
  const dia = dataBR(hoje);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const usadasHoje = usosDoDia(dia, aulas, agendamentos, manutencoes);
  let referencia: string | null = null;
  let usadasAntes: Aula[] = [];
  const anterior = new Date(`${dataISO(hoje)}T12:00:00`);
  for (let i = 1; i <= 7; i++) {
    anterior.setDate(anterior.getDate() - 1);
    const data = dataBR(dataLocal(anterior));
    const usos = usosDoDia(data, aulas, agendamentos, manutencoes);
    if (usos.length) { referencia = data; usadasAntes = usos; break; }
  }
  const salas = new Map<string, RoomCleanItem>();
  function incluir(sala: string, fonte: RoomCleanItem['fontes'][number]) {
    if (!sala?.trim() || estaEmManutencao(sala, dia, manutencoes)) return;
    const norm = normalizarNomeAmbiente(sala);
    if (!salas.has(norm)) salas.set(norm, { sala: formatarNomeSala(sala) || sala, norm, nomeCurto: getNomeCurtoSala(sala), classesHoje: [], currentClassHoje: null, nextClassHoje: null, turnosHoje: [], cleaningStatus: 'aguardando_limpeza', fontes: [], motivos: [] });
    const room = salas.get(norm)!;
    if (!room.fontes.includes(fonte)) room.fontes.push(fonte);
    return room;
  }
  usadasAntes.forEach(a => incluir(a.sala, 'ontem'));
  usadasHoje.forEach(a => {
    const room = incluir(a.sala, 'hoje');
    const h = horarioUso(a.inicio, a.turno, a.fim);
    room?.classesHoje.push({ aula: a, inicio: h.inicio, fim: h.fim, startMinutes: h.start, endMinutes: h.end, turno: h.turno });
  });
  prioridadesDoDia(prioridades, dataISO(hoje)).forEach(p => {
    const room = incluir(p.sala, 'prioridade');
    if (room && !room.prioridade) room.prioridade = p;
  });
  Object.values(observacoes).forEach(o => {
    if (!o.observacao?.trim()) return;
    const room = incluir(o.sala, 'aviso');
    if (room) room.observacao = o;
  });
  for (const room of salas.values()) {
    room.classesHoje.sort((a, b) => a.startMinutes - b.startMinutes);
    room.currentClassHoje = room.classesHoje.find(c => c.startMinutes <= minutosAgora && minutosAgora < c.endMinutes) || null;
    room.nextClassHoje = room.classesHoje.find(c => c.startMinutes > minutosAgora) || null;
    for (const turno of ['Matutino', 'Vespertino', 'Noturno'] as const) {
      const classes = room.classesHoje.filter(c => c.turno === turno);
      if (classes.length) room.turnosHoje.push({ turno, status: classes.some(c => c.startMinutes <= minutosAgora && minutosAgora < c.endMinutes) ? 'em_aula' : classes.some(c => c.startMinutes > minutosAgora) ? 'aguardando' : 'concluido' });
    }
    room.cleaningStatus = room.currentClassHoje ? 'em_aula' : room.nextClassHoje || room.prioridade || room.observacao || !room.classesHoje.length ? 'aguardando_limpeza' : 'livre';
    if (room.fontes.includes('ontem')) {
      const turnos = [...new Set(usadasAntes.filter(a => normalizarNomeAmbiente(a.sala) === room.norm).map(a => horarioUso(a.inicio, a.turno, a.fim).turno))];
      room.motivos.push(`Usada em ${referencia!.slice(0, 5)} (${turnos.join(', ')})`);
    }
    if (room.fontes.includes('hoje')) room.motivos.push(`Hoje: ${room.turnosHoje.map(t => t.turno).join(', ')}`);
    if (room.nextClassHoje) room.motivos.push(`Limpar antes do turno ${room.nextClassHoje.turno}`);
    if (room.prioridade) room.motivos.push(`Prioridade ${room.prioridade.prioridade}`);
    if (room.observacao) room.motivos.push('Aviso da gestão');
  }
  const ordem = { aguardando_limpeza: 0, em_aula: 1, livre: 2 };
  const fila = [...salas.values()].sort((a, b) => {
    const prioridade = (a.prioridade ? pesoPrioridade[a.prioridade.prioridade] : 3) - (b.prioridade ? pesoPrioridade[b.prioridade.prioridade] : 3);
    if (prioridade) return prioridade;
    const aviso = Number(!!b.observacao) - Number(!!a.observacao);
    if (aviso) return aviso;
    const status = ordem[a.cleaningStatus] - ordem[b.cleaningStatus];
    if (status) return status;
    if (a.cleaningStatus === 'aguardando_limpeza') {
      const hora = (a.nextClassHoje?.startMinutes ?? Infinity) - (b.nextClassHoje?.startMinutes ?? Infinity);
      if (hora) return hora;
    }
    return a.nomeCurto.localeCompare(b.nomeCurto, 'pt-BR', { numeric: true });
  });
  const emManutencao = new Set(manutencoes.filter(m => estaEmManutencao(m.sala, dia, [m])).map(m => normalizarNomeAmbiente(m.sala))).size;
  return { fila, referencia, emManutencao };
}
