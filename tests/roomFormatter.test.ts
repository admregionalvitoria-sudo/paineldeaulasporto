import { describe, it, expect } from 'vitest';
import { formatarNomeSala } from '../utils/roomFormatter';

describe('formatarNomeSala (Normalização de Ambientes)', () => {
  it('deve normalizar variações de LAB com numeração', () => {
    expect(formatarNomeSala('lab-101')).toBe('LAB 101');
    expect(formatarNomeSala('PORTO-2-2D-LAB11')).toBe('LAB 11');
    expect(formatarNomeSala('LAB 1')).toBe('LAB 01');
    expect(formatarNomeSala('LAB-04')).toBe('LAB 04');
  });

  it('deve normalizar variações de SALA com numeração', () => {
    expect(formatarNomeSala('PORTO-2°-2D-S05')).toBe('SALA 05');
    expect(formatarNomeSala('S6')).toBe('SALA 06');
    expect(formatarNomeSala('SALA-06')).toBe('SALA 06');
  });

  it('deve normalizar variações de Auditório e Oficinas', () => {
    expect(formatarNomeSala('PORTO-1-AUDITORIO')).toBe('AUDITÓRIO');
    expect(formatarNomeSala('Auditorio Principal')).toBe('AUDITÓRIO PRINCIPAL');
    expect(formatarNomeSala('PORTO-2-OFICINA')).toBe('OFICINA');
  });

  it('deve retornar string vazia para entradas nulas ou vazias', () => {
    expect(formatarNomeSala('')).toBe('');
    expect(formatarNomeSala(null)).toBe('');
    expect(formatarNomeSala(undefined)).toBe('');
  });
});
