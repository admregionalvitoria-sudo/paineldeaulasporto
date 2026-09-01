import { describe, it, expect } from 'vitest';
import { repairMojibake, containsMojibake } from '../utils/encodingHelper';

describe('encodingHelper (Reparo e Detecção de Mojibake)', () => {
  it('deve reparar caracteres mojibake UTF-8 decodificados como Latin-1', () => {
    expect(repairMojibake('FundaÃ§Ãµes')).toBe('Fundações');
    expect(repairMojibake('LogÃ­stica')).toBe('Logística');
    expect(repairMojibake('ManutenÃ§Ã£o')).toBe('Manutenção');
  });

  it('deve detectar presença de mojibake corretamente', () => {
    expect(containsMojibake('FundaÃ§Ãµes')).toBe(true);
    expect(containsMojibake('Programação em Python')).toBe(false);
  });
});
