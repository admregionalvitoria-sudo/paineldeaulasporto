import { repairMojibake } from './encodingHelper';

export const CANONICAL_UNIDADES_CURRICULARES: string[] = [
  "PROJETO INTEGRADOR I: IDEAÇÃO",
  "PROJETO INTEGRADOR",
  "PRÉ PROJETO",
  "LOGÍSTICA E TRANSPORTE FERROVIÁRIO",
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
  checker: (norm: string, raw: string) => boolean;
  canonical: string;
}

const RULES: MatchRule[] = [
  // 1. INTRODUÇÕES
  {
    checker: (norm) => norm.includes("INTRODU") && (norm.includes("TECNOLOG") || (norm.includes("INFORMA") && norm.includes("COMUNICA"))),
    canonical: "INTRODUÇÃO À TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO"
  },
  {
    checker: (norm) => norm.includes("INTRODU") && norm.includes("PROGRAMA"),
    canonical: "INTRODUÇÃO À PROGRAMAÇÃO"
  },
  {
    checker: (norm) => norm.includes("INTRODU") && (norm.includes("LOG") || norm.includes("STICA")),
    canonical: "INTRODUÇÃO À LOGÍSTICA"
  },
  {
    checker: (norm) => norm.includes("INTRODU") && norm.includes("INTELIG"),
    canonical: "INTRODUÇÃO À INTELIGÊNCIA ARTIFICIAL"
  },
  {
    checker: (norm) => norm.includes("INTRODU") && (norm.includes("INDUSTRIA") || norm.includes("4")),
    canonical: "INTRODUÇÃO À INDÚSTRIA 4.0"
  },
  {
    checker: (norm) => norm.includes("INTRODU") && (norm.includes("QUALIDADE") || norm.includes("PRODUTIVIDADE")),
    canonical: "INTRODUÇÃO À QUALIDADE E PRODUTIVIDADE"
  },

  // 2. LOGÍSTICA & TRANSPORTE
  {
    checker: (norm) => (norm.includes("LOG") || norm.includes("TRANSPORTE")) && norm.includes("FERROVI"),
    canonical: "LOGÍSTICA E TRANSPORTE FERROVIÁRIO"
  },
  {
    checker: (norm) => norm.includes("LOG") && norm.includes("INTEGRA"),
    canonical: "LOGÍSTICA INTEGRADA"
  },
  {
    checker: (norm) => norm.includes("DISTRIBUI") || (norm.includes("TECNICA") && norm.includes("OPERA")),
    canonical: "TÉCNICAS PARA OPERAÇÕES DE DISTRIBUIÇÃO"
  },
  {
    checker: (norm) => norm.includes("ARMAZEN"),
    canonical: "ARMAZENAGEM"
  },
  {
    checker: (norm) => norm.includes("RETRO"),
    canonical: "OPERAÇÕES EM RETROÁREAS"
  },
  {
    checker: (norm) => (norm.includes("TERMINAI") || norm.includes("TERMINAL")) || (norm.includes("CARGA") && norm.includes("GERAL")),
    canonical: "OPERAÇÕES EM TERMINAIS DE CARGA GERAL"
  },
  {
    checker: (norm) => norm.includes("CONTROLE") || (norm.includes("MANUTEN") && norm.includes("PORTU")),
    canonical: "CONTROLE E MANUTENÇÃO DE EQUIPAMENTOS PORTUÁRIOS"
  },
  {
    checker: (norm) => norm.includes("TECNOLOGIA") && norm.includes("PORTU"),
    canonical: "TECNOLOGIAS APLICADAS AO AMBIENTE PORTUÁRIO"
  },

  // 3. TI, DADOS E PROGRAMAÇÃO
  {
    checker: (norm) => norm.includes("PYTHON"),
    canonical: "PROGRAMAÇÃO EM LINGUAGEM PYTHON"
  },
  {
    checker: (norm) => norm.includes("LOGICA") && norm.includes("PROGRAMA"),
    canonical: "LÓGICA DE PROGRAMAÇÃO"
  },
  {
    checker: (norm) => norm.includes("BANCO") && norm.includes("DADO"),
    canonical: "BANCO DE DADOS"
  },
  {
    checker: (norm) => norm.includes("VERSIONA"),
    canonical: "VERSIONAMENTO"
  },
  {
    checker: (norm) => norm.includes("FRONT") && norm.includes("TESTE"),
    canonical: "TESTES DE FRONT-END"
  },
  {
    checker: (norm) => norm.includes("FRONT"),
    canonical: "CODIFICAÇÃO PARA FRONT-END"
  },
  {
    checker: (norm) => norm.includes("API"),
    canonical: "INTERAÇÃO COM APIs"
  },
  {
    checker: (norm) => norm.includes("TRANSFORMA") && norm.includes("DIGITAL"),
    canonical: "TRANSFORMAÇÃO DIGITAL NO SETOR INDUSTRIAL"
  },

  // 4. RELAÇÕES, ÉTICA E PROJETOS
  {
    checker: (norm) => norm.includes("RELA") || norm.includes("SOCIOPROF") || norm.includes("CIOPROF") || (norm.includes("CIDADANIA") && norm.includes("TICA")),
    canonical: "RELAÇÕES SOCIOPROFISSIONAIS, CIDADANIA E ÉTICA"
  },
  {
    checker: (norm) => norm.includes("PROJETO") && norm.includes("INTEGRADOR") && norm.includes("IDEA"),
    canonical: "PROJETO INTEGRADOR I: IDEAÇÃO"
  },
  {
    checker: (norm) => norm.includes("PROJETO") && norm.includes("INTEGRADOR"),
    canonical: "PROJETO INTEGRADOR"
  },
  {
    checker: (norm) => norm.includes("PRE") && norm.includes("PROJETO"),
    canonical: "PRÉ PROJETO"
  },
  {
    checker: (norm) => norm.includes("CRIATIVIDADE") && norm.includes("IDEA"),
    canonical: "CRIATIVIDADE E IDEAÇÃO EM PROJETOS DE INOVAÇÃO"
  },
  {
    checker: (norm) => norm.includes("MODELAGEM") && norm.includes("INOVA"),
    canonical: "MODELAGEM DE PROJETOS DE INOVAÇÃO"
  },
  {
    checker: (norm) => norm.includes("PROTOTIP"),
    canonical: "PROTOTIPAGEM DE NEGÓCIOS INOVADORES"
  },
  {
    checker: (norm) => norm.includes("METODOLOG") || norm.includes("AGIL") || norm.includes("AGEIS"),
    canonical: "METODOLOGIAS ÁGEIS"
  },
  {
    checker: (norm) => norm.includes("PLANEJ") && norm.includes("TRABALHO"),
    canonical: "PLANEJAMENTO E ORGANIZAÇÃO DO TRABALHO"
  },
  {
    checker: (norm) => norm.includes("SAUDE") || (norm.includes("SEGURAN") && norm.includes("TRABALHO")),
    canonical: "SAÚDE E SEGURANÇA DO TRABALHO"
  },
  {
    checker: (norm) => norm.includes("RACIOC"),
    canonical: "RACIOCÍNIO LÓGICO E ANÁLISE DE DADOS"
  },

  // 5. GESTÃO
  {
    checker: (norm) => norm.includes("SUPRIM"),
    canonical: "GESTÃO DE SUPRIMENTOS"
  },
  {
    checker: (norm) => norm.includes("ORGANIZACIONAL"),
    canonical: "GESTÃO ORGANIZACIONAL"
  },
  {
    checker: (norm) => norm.includes("GEST") && norm.includes("PRODU"),
    canonical: "GESTÃO DA PRODUÇÃO"
  },

  // 6. FUNDAMENTOS
  {
    checker: (norm) => norm.includes("MECANIC") || (norm.includes("FUNDAMENTO") && norm.includes("MECAN")),
    canonical: "FUNDAMENTOS DE MECÂNICA"
  },
  {
    checker: (norm) => norm.includes("ELETRIC") || (norm.includes("FUNDAMENTO") && norm.includes("ELETR")),
    canonical: "FUNDAMENTOS DE ELETRICIDADE"
  },
  {
    checker: (norm) => norm.includes("FUNDAMENTO") && norm.includes("TRANSPORTE"),
    canonical: "FUNDAMENTOS DE TRANSPORTE"
  },
  {
    checker: (norm) => norm.includes("FUNDAMENTO") && norm.includes("PORTU"),
    canonical: "FUNDAMENTOS PORTUÁRIOS"
  },
  {
    checker: (norm) => norm.includes("ESTATIST") || (norm.includes("FUNDAMENTO") && norm.includes("ESTAT")),
    canonical: "FUNDAMENTOS DE ESTATÍSTICA"
  },
  {
    checker: (norm) => norm.includes("COMERCIO") || (norm.includes("FUNDAMENTO") && norm.includes("EXTERIOR")),
    canonical: "FUNDAMENTOS DE COMÉRCIO EXTERIOR"
  },
  {
    checker: (norm) => norm.includes("FUNDAMENTO") && (norm.includes("COMUNICA") || norm.includes("INFORMA")),
    canonical: "FUNDAMENTOS DA COMUNICAÇÃO E INFORMAÇÃO"
  }
];

export const normalizeTextForMatching = (text: string): string => {
  if (!text) return '';
  const repaired = repairMojibake(text);
  return repaired
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos normais
    .toUpperCase()
    .replace(/\s*\(\s*CH\s*:[^)]*\)/gi, '') // remove (CH: 40.0000)
    .replace(/\s*\(CH\s*:[^)]*\)/gi, '')
    .replace(/\s*CH\s*:\s*[\d.]+/gi, '')
    .replace(/\s*\(CH\s*[\d.]+\)/gi, '')
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const formatarUnidadeCurricular = (uc: string | undefined | null): string => {
  if (!uc) return 'Atividade SENAI';

  let raw = repairMojibake(String(uc).trim());
  
  // 1. Remover padrão de CH imediatamente
  raw = raw
    .replace(/\s*\(\s*CH\s*:[^)]*\)/gi, '')
    .replace(/\s*\(CH\s*:[^)]*\)/gi, '')
    .replace(/\s*CH\s*:\s*[\d.]+/gi, '')
    .replace(/\s*\(CH\s*[\d.]+\)/gi, '')
    .trim();

  if (!raw) return 'Atividade SENAI';

  const normalized = normalizeTextForMatching(raw);

  // 2. Executar as regras de reconhecimento inteligente
  for (const rule of RULES) {
    if (rule.checker(normalized, raw)) {
      return rule.canonical;
    }
  }

  // 3. Tentar correspondência direta com a lista canônica
  for (const canonical of CANONICAL_UNIDADES_CURRICULARES) {
    const normCanonical = normalizeTextForMatching(canonical);
    if (normalized === normCanonical) {
      return canonical;
    }
  }

  // 4. Se não casou por palavras-chave, reparar mojibake e retornar
  let cleanFallback = repairMojibake(raw)
    .replace(/[\uFFFD]/g, '')
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanFallback.toUpperCase() || 'Atividade SENAI';
};

