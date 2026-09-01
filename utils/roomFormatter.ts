/**
 * Utilitário para padronização e formatação dos nomes oficiais de salas e laboratórios
 * do SENAI Porto.
 *
 * Tabela Oficial:
 * - Sala de Aula 01 — Espaço Definição — Sala Estruturar
 * - Sala de Aula 02 — Espaço Definição — Sala Aprimorar
 * - Sala de Aula 03 — Espaço Definição — Sala Fortalecer
 * - Sala de Aula 04 — Espaço Definição — Sala Explorar
 * - Sala de Aula 05 — Espaço Empatia — Sala Observar
 * - Sala de Aula 06 — Espaço Empatia — Sala Compreender
 * - Sala de Aula 07 — Espaço Empatia — Sala Conectar
 * - Sala de Aula 08 — Espaço Ideação — Sala Inovar
 * - Sala de Aula 09 — Espaço Ideação — Sala Inspirar
 * - Sala de Aula 10 — Espaço Ideação — Sala Evoluir
 * - Sala de Aula 11 — Espaço Ideação — Sala Expandir
 * - Sala de Aula 12 — Espaço Ideação — Sala Criar
 * - Sala de Aula 13 — Espaço Ideação — Sala Planejar
 * - Sala de Aula 14 — Espaço Ideação — Sala Organizar
 * - Laboratório 01 — Espaço Prototipagem — Lab. Prototipar
 * - Laboratório 02 — Espaço Logística — Lab. Movimentar
 * - Laboratório 03 — Espaço Prototipagem — Lab. Integrar
 * - Laboratório 04 — Espaço Teste e Implementação — Lab. Impulsionar
 * - Laboratório 05 — Espaço Teste e Implementação — Lab. Valorizar
 * - Laboratório 06 — Espaço Prototipagem — Lab. Transformar
 * - Laboratório 07 — Espaço Prototipagem — Lab. Experimentar
 * - Laboratório 08 — Espaço Teste e Implementação — Lab. Otimizar
 * - Laboratório 09 — Espaço Teste e Implementação — Lab. Validar
 * - Laboratório 10 — Espaço Empatia — Sala Compartilhar
 * - Laboratório 11 — Espaço Empatia — Sala Colaborar
 * - SENAI LAB — SENAI LAB — SENAI LAB
 */

export const CANONICAL_SALAS = [
  'Sala de Aula 01 — Espaço Definição — Sala Estruturar',
  'Sala de Aula 02 — Espaço Definição — Sala Aprimorar',
  'Sala de Aula 03 — Espaço Definição — Sala Fortalecer',
  'Sala de Aula 04 — Espaço Definição — Sala Explorar',
  'Sala de Aula 05 — Espaço Empatia — Sala Observar',
  'Sala de Aula 06 — Espaço Empatia — Sala Compreender',
  'Sala de Aula 07 — Espaço Empatia — Sala Conectar',
  'Sala de Aula 08 — Espaço Ideação — Sala Inovar',
  'Sala de Aula 09 — Espaço Ideação — Sala Inspirar',
  'Sala de Aula 10 — Espaço Ideação — Sala Evoluir',
  'Sala de Aula 11 — Espaço Ideação — Sala Expandir',
  'Sala de Aula 12 — Espaço Ideação — Sala Criar',
  'Sala de Aula 13 — Espaço Ideação — Sala Planejar',
  'Sala de Aula 14 — Espaço Ideação — Sala Organizar',
  'Laboratório 01 — Espaço Prototipagem — Lab. Prototipar',
  'Laboratório 02 — Espaço Logística — Lab. Movimentar',
  'Laboratório 03 — Espaço Prototipagem — Lab. Integrar',
  'Laboratório 04 — Espaço Teste e Implementação — Lab. Impulsionar',
  'Laboratório 05 — Espaço Teste e Implementação — Lab. Valorizar',
  'Laboratório 06 — Espaço Prototipagem — Lab. Transformar',
  'Laboratório 07 — Espaço Prototipagem — Lab. Experimentar',
  'Laboratório 08 — Espaço Teste e Implementação — Lab. Otimizar',
  'Laboratório 09 — Espaço Teste e Implementação — Lab. Validar',
  'Laboratório 10 — Espaço Empatia — Sala Compartilhar',
  'Laboratório 11 — Espaço Empatia — Sala Colaborar',
  'SENAI LAB — SENAI LAB — SENAI LAB'
] as const;

export type CanonicalSala = typeof CANONICAL_SALAS[number];

const SALAS_MAP: Record<number, string> = {
  1: 'Sala de Aula 01 — Espaço Definição — Sala Estruturar',
  2: 'Sala de Aula 02 — Espaço Definição — Sala Aprimorar',
  3: 'Sala de Aula 03 — Espaço Definição — Sala Fortalecer',
  4: 'Sala de Aula 04 — Espaço Definição — Sala Explorar',
  5: 'Sala de Aula 05 — Espaço Empatia — Sala Observar',
  6: 'Sala de Aula 06 — Espaço Empatia — Sala Compreender',
  7: 'Sala de Aula 07 — Espaço Empatia — Sala Conectar',
  8: 'Sala de Aula 08 — Espaço Ideação — Sala Inovar',
  9: 'Sala de Aula 09 — Espaço Ideação — Sala Inspirar',
  10: 'Sala de Aula 10 — Espaço Ideação — Sala Evoluir',
  11: 'Sala de Aula 11 — Espaço Ideação — Sala Expandir',
  12: 'Sala de Aula 12 — Espaço Ideação — Sala Criar',
  13: 'Sala de Aula 13 — Espaço Ideação — Sala Planejar',
  14: 'Sala de Aula 14 — Espaço Ideação — Sala Organizar',
};

const LABS_MAP: Record<number, string> = {
  1: 'Laboratório 01 — Espaço Prototipagem — Lab. Prototipar',
  2: 'Laboratório 02 — Espaço Logística — Lab. Movimentar',
  3: 'Laboratório 03 — Espaço Prototipagem — Lab. Integrar',
  4: 'Laboratório 04 — Espaço Teste e Implementação — Lab. Impulsionar',
  5: 'Laboratório 05 — Espaço Teste e Implementação — Lab. Valorizar',
  6: 'Laboratório 06 — Espaço Prototipagem — Lab. Transformar',
  7: 'Laboratório 07 — Espaço Prototipagem — Lab. Experimentar',
  8: 'Laboratório 08 — Espaço Teste e Implementação — Lab. Otimizar',
  9: 'Laboratório 09 — Espaço Teste e Implementação — Lab. Validar',
  10: 'Laboratório 10 — Espaço Empatia — Sala Compartilhar',
  11: 'Laboratório 11 — Espaço Empatia — Sala Colaborar',
};

const KEYWORD_MAP: Array<{ regex: RegExp; canonical: string }> = [
  // Nomes conceituais de salas
  { regex: /ESTRUTURAR/i, canonical: 'Sala de Aula 01 — Espaço Definição — Sala Estruturar' },
  { regex: /APRIMORAR/i, canonical: 'Sala de Aula 02 — Espaço Definição — Sala Aprimorar' },
  { regex: /FORTALECER/i, canonical: 'Sala de Aula 03 — Espaço Definição — Sala Fortalecer' },
  { regex: /EXPLORAR/i, canonical: 'Sala de Aula 04 — Espaço Definição — Sala Explorar' },
  { regex: /OBSERVAR/i, canonical: 'Sala de Aula 05 — Espaço Empatia — Sala Observar' },
  { regex: /COMPREENDER/i, canonical: 'Sala de Aula 06 — Espaço Empatia — Sala Compreender' },
  { regex: /CONECTAR/i, canonical: 'Sala de Aula 07 — Espaço Empatia — Sala Conectar' },
  { regex: /INOVAR/i, canonical: 'Sala de Aula 08 — Espaço Ideação — Sala Inovar' },
  { regex: /INSPIRAR/i, canonical: 'Sala de Aula 09 — Espaço Ideação — Sala Inspirar' },
  { regex: /EVOLUIR/i, canonical: 'Sala de Aula 10 — Espaço Ideação — Sala Evoluir' },
  { regex: /EXPANDIR/i, canonical: 'Sala de Aula 11 — Espaço Ideação — Sala Expandir' },
  { regex: /CRIAR/i, canonical: 'Sala de Aula 12 — Espaço Ideação — Sala Criar' },
  { regex: /PLANEJAR/i, canonical: 'Sala de Aula 13 — Espaço Ideação — Sala Planejar' },
  { regex: /ORGANIZAR/i, canonical: 'Sala de Aula 14 — Espaço Ideação — Sala Organizar' },

  // Nomes conceituais de laboratórios
  { regex: /PROTOTIPAR/i, canonical: 'Laboratório 01 — Espaço Prototipagem — Lab. Prototipar' },
  { regex: /MOVIMENTAR|LOG[IÍ]STICA/i, canonical: 'Laboratório 02 — Espaço Logística — Lab. Movimentar' },
  { regex: /INTEGRAR/i, canonical: 'Laboratório 03 — Espaço Prototipagem — Lab. Integrar' },
  { regex: /IMPULSIONAR/i, canonical: 'Laboratório 04 — Espaço Teste e Implementação — Lab. Impulsionar' },
  { regex: /VALORIZAR/i, canonical: 'Laboratório 05 — Espaço Teste e Implementação — Lab. Valorizar' },
  { regex: /TRANSFORMAR/i, canonical: 'Laboratório 06 — Espaço Prototipagem — Lab. Transformar' },
  { regex: /EXPERIMENTAR/i, canonical: 'Laboratório 07 — Espaço Prototipagem — Lab. Experimentar' },
  { regex: /OTIMIZAR/i, canonical: 'Laboratório 08 — Espaço Teste e Implementação — Lab. Otimizar' },
  { regex: /VALIDAR/i, canonical: 'Laboratório 09 — Espaço Teste e Implementação — Lab. Validar' },
  { regex: /COMPARTILHAR/i, canonical: 'Laboratório 10 — Espaço Empatia — Sala Compartilhar' },
  { regex: /COLABORAR/i, canonical: 'Laboratório 11 — Espaço Empatia — Sala Colaborar' },

  // SENAI LAB
  { regex: /SENAI\s*[-_]?\s*LAB/i, canonical: 'SENAI LAB — SENAI LAB — SENAI LAB' },
];

/**
 * Converte qualquer variação de texto de sala/laboratório para o nome completo e padronizado.
 *
 * Exemplos:
 * - "SALA 01", "S01", "S1", "PORTO-2-S01" -> "Sala de Aula 01 — Espaço Definição — Sala Estruturar"
 * - "LAB 04", "LAB04", "LAB-4", "PORTO-1-LAB 04" -> "Laboratório 04 — Espaço Teste e Implementação — Lab. Impulsionar"
 * - "SENAI LAB" -> "SENAI LAB — SENAI LAB — SENAI LAB"
 */
export function formatarNomeSala(salaRaw: string | undefined | null): string {
  if (!salaRaw || typeof salaRaw !== 'string') return '';

  const trimmed = salaRaw.trim();
  if (!trimmed) return '';

  // 1. Se já for exatamente um dos nomes canônicos, retorna diretamente
  const exactMatch = CANONICAL_SALAS.find(s => s.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) return exactMatch;

  // 2. Checagem por SENAI LAB
  if (/SENAI\s*[-_]?\s*LAB/i.test(trimmed)) {
    return 'SENAI LAB — SENAI LAB — SENAI LAB';
  }

  // 3. Checagem por palavras-chave conceituais (ex: "ESTRUTURAR", "PROTOTIPAR")
  for (const item of KEYWORD_MAP) {
    if (item.regex.test(trimmed)) {
      return item.canonical;
    }
  }

  // 4. Checagem de Laboratórios por número (LAB, LABORATÓRIO, LABORATORIO)
  // Ex: LAB01, LAB 01, LAB-01, LAB 1, PORTO-2-LAB11, LABORATORIO 04
  const labMatch = trimmed.match(/(?:LAB(?:ORAT[OÓ]RIO)?)\s*[-_.]?\s*(\d{1,2})/i);
  if (labMatch) {
    const num = parseInt(labMatch[1], 10);
    if (LABS_MAP[num]) {
      return LABS_MAP[num];
    }
    const numPad = num < 10 ? `0${num}` : `${num}`;
    return `Laboratório ${numPad}`;
  }

  // 5. Checagem de Salas de Aula por número com prefixo "SALA" ou "SALA DE AULA"
  // Ex: SALA 01, SALA 1, SALA-05, SALA DE AULA 02
  const salaPrefixMatch = trimmed.match(/SALA(?:\s+DE\s+AULA)?\s*[-_.]?\s*(\d{1,2})/i);
  if (salaPrefixMatch) {
    const num = parseInt(salaPrefixMatch[1], 10);
    if (SALAS_MAP[num]) {
      return SALAS_MAP[num];
    }
    const numPad = num < 10 ? `0${num}` : `${num}`;
    return `Sala de Aula ${numPad}`;
  }

  // 6. Checagem de Salas com prefixo 'S' isolado ou estrutural
  // Ex: S05, S-05, S6, PORTO-2°-2D-S05, PORTO-1-S01
  const sNumMatch = trimmed.match(/(?:^|[-_\s/°º])S\s*[-_.]?\s*(\d{1,2})(?:$|[-_\s/])/i);
  if (sNumMatch) {
    const num = parseInt(sNumMatch[1], 10);
    if (SALAS_MAP[num]) {
      return SALAS_MAP[num];
    }
    const numPad = num < 10 ? `0${num}` : `${num}`;
    return `Sala de Aula ${numPad}`;
  }

  // 7. Se o último segmento após hífen for S01 ou LAB01
  if (trimmed.includes('-')) {
    const partes = trimmed.split('-').map(p => p.trim()).filter(Boolean);
    if (partes.length > 1) {
      const ultimo = partes[partes.length - 1];
      const res = formatarNomeSala(ultimo);
      if (res && res !== ultimo.toUpperCase()) {
        return res;
      }
    }
  }

  // 8. Se for apenas um número isolado (ex: "1", "01")
  const apenasNumero = trimmed.match(/^(\d{1,2})$/);
  if (apenasNumero) {
    const num = parseInt(apenasNumero[1], 10);
    if (SALAS_MAP[num]) {
      return SALAS_MAP[num];
    }
  }

  // 9. Ambientes especiais sem mapeamento direto (ex: AUDITÓRIO, REFEITÓRIO)
  const ambienteEspecialMatch = trimmed.match(/(?:^|[-_\s/°º])((?:AUDIT[OÓ]RIO|OFICINA|BIBLIOTECA|GIN[AÁ]SIO|QUADRA|REFEIT[OÓ]RIO|FABLAB)[A-Za-z0-9\s]*)$/i);
  if (ambienteEspecialMatch) {
    return ambienteEspecialMatch[1].toUpperCase().trim();
  }

  return trimmed;
}
