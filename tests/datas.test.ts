import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dataBR, dataISO, dataLocal } from '../utils/datas';

describe('datas locais', () => {
  it('usa os componentes locais antes e depois da meia-noite e nas viradas de mês/ano', () => {
    expect(dataLocal(new Date(2026, 10, 11, 23, 59))).toBe('2026-11-11');
    expect(dataLocal(new Date(2026, 10, 12, 0, 0))).toBe('2026-11-12');
    expect(dataLocal(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
    expect(dataBR(dataLocal(new Date(2027, 0, 1, 0, 0)))).toBe('01/01/2027');
    expect(dataISO('1/2/2026')).toBe('2026-02-01');
  });

  it('mantém o dia brasileiro após 21h, mesmo quando o ISO UTC já está no dia seguinte', () => {
    // Processo isolado: o teste é confiável mesmo em máquinas com outro fuso.
    const script = `import { dataLocal } from './utils/datas.ts';
      const date = new Date('2026-11-12T02:59:00Z');
      process.stdout.write(JSON.stringify([date.toISOString().slice(0, 10), dataLocal(date)]));`;
    const resultado = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      cwd: process.cwd(), env: { ...process.env, TZ: 'America/Sao_Paulo' }, encoding: 'utf8',
    });
    expect(JSON.parse(resultado)).toEqual(['2026-11-12', '2026-11-11']);
  });
});
