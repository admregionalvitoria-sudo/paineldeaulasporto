import { describe, expect, it } from 'vitest';
import { CANONICAL_SALAS, formatarNomeSala } from '../utils/roomFormatter';
import { CANONICAL_UNIDADES_CURRICULARES, formatarUnidadeCurricular } from '../utils/curricularUnits';
import { calcularTurnoPorHorario } from '../utils/turnos';

describe('formatação idempotente das aulas', () => {
  it.each([...CANONICAL_SALAS, '', 'S01', 'PORTO-1-LAB04', 'sala 99', 'lab 99', 'auditório', 'Espaço externo'])('sala: %s', entrada => {
    const saida = formatarNomeSala(entrada);
    expect(formatarNomeSala(saida)).toBe(saida);
  });

  it.each([...CANONICAL_UNIDADES_CURRICULARES, '', ' ', 'Atividade SENAI', "'Atividade SENAI'", 'banco de dados (CH: 40)', "PRO'JETO INTEGRADOR", 'unidade desconhecida', 'logística integrada'])('unidade curricular: %s', entrada => {
    const saida = formatarUnidadeCurricular(entrada);
    expect(formatarUnidadeCurricular(saida)).toBe(saida);
  });

  it.each([
    ['06:00', 'Matutino'], ['11:49', 'Matutino'], ['11:50', 'Vespertino'],
    ['17:49', 'Vespertino'], ['17:50', 'Noturno'], ['05:59', 'Noturno'],
    ['8h00', 'Matutino'], ['', 'Vespertino'], ['inválido', 'Vespertino'],
  ])('turno: %s', (entrada, esperado) => {
    const saida = calcularTurnoPorHorario(entrada);
    expect(saida).toBe(esperado);
    expect(calcularTurnoPorHorario(saida)).toBe(saida);
  });
});
