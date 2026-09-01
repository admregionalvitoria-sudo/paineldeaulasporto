/**
 * Utilitário de alta precisão para leitura de CSVs e correção de encodings e mojibake (Windows-1252 / ISO-8859-1 x UTF-8).
 */

const MOJIBAKE_MAP: [RegExp, string][] = [
  [/Ã‡/g, 'Ç'],
  [/Ã§/g, 'ç'],
  [/Ãƒ/g, 'Ã'],
  [/Ã£/g, 'ã'],
  [/Ã¡/g, 'á'],
  [/Ã‰/g, 'É'],
  [/Ã©/g, 'é'],
  [/Ã­/g, 'í'],
  [/ÃÍ/g, 'Í'],
  [/Ã“/g, 'Ó'],
  [/Ã³/g, 'ó'],
  [/Ã•/g, 'Õ'],
  [/Ãµ/g, 'õ'],
  [/Ãš/g, 'Ú'],
  [/Ãº/g, 'ú'],
  [/Ã‚/g, 'Â'],
  [/Ã¢/g, 'â'],
  [/Ãª/g, 'ê'],
  [/Ã´/g, 'ô'],
  [/ÃÀ/g, 'À'],
  [/Ãà/g, 'à'],
  [/Âº/g, 'º'],
  [/Â°/g, '°'],
  [/Âª/g, 'ª'],
  [/Ã(?![\u0080-\u00BF])/g, 'Á'],
  [/\uFFFD/g, '']
];

/**
 * Corrige sequências de caracteres mojibake provenientes de UTF-8 lido como Latin-1
 */
export function repairMojibake(text: string): string {
  if (!text) return '';
  let cleaned = text.normalize('NFC');
  for (const [pattern, replacement] of MOJIBAKE_MAP) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned;
}

/**
 * Detecta se uma string contém padrões típicos de mojibake
 */
export function containsMojibake(text: string): boolean {
  if (!text) return false;
  return /Ã[‡§ƒ£Á¡‰©Íí“³•µŠºÂ°ª]|Â[º°ª]|\uFFFD/.test(text);
}

/**
 * Leitura resiliente de arquivos como texto, aplicando detecção automática de UTF-8 e Windows-1252
 */
export async function readTextFileResilient(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Verificação de UTF-8 BOM (EF BB BF)
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    const utf8Decoder = new TextDecoder('utf-8');
    return utf8Decoder.decode(bytes.slice(3)).normalize('NFC');
  }

  // Tentar decodificar com UTF-8 estrito
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    const decodedUtf8 = utf8Decoder.decode(bytes).normalize('NFC');

    // Se o texto resultante contiver mojibake suspeito, tenta Windows-1252
    if (containsMojibake(decodedUtf8)) {
      const win1252Decoder = new TextDecoder('windows-1252');
      const decodedWin = win1252Decoder.decode(bytes).normalize('NFC');
      if (!containsMojibake(decodedWin)) {
        return decodedWin;
      }
      return repairMojibake(decodedUtf8);
    }

    return decodedUtf8;
  } catch (err) {
    // Fallback para Windows-1252 / ISO-8859-1
    const win1252Decoder = new TextDecoder('windows-1252');
    const decodedWin = win1252Decoder.decode(bytes).normalize('NFC');
    return repairMojibake(decodedWin);
  }
}
