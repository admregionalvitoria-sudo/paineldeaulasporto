import { describe, expect, it } from 'vitest';
import { selecionarReenvios } from '../utils/reenviosPlanilha';

describe('selecionarReenvios', () => {
  it('ignora reservas sem erro preenchido', () => {
    expect(selecionarReenvios([
      { id: 'ausente' },
      { id: 'nulo', planilhaSyncErro: null },
      { id: 'vazio', planilhaSyncErro: '' },
      { id: 'espacos', planilhaSyncErro: '  ' },
      { id: 'falha', planilhaSyncErro: 'Planilha indisponível' },
    ], new Set(), 20)).toEqual(['falha']);
  });

  it('ignora ids já tentados, inclusive após outra falha na mesma sessão', () => {
    const reservas = [
      { id: 'a', planilhaSyncErro: 'Erro anterior' },
      { id: 'b', planilhaSyncErro: 'Erro' },
    ];
    const tentados = new Set(['a']);
    expect(selecionarReenvios(reservas, tentados, 20)).toEqual(['b']);
    tentados.add('b');
    expect(selecionarReenvios([...reservas, { id: 'c', planilhaSyncErro: 'Nova falha' }], tentados, 20)).toEqual(['c']);
  });

  it('respeita o limite de 20 mantendo a ordem e sem consumir vagas com ids tentados', () => {
    const reservas = Array.from({ length: 25 }, (_, i) => ({ id: String(i), planilhaSyncErro: 'Erro' }));
    const tentados = new Set(['0']);
    expect(selecionarReenvios(reservas, tentados, 20)).toEqual(reservas.slice(1, 21).map(r => r.id));
    expect(tentados).toEqual(new Set(['0']));
    expect(reservas).toHaveLength(25);
    expect(selecionarReenvios(reservas, tentados, 0)).toEqual([]);
    expect(selecionarReenvios(reservas, tentados, -1)).toEqual([]);
  });

  it('seleciona cada id uma única vez e não altera as entradas', () => {
    const reserva = Object.freeze({ id: 'a', planilhaSyncErro: 'Erro' });
    const reservas = Object.freeze([reserva, reserva, { id: 'b', planilhaSyncErro: 'Erro' }]);
    const tentados = new Set<string>();
    expect(selecionarReenvios(reservas, tentados, 2)).toEqual(['a', 'b']);
    expect(tentados.size).toBe(0);
    expect(reservas).toHaveLength(3);
  });
});
