import { describe, expect, it } from 'vitest';
import type { AgendamentoSala, Aula, ManutencaoAmbiente } from '../types';
import { montarFilaLimpeza, usosDoDia } from '../utils/limpeza';
import type { PrioridadeLimpeza } from '../utils/administrativo';

const aula = (patch: Partial<Aula> = {}): Aula => ({
  id: 'a', sala: 'Sala 1', data: '16/11/2026', inicio: '08:00', fim: '10:00', turno: 'Matutino',
  turma: 'T', instrutor: 'Professor', unidade_curricular: 'UC', ...patch,
});
const reserva = (patch: Partial<AgendamentoSala> = {}): AgendamentoSala => ({
  id: 'r', sala: 'Sala 2', data: '16/11/2026', horarioInicio: '13:00', horarioFim: '14:10', turno: 'Vespertino',
  solicitante: 'Professora', emailSolicitante: 'professora@senai.br', notificarWhatsapp: false, status: 'aprovado', ...patch,
});
const manutencao = (patch: Partial<ManutencaoAmbiente> = {}): ManutencaoAmbiente => ({
  id: 'm', sala: 'Sala 1', inicio: '16/11/2026', fim: '17/11/2026', motivo: 'Obra', ativo: true, criadoPor: 'Gestor', ...patch,
});
const prioridade = (patch: Partial<PrioridadeLimpeza> = {}): PrioridadeLimpeza => ({
  id: 'p', sala: 'Sala 3', data: '2026-11-16', prioridade: 'alta', concluida: false, observacao: 'Preparar', ...patch,
});
const parametros = { hoje: '2026-11-16', agora: new Date(2026, 10, 16, 7, 0), aulas: [] as Aula[], agendamentos: [] as AgendamentoSala[] };

describe('uso efetivo do painel', () => {
  it('usa somente as aulas existentes e ativas na data, sem depender do CSV', () => {
    const removida = aula({ id: 'removida' });
    const antesDaExclusao = [removida, aula({ id: 'ativa' }), aula({ id: 'inativa', ativa: false }), aula({ id: 'outro-dia', data: '15/11/2026' })];
    expect(usosDoDia('16/11/2026', antesDaExclusao, [])).toHaveLength(2);
    const painel = antesDaExclusao.filter(a => a.id !== removida.id);
    expect(usosDoDia('16/11/2026', painel, []).map(a => a.id)).toEqual(['ativa']);
    expect(usosDoDia('16/11/2026', [], [])).toEqual([]);
  });

  it('inclui aprovada sem aula, ignora pendentes e recusadas e deduplica reservas', () => {
    const reservas = [reserva(), reserva({ id: 'duplicada', sala: ' sala  2 ' }), reserva({ sala: 'Sala 3', status: 'pendente' }), reserva({ sala: 'Sala 4', status: 'rejeitado' })];
    expect(usosDoDia('2026-11-16', [], reservas).map(a => a.id)).toEqual(['reserva-r']);
  });

  it('deduplica aula/reserva por sala normalizada e turno, sem reativar aula inativa', () => {
    const reservas = [reserva({ sala: ' sala  1 ', turno: 'Matutino', horarioInicio: '08:00' }), reserva({ id: 'tarde', sala: 'Sala 1' })];
    expect(usosDoDia('16/11/2026', [aula()], reservas).map(a => a.id)).toEqual(['a', 'reserva-tarde']);
    expect(usosDoDia('16/11/2026', [aula({ ativa: false })], reservas).map(a => a.id)).toEqual(['reserva-tarde']);
  });
});

describe('referência do último dia com uso', () => {
  it('pula o fim de semana e um feriado sem uso, alcançando a quinta-feira', () => {
    // Segunda-feira: sexta sem uso e fim de semana não fornecem usos efetivos.
    const aulas = [aula({ data: '12/11/2026' }), aula({ data: '13/11/2026', ativa: false })];
    const agendamentos = [reserva({ data: '14/11/2026', status: 'pendente' }), reserva({ data: '15/11/2026', status: 'rejeitado' })];
    const resultado = montarFilaLimpeza({ ...parametros, aulas, agendamentos });
    expect(resultado.referencia).toBe('12/11/2026');
    expect(resultado.fila[0].motivos).toContain('Usada em 12/11 (Matutino)');
    expect(resultado.fila[0].cleaningStatus).toBe('aguardando_limpeza');
  });

  it('escolhe o maior dia efetivo, inclusive sábado ou reserva sem aula', () => {
    const resultado = montarFilaLimpeza({ ...parametros,
      aulas: [aula({ data: '12/11/2026' })], agendamentos: [reserva({ data: '14/11/2026' })],
    });
    expect(resultado.referencia).toBe('14/11/2026');
    expect(resultado.fila[0].norm).toBe('SALA 2');
  });

  it('procura até sete dias, sem criar bloco ontem quando não há uso', () => {
    expect(montarFilaLimpeza({ ...parametros, aulas: [aula({ data: '09/11/2026' })] }).referencia).toBe('09/11/2026');
    const resultado = montarFilaLimpeza({ ...parametros, aulas: [aula({ data: '08/11/2026' })] });
    expect(resultado.referencia).toBeNull();
    expect(resultado.fila).toEqual([]);
  });

  it('desconsidera dias cujos únicos usos estão em manutenção', () => {
    const resultado = montarFilaLimpeza({ ...parametros,
      aulas: [aula({ data: '12/11/2026' }), aula({ data: '13/11/2026' })],
      manutencoes: [manutencao({ inicio: '13/11/2026', fim: '13/11/2026' })],
    });
    expect(resultado.referencia).toBe('12/11/2026');
  });
});

describe('união e estados da fila', () => {
  it('reúne ontem e hoje em uma única sala normalizada e mantém as duas origens', () => {
    const resultado = montarFilaLimpeza({ ...parametros, aulas: [aula({ data: '13/11/2026', sala: ' sala  1 ' }), aula()] });
    expect(resultado.fila).toHaveLength(1);
    expect(resultado.fila[0].fontes).toEqual(['ontem', 'hoje']);
    expect(resultado.fila[0].motivos).toContain('Limpar antes do turno Matutino');
  });

  it.each([
    [7, 59, 'aguardando_limpeza'], [8, 0, 'em_aula'], [9, 59, 'em_aula'],
    [10, 0, 'livre'], [22, 0, 'livre'],
  ])('às %i:%i usa os limites reais da aula (%s)', (hora, minuto, status) => {
    const resultado = montarFilaLimpeza({ ...parametros, agora: new Date(2026, 10, 16, hora, minuto), aulas: [aula(), aula({ data: '13/11/2026' })] });
    expect(resultado.fila[0].cleaningStatus).toBe(status);
  });

  it('usa o fim real da reserva e volta a aguardar entre turnos', () => {
    const aulas = [aula(), aula({ id: 'noite', turno: 'Noturno', inicio: '18:30', fim: '19:20' })];
    const intervalo = montarFilaLimpeza({ ...parametros, agora: new Date(2026, 10, 16, 11, 0), aulas }).fila[0];
    expect(intervalo.cleaningStatus).toBe('aguardando_limpeza');
    expect(intervalo.nextClassHoje?.turno).toBe('Noturno');
    expect(intervalo.turnosHoje.map(t => t.status)).toEqual(['concluido', 'aguardando']);
    expect(montarFilaLimpeza({ ...parametros, agora: new Date(2026, 10, 16, 19, 21), aulas }).fila[0].cleaningStatus).toBe('livre');
    expect(montarFilaLimpeza({ ...parametros, agora: new Date(2026, 10, 16, 14, 10), agendamentos: [reserva()] }).fila[0].cleaningStatus).toBe('livre');
  });

  it('inclui prioridades e avisos sem aula; ignora concluídas, outro dia e texto vazio', () => {
    const resultado = montarFilaLimpeza({ ...parametros,
      prioridades: [prioridade(), prioridade({ id: 'fraca', prioridade: 'normal' }), prioridade({ sala: 'Sala 4', concluida: true }), prioridade({ sala: 'Sala 5', data: '2026-11-17' })],
      observacoes: { chaveLegada: { sala: 'Sala 6', observacao: 'Higienizar bancadas' }, vazia: { sala: 'Sala 7', observacao: '  ' } },
    });
    expect(resultado.fila.map(r => r.norm)).toEqual(['SALA 3', 'SALA 6']);
    expect(resultado.fila.map(r => r.cleaningStatus)).toEqual(['aguardando_limpeza', 'aguardando_limpeza']);
    expect(resultado.fila[0].prioridade?.id).toBe('p');
    expect(resultado.fila[1].fontes).toEqual(['aviso']);
  });

  it('retira manutenção de todas as origens e conta salas únicas, inclusive sem aula', () => {
    const resultado = montarFilaLimpeza({ ...parametros,
      aulas: [aula(), aula({ data: '13/11/2026' })], agendamentos: [reserva()],
      prioridades: [prioridade({ sala: 'Sala 1' })], observacoes: { aviso: { sala: 'Sala 1', observacao: 'Atenção' } },
      manutencoes: [manutencao(), manutencao({ id: 'duplicada', sala: ' sala  1 ' }), manutencao({ sala: 'Sala 2' }), manutencao({ sala: 'Sala 3', ativo: false }), manutencao({ sala: 'Sala 4' })],
    });
    expect(resultado.fila).toEqual([]);
    expect(resultado.emManutencao).toBe(3);
    expect(montarFilaLimpeza({ ...parametros, aulas: [aula()], manutencoes: [manutencao({ ativo: false })] }).fila).toHaveLength(1);
  });

  it('ordena prioridade > aviso > aguardando por início > só ontem > em aula > livre', () => {
    const aulas = [
      aula({ sala: 'Sala 4', inicio: '09:30' }), aula({ sala: 'Sala 5', inicio: '09:00' }),
      aula({ sala: 'Sala 6', data: '13/11/2026' }), aula({ sala: 'Sala 7' }),
      aula({ sala: 'Sala 8', inicio: '06:00', fim: '07:00' }),
    ];
    const resultado = montarFilaLimpeza({ ...parametros, agora: new Date(2026, 10, 16, 8, 30), aulas,
      prioridades: [prioridade({ sala: 'Sala 3', prioridade: 'normal' }), prioridade({ sala: 'Sala 2' }), prioridade({ sala: 'Sala 1', prioridade: 'urgente' })],
      observacoes: { aviso: { sala: 'Sala 9', observacao: 'Aviso' } },
    });
    expect(resultado.fila.map(r => r.norm)).toEqual(['SALA 1', 'SALA 2', 'SALA 3', 'SALA 9', 'SALA 5', 'SALA 4', 'SALA 6', 'SALA 7', 'SALA 8']);
  });

  it('desempata por nome curto em ordem numérica sem modificar as entradas', () => {
    const prioridades = [prioridade({ sala: 'Sala 10' }), prioridade({ sala: 'Sala 2' })];
    const antes = JSON.stringify(prioridades);
    expect(montarFilaLimpeza({ ...parametros, prioridades }).fila.map(r => r.norm)).toEqual(['SALA 2', 'SALA 10']);
    expect(JSON.stringify(prioridades)).toBe(antes);
  });
});
