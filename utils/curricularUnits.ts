/**
 * Dicionário Oficial e Utilitários de Alta Precisão para Normalização e Correção de Unidades Curriculares do SENAI
 */

export const CANONICAL_UNIDADES_CURRICULARES: string[] = [
  "PROJETO INTEGRADOR I: IDEAÇÃO",
  "PROJETO INTEGRADOR",
  "PRÉ PROJETO",
  "LOGÍSTICA E TRANSPORTE FERROVIÁRIO",
  "MANOBRA E COMUNICAÇÃO FERROVIÁRIA",
  "OPERAÇÃO E MANOBRA FERROVIÁRIA",
  "LOGÍSTICA INTEGRADA",
  "SAÚDE E SEGURANÇA DO TRABALHO",
  "FUNDAMENTOS DA COMUNICAÇÃO E INFORMAÇÃO",
  "FUNDAMENTOS COMUNICAÇÃO E INFORMAÇÃO",
  "TECNOLOGIAS APLICADAS AO AMBIENTE PORTUÁRIO",
  "CONTROLE E MANUTENÇÃO DE EQUIPAMENTOS PORTUÁRIOS",
  "GESTÃO DE SUPRIMENTOS",
  "BANCO DE DADOS",
  "GESTÃO ORGANIZACIONAL",
  "GESTÃO DA PRODUÇÃO",
  "TÉCNICAS PARA OPERAÇÕES DE DISTRIBUIÇÃO",
  "RACIOCÍNIO LÓGICO E ANÁLISE DE DADOS",
  "PROGRAMAÇÃO EM LINGUAGEM PYTHON",
  "PLANEJAMENTO E ORGANIZAÇÃO DO TRABALHO",
  "FUNDAMENTOS DE MECÂNICA",
  "FUNDAMENTOS DE ELETRICIDADE",
  "FUNDAMENTOS DE TRANSPORTE",
  "FUNDAMENTOS PORTUÁRIOS",
  "FUNDAMENTOS DE ESTATÍSTICA",
  "FUNDAMENTOS DE COMÉRCIO EXTERIOR",
  "INTRODUÇÃO À QUALIDADE E PRODUTIVIDADE",
  "INTRODUÇÃO À TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO",
  "INTRODUÇÃO À PROGRAMAÇÃO",
  "INTRODUÇÃO À LOGÍSTICA",
  "INTRODUÇÃO À INDÚSTRIA 4.0",
  "INTRODUÇÃO À INTELIGÊNCIA ARTIFICIAL",
  "LÓGICA DE PROGRAMAÇÃO",
  "RELAÇÕES SOCIOPROFISSIONAIS, CIDADANIA E ÉTICA",
  "VERSIONAMENTO",
  "TRANSFORMAÇÃO DIGITAL NO SETOR INDUSTRIAL",
  "CODIFICAÇÃO PARA FRONT-END",
  "TESTES DE FRONT-END",
  "INTERAÇÃO COM APIs",
  "OPERAÇÕES EM TERMINAIS DE CARGA GERAL",
  "OPERAÇÕES EM RETROÁREAS",
  "ARMAZENAGEM",
  "CRIATIVIDADE E IDEAÇÃO EM PROJETOS DE INOVAÇÃO",
  "MODELAGEM DE PROJETOS DE INOVAÇÃO",
  "PROTOTIPAGEM DE NEGÓCIOS INOVADORES",
  "METODOLOGIAS ÁGEIS"
];

interface MatchRule {
  checker: (norm: string, raw: string, collapsed: string) => boolean;
  canonical: string;
}

/**
 * Repara caracteres corrompidos, mojibake UTF-8 (como ÃNICA -> ÂNICA, ÃÃO -> ÇÃO, etc.) e caracteres de controle
 */
export const repararCaracteresCorrompidos = (str: string | undefined | null): string => {
  if (!str) return '';
  let s = String(str);

  // Tentativa de decodificação de Mojibake UTF-8 mal interpretado
  try {
    if (/[\u00C2-\u00C3][\u0080-\u00BF]/.test(s)) {
      const decoded = decodeURIComponent(escape(s));
      if (decoded && !decoded.includes('')) {
        s = decoded;
      }
    }
  } catch (_) {}

  // Substituições de sequências UTF-8 / Latin1 corrompidas conhecidas
  s = s
    .replace(/Ã[\u0081\u00A1]/g, 'Á')
    .replace(/Ã[\u0082\u00A2]/g, 'Â')
    .replace(/Ã[\u0083\u00A3]/g, 'Ã')
    .replace(/Ã[\u0087\u00A7]/g, 'Ç')
    .replace(/Ã[\u0089\u00A9]/g, 'É')
    .replace(/Ã[\u008A\u00AA]/g, 'Ê')
    .replace(/Ã[\u008D\u00AD]/g, 'Í')
    .replace(/Ã[\u0093\u00B3]/g, 'Ó')
    .replace(/Ã[\u0094\u00B4]/g, 'Ô')
    .replace(/Ã[\u0095\u00B5]/g, 'Õ')
    .replace(/Ã[\u009A\u00BA]/g, 'Ú')
    // Casos em que o segundo byte foi removido ou substituído por controle / símbolo desconhecido
    .replace(/MECÃ[\s\S]{0,2}NICA/gi, 'MECÂNICA')
    .replace(/FERROVIÃ[\s\S]{0,2}RIA/gi, 'FERROVIÁRIA')
    .replace(/FERROVIÃ[\s\S]{0,2}RIO/gi, 'FERROVIÁRIO')
    .replace(/COMUNICAÃ[\s\S]{0,3}O/gi, 'COMUNICAÇÃO')
    .replace(/LOGÃ[\s\S]{0,2}STICA/gi, 'LOGÍSTICA')
    .replace(/ORGANIZAÃ[\s\S]{0,3}O/gi, 'ORGANIZAÇÃO')
    .replace(/PRODUÃ[\s\S]{0,3}O/gi, 'PRODUÇÃO')
    .replace(/INSTALAÃ[\s\S]{0,3}O/gi, 'INSTALAÇÃO')
    .replace(/GESTÃ[\s\S]{0,2}O/gi, 'GESTÃO')
    .replace(/ELETRÃ[\s\S]{0,2}NICA/gi, 'ELETRÔNICA')
    .replace(/ELETRICIDÃ[\s\S]{0,2}DE/gi, 'ELETRICIDADE')
    .replace(/ESTATÃ[\s\S]{0,2}STICA/gi, 'ESTATÍSTICA')
    .replace(/OPERAÃ[\s\S]{0,3}O/gi, 'OPERAÇÃO')
    .replace(/OPERAÃ[\s\S]{0,3}ES/gi, 'OPERAÇÕES')
    .replace(/MANUTENÃ[\s\S]{0,3}O/gi, 'MANUTENÇÃO')
    .replace(/PROGRAMAÃ[\s\S]{0,3}O/gi, 'PROGRAMAÇÃO')
    .replace(/PORTUÃ[\s\S]{0,2}RIO/gi, 'PORTUÁRIO')
    .replace(/PORTUÃ[\s\S]{0,2}RIA/gi, 'PORTUÁRIA')
    .replace(/PORTUÃ[\s\S]{0,2}RIOS/gi, 'PORTUÁRIOS')
    .replace(/PORTUÃ[\s\S]{0,2}RIAS/gi, 'PORTUÁRIAS')
    .replace(/SOCIOPROFISSIONÃ[\s\S]{0,2}IS/gi, 'SOCIOPROFISSIONAIS')
    .replace(/Ã[\s\S]{0,2}GEIS/gi, 'ÁGEIS')
    .replace(/PRÃ[\s\S]{0,2}\s*PROJETO/gi, 'PRÉ PROJETO')
    .replace(/Ã[\u0080-\u009F\uFFFD]/g, 'Ã')
    .replace(/[\uFFFD\u0000-\u001F\u007F-\u009F]/g, ' ')
    // Padrões de terminação
    .replace(/ÃNICA\b/gi, 'ÂNICA')
    .replace(/ÃRIA\b/gi, 'ÁRIA')
    .replace(/ÃRIO\b/gi, 'ÁRIO')
    .replace(/ÃÃO\b/gi, 'ÇÃO')
    .replace(/ÃSTICA\b/gi, 'ÍSTICA');

  return s.replace(/\s+/g, ' ').trim();
};

const RULES: MatchRule[] = [
  // 1. INTRODUÇÕES
  {
    checker: (norm, _, col) => col.includes("INTRODU") && (col.includes("TECNOLOG") || (col.includes("INFORMA") && col.includes("COMUNICA"))),
    canonical: "INTRODUÇÃO À TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO"
  },
  {
    checker: (norm, _, col) => col.includes("INTRODU") && col.includes("PROGRAMA"),
    canonical: "INTRODUÇÃO À PROGRAMAÇÃO"
  },
  {
    checker: (norm, _, col) => col.includes("INTRODU") && (col.includes("LOG") || col.includes("STICA")),
    canonical: "INTRODUÇÃO À LOGÍSTICA"
  },
  {
    checker: (norm, _, col) => col.includes("INTRODU") && col.includes("INTELIG"),
    canonical: "INTRODUÇÃO À INTELIGÊNCIA ARTIFICIAL"
  },
  {
    checker: (norm, _, col) => col.includes("INTRODU") && (col.includes("INDUSTRIA") || col.includes("4")),
    canonical: "INTRODUÇÃO À INDÚSTRIA 4.0"
  },
  {
    checker: (norm, _, col) => col.includes("INTRODU") && (col.includes("QUALIDADE") || col.includes("PRODUTIVIDADE")),
    canonical: "INTRODUÇÃO À QUALIDADE E PRODUTIVIDADE"
  },

  // 2. LOGÍSTICA & TRANSPORTE & FERROVIAS
  {
    checker: (norm, _, col) => col.includes("MANOBRA") || (col.includes("FERROVI") && (col.includes("COMUNICA") || col.includes("MANOBRA"))),
    canonical: "MANOBRA E COMUNICAÇÃO FERROVIÁRIA"
  },
  {
    checker: (norm, _, col) => (col.includes("LOG") || col.includes("TRANSPORTE")) && col.includes("FERROVI"),
    canonical: "LOGÍSTICA E TRANSPORTE FERROVIÁRIO"
  },
  {
    checker: (norm, _, col) => col.includes("LOG") && col.includes("INTEGRA"),
    canonical: "LOGÍSTICA INTEGRADA"
  },
  {
    checker: (norm, _, col) => col.includes("DISTRIBUI") || (col.includes("TECNICA") && col.includes("OPERA")),
    canonical: "TÉCNICAS PARA OPERAÇÕES DE DISTRIBUIÇÃO"
  },
  {
    checker: (norm, _, col) => col.includes("ARMAZEN"),
    canonical: "ARMAZENAGEM"
  },
  {
    checker: (norm, _, col) => col.includes("RETRO"),
    canonical: "OPERAÇÕES EM RETROÁREAS"
  },
  {
    checker: (norm, _, col) => (col.includes("TERMINAI") || col.includes("TERMINAL")) || (col.includes("CARGA") && col.includes("GERAL")),
    canonical: "OPERAÇÕES EM TERMINAIS DE CARGA GERAL"
  },
  {
    checker: (norm, _, col) => col.includes("CONTROLE") || (col.includes("MANUTEN") && col.includes("PORTU")),
    canonical: "CONTROLE E MANUTENÇÃO DE EQUIPAMENTOS PORTUÁRIOS"
  },
  {
    checker: (norm, _, col) => col.includes("TECNOLOGIA") && col.includes("PORTU"),
    canonical: "TECNOLOGIAS APLICADAS AO AMBIENTE PORTUÁRIO"
  },

  // 3. TI, DADOS E PROGRAMAÇÃO
  {
    checker: (norm, _, col) => col.includes("PYTHON"),
    canonical: "PROGRAMAÇÃO EM LINGUAGEM PYTHON"
  },
  {
    checker: (norm, _, col) => col.includes("LOGICA") && col.includes("PROGRAMA"),
    canonical: "LÓGICA DE PROGRAMAÇÃO"
  },
  {
    checker: (norm, _, col) => col.includes("BANCO") && col.includes("DADO"),
    canonical: "BANCO DE DADOS"
  },
  {
    checker: (norm, _, col) => col.includes("VERSIONA"),
    canonical: "VERSIONAMENTO"
  },
  {
    checker: (norm, _, col) => col.includes("FRONT") && col.includes("TESTE"),
    canonical: "TESTES DE FRONT-END"
  },
  {
    checker: (norm, _, col) => col.includes("FRONT"),
    canonical: "CODIFICAÇÃO PARA FRONT-END"
  },
  {
    checker: (norm, _, col) => col.includes("API"),
    canonical: "INTERAÇÃO COM APIs"
  },
  {
    checker: (norm, _, col) => col.includes("TRANSFORMA") && col.includes("DIGITAL"),
    canonical: "TRANSFORMAÇÃO DIGITAL NO SETOR INDUSTRIAL"
  },

  // 4. RELAÇÕES, ÉTICA E PROJETOS
  {
    checker: (norm, _, col) => col.includes("RELA") || col.includes("SOCIOPROF") || col.includes("CIOPROF") || (col.includes("CIDADANIA") && col.includes("TICA")),
    canonical: "RELAÇÕES SOCIOPROFISSIONAIS, CIDADANIA E ÉTICA"
  },
  {
    checker: (norm, _, col) => col.includes("PROJETO") && col.includes("INTEGRADOR") && col.includes("IDEA"),
    canonical: "PROJETO INTEGRADOR I: IDEAÇÃO"
  },
  {
    checker: (norm, _, col) => col.includes("PROJETO") && col.includes("INTEGRADOR"),
    canonical: "PROJETO INTEGRADOR"
  },
  {
    checker: (norm, _, col) => col.includes("PRE") && col.includes("PROJETO"),
    canonical: "PRÉ PROJETO"
  },
  {
    checker: (norm, _, col) => col.includes("CRIATIVIDADE") && col.includes("IDEA"),
    canonical: "CRIATIVIDADE E IDEAÇÃO EM PROJETOS DE INOVAÇÃO"
  },
  {
    checker: (norm, _, col) => col.includes("MODELAGEM") && col.includes("INOVA"),
    canonical: "MODELAGEM DE PROJETOS DE INOVAÇÃO"
  },
  {
    checker: (norm, _, col) => col.includes("PROTOTIP"),
    canonical: "PROTOTIPAGEM DE NEGÓCIOS INOVADORES"
  },
  {
    checker: (norm, _, col) => col.includes("METODOLOG") || col.includes("AGIL") || col.includes("AGEIS"),
    canonical: "METODOLOGIAS ÁGEIS"
  },
  {
    checker: (norm, _, col) => col.includes("PLANEJ") && col.includes("TRABALHO"),
    canonical: "PLANEJAMENTO E ORGANIZAÇÃO DO TRABALHO"
  },
  {
    checker: (norm, _, col) => col.includes("SAUDE") || (col.includes("SEGURAN") && col.includes("TRABALHO")),
    canonical: "SAÚDE E SEGURANÇA DO TRABALHO"
  },
  {
    checker: (norm, _, col) => col.includes("RACIOC"),
    canonical: "RACIOCÍNIO LÓGICO E ANÁLISE DE DADOS"
  },

  // 5. GESTÃO
  {
    checker: (norm, _, col) => col.includes("SUPRIM"),
    canonical: "GESTÃO DE SUPRIMENTOS"
  },
  {
    checker: (norm, _, col) => col.includes("ORGANIZACIONAL"),
    canonical: "GESTÃO ORGANIZACIONAL"
  },
  {
    checker: (norm, _, col) => col.includes("GEST") && col.includes("PRODU"),
    canonical: "GESTÃO DA PRODUÇÃO"
  },

  // 6. FUNDAMENTOS
  {
    checker: (norm, _, col) => col.includes("MECANIC") || (col.includes("FUNDAMENTO") && col.includes("MECAN")),
    canonical: "FUNDAMENTOS DE MECÂNICA"
  },
  {
    checker: (norm, _, col) => col.includes("ELETRIC") || (col.includes("FUNDAMENTO") && col.includes("ELETR")),
    canonical: "FUNDAMENTOS DE ELETRICIDADE"
  },
  {
    checker: (norm, _, col) => col.includes("FUNDAMENTO") && col.includes("TRANSPORTE"),
    canonical: "FUNDAMENTOS DE TRANSPORTE"
  },
  {
    checker: (norm, _, col) => col.includes("FUNDAMENTO") && col.includes("PORTU"),
    canonical: "FUNDAMENTOS PORTUÁRIOS"
  },
  {
    checker: (norm, _, col) => col.includes("ESTATIST") || (col.includes("FUNDAMENTO") && col.includes("ESTAT")),
    canonical: "FUNDAMENTOS DE ESTATÍSTICA"
  },
  {
    checker: (norm, _, col) => col.includes("COMERCIO") || (col.includes("FUNDAMENTO") && col.includes("EXTERIOR")),
    canonical: "FUNDAMENTOS DE COMÉRCIO EXTERIOR"
  },
  {
    checker: (norm, _, col) => col.includes("FUNDAMENTO") && (col.includes("COMUNICA") || col.includes("INFORMA")),
    canonical: "FUNDAMENTOS DA COMUNICAÇÃO E INFORMAÇÃO"
  }
];

/**
 * Normaliza qualquer texto eliminando acentos, pontuação, carga horária e caracteres estranhos
 */
export const normalizeTextForMatching = (text: string): string => {
  if (!text) return '';
  const repaired = repararCaracteresCorrompidos(text);
  return repaired
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos normais
    .toUpperCase()
    .replace(/\s*\(\s*CH\s*:[^)]*\)/gi, '') // remove (CH: 40.0000)
    .replace(/\s*\(CH\s*:[^)]*\)/gi, '')
    .replace(/\s*CH\s*:\s*[\d.]+/gi, '')
    .replace(/\s*\(CH\s*[\d.]+\)/gi, '')
    .replace(/[^A-Z0-9]/g, ' ') // substitui qualquer caractere não alfanumérico por espaço
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Função principal para formatar, reparar codificação e padronizar a Unidade Curricular
 */
export const formatarUnidadeCurricular = (uc: string | undefined | null): string => {
  if (!uc) return 'Atividade SENAI';

  let raw = String(uc).trim();
  
  // 1. Limpar e reparar codificação corrompida (mojibake)
  raw = repararCaracteresCorrompidos(raw);

  // 2. Remover padrão de CH imediatamente
  raw = raw
    .replace(/\s*\(\s*CH\s*:[^)]*\)/gi, '')
    .replace(/\s*\(CH\s*:[^)]*\)/gi, '')
    .replace(/\s*CH\s*:\s*[\d.]+/gi, '')
    .replace(/\s*\(CH\s*[\d.]+\)/gi, '')
    .trim();

  if (!raw) return 'Atividade SENAI';

  const normalized = normalizeTextForMatching(raw);
  const collapsed = normalized.replace(/\s+/g, '');

  // 3. Executar as regras de reconhecimento inteligente
  for (const rule of RULES) {
    if (rule.checker(normalized, raw, collapsed)) {
      return rule.canonical;
    }
  }

  // 4. Tentar correspondência direta com a lista canônica (inclusive por texto colapsado)
  for (const canonical of CANONICAL_UNIDADES_CURRICULARES) {
    const normCanonical = normalizeTextForMatching(canonical);
    const colCanonical = normCanonical.replace(/\s+/g, '');
    if (normalized === normCanonical || collapsed === colCanonical) {
      return canonical;
    }
  }

  // 5. Se não casou por palavras-chave, limpar caracteres ilegíveis e retornar em maiúsculas limpas
  let cleanFallback = raw
    .replace(/[\uFFFD\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanFallback.toUpperCase() || 'Atividade SENAI';
};
