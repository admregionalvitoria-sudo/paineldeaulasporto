import { describe, expect, it, vi } from 'vitest';
import type { AgendamentoSala, ReservaPublica } from '../types';
import { montarAgendamentoPublico, planejarBackfillAgendamentos } from '../utils/agendamentosPublicos';
import { criarAssinaturas } from '../utils/assinaturas';
import { verificarDisponibilidadeSala } from '../utils/agendamento';
import { montarFilaLimpeza } from '../utils/limpeza';

const completo: AgendamentoSala = {
  id: 'r', sala: 'Sala 2', data: '16/11/2026', turno: 'Vespertino',
  horarioInicio: '13:00', horarioFim: '17:00', status: 'aprovado', turma: 'T1',
  solicitante: 'Pessoa', emailSolicitante: 'pessoa@senai.br', telefoneSolicitante: '27999999999',
  notificarWhatsapp: true, consentimentoWhatsappEm: '2026-11-11', consentimentoWhatsappTexto: 'Aceito',
  motivo: 'Privado', observacaoDecisao: 'Privada', motivoRejeicao: 'Privado',
  criadoEm: 123, atualizadoEm: 456, criarAulaAoAprovar: false,
};
const publico = (patch: Partial<ReservaPublica> = {}): ReservaPublica => ({ id: completo.id, ...montarAgendamentoPublico(completo), ...patch });

describe('espelho público', () => {
  it('usa somente a lista explícita de campos, sem mutar a origem', () => {
    const antes = { ...completo };
    expect(montarAgendamentoPublico(completo)).toEqual({
      sala: 'Sala 2', data: '16/11/2026', turno: 'Vespertino', horarioInicio: '13:00',
      horarioFim: '17:00', status: 'aprovado', turma: 'T1', criarAulaAoAprovar: false, atualizadoEm: 456,
    });
    expect(completo).toEqual(antes);
    expect(Object.values(montarAgendamentoPublico(completo))).not.toContain('Privado');
  });
  it('normaliza legados sem undefined e mantém pendentes', () => {
    expect(montarAgendamentoPublico({ criadoEm: 123 })).toEqual({
      sala: '', data: '', turno: 'Matutino', horarioInicio: '', horarioFim: '',
      status: 'pendente', turma: '', criarAulaAoAprovar: true, atualizadoEm: 123,
    });
    expect(montarAgendamentoPublico({}).atualizadoEm).toBeNull();
  });
  it('planeja criar, atualizar, remover e ignora iguais, inclusive timestamps equivalentes', () => {
    const manter = { ...completo, id: 'manter', atualizadoEm: { toMillis: () => 456 } };
    const plano = planejarBackfillAgendamentos([completo, { ...completo, id: 'criar' }, manter], [
      publico({ status: 'pendente' }), { ...publico(), id: 'remover' },
      { ...publico(), id: 'manter', atualizadoEm: { toMillis: () => 456 } },
    ]);
    expect(plano.criar).toEqual([{ id: 'criar', dados: montarAgendamentoPublico(completo) }]);
    expect(plano.atualizar).toEqual([{ id: 'r', dados: montarAgendamentoPublico(completo) }]);
    expect(plano.remover).toEqual(['remover']);
  });
  it('substitui espelhos que contenham campos pessoais indevidos', () => {
    expect(planejarBackfillAgendamentos([completo], [{ ...publico(), solicitante: 'Vazamento' }]).atualizar).toHaveLength(1);
    expect(planejarBackfillAgendamentos([], [publico()]).remover).toEqual(['r']);
  });
});

describe('consumidores do subconjunto', () => {
  it('mantém disponibilidade para aprovadas, pendentes, recusadas e prioridade das aulas', () => {
    for (const [status, esperado] of [['aprovado', 'reservada'], ['pendente', 'pendente'], ['rejeitado', 'livre']] as const) {
      expect(verificarDisponibilidadeSala('Sala 2', completo.data, completo.turno, [], [publico({ status })]).status).toBe(esperado);
    }
    const aula = { id: 'a', sala: completo.sala, data: completo.data, turno: completo.turno, turma: 'T', instrutor: 'P', unidade_curricular: 'UC', inicio: '13:00', fim: '17:00' };
    expect(verificarDisponibilidadeSala('Sala 2', completo.data, completo.turno, [aula], [publico()]).status).toBe('ocupada_aula');
  });
  it('monta limpeza só com aprovadas, preserva turma, horários e deduplicação', () => {
    const params = { hoje: '2026-11-16', agora: new Date(2026, 10, 16, 14), aulas: [], agendamentos: [publico(), publico({ id: 'duplicada' }), publico({ id: 'pendente', sala: 'Sala 3', status: 'pendente' }), publico({ id: 'recusada', sala: 'Sala 4', status: 'rejeitado' })] };
    const { fila } = montarFilaLimpeza(params);
    expect(fila).toHaveLength(1);
    expect(fila[0].cleaningStatus).toBe('em_aula');
    expect(fila[0].classesHoje).toHaveLength(1);
    expect(fila[0].classesHoje[0].aula).toMatchObject({ turma: 'T1', inicio: '13:00', fim: '17:00', instrutor: '', unidade_curricular: 'Reserva aprovada' });
  });
});

describe('assinaturas por referência', () => {
  it('abre na primeira, compartilha, cancela na última e permite reabrir', () => {
    const cancelar = vi.fn();
    const iniciar = vi.fn(() => cancelar);
    const gestor = criarAssinaturas<string>(iniciar);
    expect(iniciar).not.toHaveBeenCalled();
    const a = gestor.assinar('publico'); const b = gestor.assinar('publico');
    expect(iniciar).toHaveBeenCalledTimes(1);
    a(); a(); expect(cancelar).not.toHaveBeenCalled();
    b(); expect(cancelar).toHaveBeenCalledTimes(1);
    gestor.assinar('publico')();
    expect(iniciar).toHaveBeenCalledTimes(2);
    expect(cancelar).toHaveBeenCalledTimes(2);
  });
  it('isola modos, libera provider e tolera limpeza dupla do StrictMode', () => {
    const publico = vi.fn(); const completo = vi.fn();
    const iniciar = vi.fn((modo: string) => modo === 'publico' ? publico : completo);
    const gestor = criarAssinaturas(iniciar);
    const antigo = gestor.assinar('publico'); gestor.assinar('completo');
    gestor.cancelarTodas(); gestor.cancelarTodas();
    expect(publico).toHaveBeenCalledTimes(1); expect(completo).toHaveBeenCalledTimes(1);
    const novo = gestor.assinar('publico'); antigo();
    expect(publico).toHaveBeenCalledTimes(1);
    novo(); expect(publico).toHaveBeenCalledTimes(2);
  });
});
