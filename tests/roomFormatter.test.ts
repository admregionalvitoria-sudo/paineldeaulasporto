import { describe, it, expect } from 'vitest';
import { formatarNomeSala, CANONICAL_SALAS } from '../utils/roomFormatter';

describe('formatarNomeSala (Nomes Oficiais das Salas e Laboratórios SENAI)', () => {
  it('deve possuir exatamente os 26 ambientes oficiais cadastrados', () => {
    expect(CANONICAL_SALAS.length).toBe(26);
  });

  it('deve normalizar variações de Salas de Aula para o padrão oficial', () => {
    expect(formatarNomeSala('SALA 01')).toBe('Sala de Aula 01 — Espaço Definição — Sala Estruturar');
    expect(formatarNomeSala('S01')).toBe('Sala de Aula 01 — Espaço Definição — Sala Estruturar');
    expect(formatarNomeSala('S1')).toBe('Sala de Aula 01 — Espaço Definição — Sala Estruturar');
    expect(formatarNomeSala('PORTO-1-SALA 01')).toBe('Sala de Aula 01 — Espaço Definição — Sala Estruturar');
    expect(formatarNomeSala('ESTRUTURAR')).toBe('Sala de Aula 01 — Espaço Definição — Sala Estruturar');

    expect(formatarNomeSala('PORTO-2°-2D-S05')).toBe('Sala de Aula 05 — Espaço Empatia — Sala Observar');
    expect(formatarNomeSala('SALA 05')).toBe('Sala de Aula 05 — Espaço Empatia — Sala Observar');
    expect(formatarNomeSala('S6')).toBe('Sala de Aula 06 — Espaço Empatia — Sala Compreender');
    expect(formatarNomeSala('SALA-14')).toBe('Sala de Aula 14 — Espaço Ideação — Sala Organizar');
  });

  it('deve normalizar variações de Laboratórios para o padrão oficial', () => {
    expect(formatarNomeSala('LAB 01')).toBe('Laboratório 01 — Espaço Prototipagem — Lab. Prototipar');
    expect(formatarNomeSala('LAB 1')).toBe('Laboratório 01 — Espaço Prototipagem — Lab. Prototipar');
    expect(formatarNomeSala('LAB-04')).toBe('Laboratório 04 — Espaço Teste e Implementação — Lab. Impulsionar');
    expect(formatarNomeSala('PORTO-2-2D-LAB11')).toBe('Laboratório 11 — Espaço Empatia — Sala Colaborar');
    expect(formatarNomeSala('LAB 10')).toBe('Laboratório 10 — Espaço Empatia — Sala Compartilhar');
    expect(formatarNomeSala('PROTOTIPAR')).toBe('Laboratório 01 — Espaço Prototipagem — Lab. Prototipar');
  });

  it('deve normalizar SENAI LAB', () => {
    expect(formatarNomeSala('SENAI LAB')).toBe('SENAI LAB — SENAI LAB — SENAI LAB');
    expect(formatarNomeSala('SENAI-LAB')).toBe('SENAI LAB — SENAI LAB — SENAI LAB');
  });

  it('deve retornar string vazia para entradas nulas ou vazias', () => {
    expect(formatarNomeSala('')).toBe('');
    expect(formatarNomeSala(null)).toBe('');
    expect(formatarNomeSala(undefined)).toBe('');
  });
});
