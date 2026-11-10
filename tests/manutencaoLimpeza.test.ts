import { describe, it, expect } from 'vitest';
import { estaEmManutencao } from '../utils/ambientes';
import { horarioUso, usosDoDia } from '../utils/limpeza';
import { verificarDisponibilidadeSala } from '../utils/agendamento';
import type { Aula, AgendamentoSala, ManutencaoAmbiente } from '../types';

const manutencao: ManutencaoAmbiente = { id: 'm', sala: ' Sala  1 ', motivo: 'Reforma', inicio: '30/10/2026', fim: '10/11/2026', ativo: true, criadoPor: 'Gestor' };
const aula: Aula = { id: 'a', sala: 'Sala 1', data: '10/11/2026', inicio: '18:30', fim: '19:20', turno: 'Noturno', turma: 'T', instrutor: 'I', unidade_curricular: 'UC' };
const reserva: AgendamentoSala = { id: 'r', sala: 'Sala 1', data: aula.data, turno: 'Noturno', status: 'aprovado', solicitante: 'Professor' };

describe('manutenção', () => {
  it('tem prioridade sobre aula, reserva e pendência na disponibilidade', () => {
    const resultado = verificarDisponibilidadeSala('Sala 1', aula.data, 'Noturno', [aula], [reserva, { ...reserva, id: 'p', status: 'pendente' }], [manutencao]);
    expect(resultado.status).toBe('manutencao');
    expect(resultado.motivoManutencao).toBe('Reforma');
  });
  it('disponibiliza sala após liberação e ignora aula inativa', () => {
    expect(verificarDisponibilidadeSala('Sala 1', aula.data, 'Noturno', [{ ...aula, ativa: false }], [], [{ ...manutencao, ativo: false }]).status).toBe('livre');
  });
  it('normaliza sala e compara limites inclusivos entre meses', () => {
    expect(estaEmManutencao('sala 1', '30/10/2026', [manutencao])?.motivo).toBe('Reforma');
    expect(estaEmManutencao('SALA 1', '10/11/2026', [manutencao])).toBeTruthy();
    expect(estaEmManutencao('Sala 1', '11/11/2026', [manutencao])).toBeUndefined();
    expect(estaEmManutencao('Sala 2', '10/11/2026', [manutencao])).toBeUndefined();
  });
  it('aceita fim indeterminado, ignora liberada e datas inválidas', () => {
    expect(estaEmManutencao('Sala 1', '01/01/2028', [{ ...manutencao, fim: null }])).toBeTruthy();
    expect(estaEmManutencao('Sala 1', aula.data, [{ ...manutencao, ativo: false }])).toBeUndefined();
    expect(estaEmManutencao('Sala 1', '31/02/2026', [manutencao])).toBeUndefined();
  });
});
describe('fila de limpeza', () => {
  it('usa fim informado em vez de prolongar aula curta até 23h', () => {
    const horario = horarioUso('18:30', 'Noturno', '19:20');
    expect(horario.end).toBe(1160);
    expect(horario.fim).toBe('19:20');
    expect(19 * 60 + 21 >= horario.end).toBe(true);
  });
  it('usa padrão quando o fim está ausente ou inválido', () => {
    expect(horarioUso('18:30', 'Noturno').end).toBe(1380);
    expect(horarioUso('18:30', 'Noturno', '99:99').end).toBe(1380);
    expect(horarioUso('', 'Noturno').fim).toBe('22:00');
  });
  it('ignora inativas, outro dia e manutenção, incluindo reserva sem aula', () => {
    expect(usosDoDia(aula.data, [{ ...aula, ativa: false }], [])).toEqual([]);
    expect(usosDoDia('11/11/2026', [aula], [reserva])).toEqual([]);
    expect(usosDoDia(aula.data, [aula], [reserva], [manutencao])).toEqual([]);
    expect(usosDoDia(aula.data, [], [reserva])).toHaveLength(1);
    expect(usosDoDia(aula.data, [], [{ ...reserva, status: 'pendente' }])).toEqual([]);
  });
  it('deduplica aula e reserva da mesma sala/turno, mantendo outro turno', () => {
    expect(usosDoDia(aula.data, [aula], [reserva])).toHaveLength(1);
    expect(usosDoDia(aula.data, [aula], [{ ...reserva, turno: 'Vespertino' }])).toHaveLength(2);
  });
});
