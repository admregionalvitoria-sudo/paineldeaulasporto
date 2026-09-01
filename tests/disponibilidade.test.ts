import { describe, it, expect } from 'vitest';
import { verificarConflitoAmbiente } from '../utils/disponibilidade';
import { Aula } from '../types';

describe('verificarConflitoAmbiente (Prevenção de Conflitos)', () => {
  const aulasExistentes: Aula[] = [
    {
      id: '1',
      sala: 'LAB 101',
      data: '15/09/2026',
      inicio: '08:00',
      fim: '12:00',
      turma: 'TURMA A',
      instrutor: 'Carlos',
      unidade_curricular: 'Programação',
      turno: 'Matutino'
    }
  ];

  it('deve detectar conflito em caso de sobreposição exata de horário no mesmo ambiente e data', () => {
    const conflito = verificarConflitoAmbiente({
      sala: 'LAB 101',
      data: '15/09/2026',
      inicio: '08:00',
      fim: '12:00',
      aulas: aulasExistentes
    });
    expect(conflito).not.toBeNull();
    expect(conflito?.turma).toBe('TURMA A');
  });

  it('deve detectar conflito em caso de sobreposição parcial de horário', () => {
    const conflito = verificarConflitoAmbiente({
      sala: 'LAB 101',
      data: '15/09/2026',
      inicio: '10:00',
      fim: '14:00',
      aulas: aulasExistentes
    });
    expect(conflito).not.toBeNull();
  });

  it('não deve gerar conflito para horários disjuntos no mesmo ambiente', () => {
    const conflito = verificarConflitoAmbiente({
      sala: 'LAB 101',
      data: '15/09/2026',
      inicio: '13:00',
      fim: '17:00',
      aulas: aulasExistentes
    });
    expect(conflito).toBeNull();
  });

  it('não deve gerar conflito para salas diferentes no mesmo horário', () => {
    const conflito = verificarConflitoAmbiente({
      sala: 'LAB 102',
      data: '15/09/2026',
      inicio: '08:00',
      fim: '12:00',
      aulas: aulasExistentes
    });
    expect(conflito).toBeNull();
  });
});
