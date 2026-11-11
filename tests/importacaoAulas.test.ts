import { describe, expect, it } from 'vitest';
import type { Aula } from '../types';
import { planejarImportacaoAulas } from '../utils/importacaoAulas';

const aula = (patch: Partial<Aula> = {}): Aula => ({
  id: 'a', sala: 'Sala 1', data: '11/11/2026', turno: 'Matutino', inicio: '08:00', fim: '10:00',
  turma: 'Original', instrutor: 'Professor', unidade_curricular: 'UC', origem: 'csv', ...patch,
});

describe('reimportação preserva ajustes manuais', () => {
  it('mantém o histórico intacto, substitui futuras não ajustadas e protege ajustes e reservas', () => {
    const atuais = [
      aula({ id: 'historica', data: '10/11/2026' }),
      aula({ id: 'historica-manual', data: '09/11/2026', modificadoManualmente: true }),
      aula({ id: 'substituir' }), aula({ id: 'sumiu-do-csv', sala: 'Sala 2' }),
      aula({ id: 'ajuste', sala: 'Sala 3', modificadoManualmente: true }),
      aula({ id: 'manual', sala: 'Sala 4', modificadoManualmente: true, origem: 'manual' }),
      aula({ id: 'reserva', sala: 'Sala 5', data: '12/11/2026', modificadoManualmente: true, origem: 'reserva' }),
    ];
    const csv = [
      aula({ turma: 'CSV novo' }), aula({ data: '10/11/2026', turma: 'Não alterar histórico' }),
      aula({ sala: ' sala  3 ', turma: 'Não sobrescrever ajuste' }),
      aula({ sala: 'Sala 4', turma: 'Não sobrescrever manual' }),
      aula({ sala: 'Sala 5', data: '12/11/2026', turma: 'Não sobrescrever reserva' }),
      aula({ sala: 'Sala 3', turno: 'Noturno', inicio: '18:00' }),
      aula({ sala: 'Sala 3', data: '13/11/2026' }),
    ];
    const snapshot = JSON.stringify({ atuais, csv });
    const plano = planejarImportacaoAulas(atuais, csv, '2026-11-11');
    expect(plano.excluirIds).toEqual(['substituir', 'sumiu-do-csv']);
    expect(plano.preservadas).toBe(3);
    expect(plano.historicas).toBe(2);
    expect(plano.inserir.map(a => [a.sala, a.data, a.turno])).toEqual([
      ['Sala 1', '11/11/2026', 'Matutino'], ['Sala 3', '11/11/2026', 'Noturno'], ['Sala 3', '13/11/2026', 'Matutino'],
    ]);
    expect(plano.inserir.every(a => a.origem === 'csv' && a.modificadoManualmente === false)).toBe(true);
    expect(JSON.stringify({ atuais, csv })).toBe(snapshot);
  });

  it('preserva ajustes inativos e permite importação só com colisões sem apagá-los', () => {
    const atuais = [aula({ modificadoManualmente: true, ativa: false })];
    const plano = planejarImportacaoAulas(atuais, [aula({ turma: 'CSV' })], '11/11/2026');
    expect(plano).toMatchObject({ excluirIds: [], inserir: [], preservadas: 1 });
  });

  it('não duplica CSV com mesma sala/data/turno e compara dias e meses corretamente', () => {
    const plano = planejarImportacaoAulas([aula({ data: '31/10/2026' })], [
      aula({ sala: 'Sala 2' }), aula({ sala: ' sala  2 ', data: '2026-11-11' }), aula({ data: '01/12/2026' }),
    ], '2026-11-11');
    expect(plano.excluirIds).toEqual([]);
    expect(plano.inserir).toHaveLength(2);
    expect(plano.historicas).toBe(1);
  });
});
