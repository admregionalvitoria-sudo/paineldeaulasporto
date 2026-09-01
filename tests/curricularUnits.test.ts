import { describe, it, expect } from 'vitest';
import { formatarUnidadeCurricular } from '../utils/curricularUnits';

describe('formatarUnidadeCurricular (Normalização de UC e Mojibake)', () => {
  it('deve reparar caracteres mojibake comuns em nomes de disciplinas', () => {
    expect(formatarUnidadeCurricular('FundaÃ§Ãµes')).toContain('FUNDAÇÕES');
    expect(formatarUnidadeCurricular('MANUTENCAO DE EQUIPAMENTOS PORTUARIOS')).toBe('CONTROLE E MANUTENÇÃO DE EQUIPAMENTOS PORTUÁRIOS');
  });

  it('deve normalizar aliases conhecidos para o nome canônico', () => {
    expect(formatarUnidadeCurricular('logica de programacao')).toBe('LÓGICA DE PROGRAMAÇÃO');
    expect(formatarUnidadeCurricular('banco de dados')).toBe('BANCO DE DADOS');
    expect(formatarUnidadeCurricular('fundamentos de eletricidade')).toBe('FUNDAMENTOS DE ELETRICIDADE');
    expect(formatarUnidadeCurricular('python')).toBe('PROGRAMAÇÃO EM LINGUAGEM PYTHON');
  });

  it('deve manter texto em maiúsculas limpas se não houver alias direto', () => {
    expect(formatarUnidadeCurricular('Sistemas Embarcados Avançados')).toBe('SISTEMAS EMBARCADOS AVANÇADOS');
  });
});
